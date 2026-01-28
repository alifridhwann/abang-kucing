$ErrorActionPreference = 'Stop'

$root = 'c:\laragon\www\abangkucing'
$src = 'C:\Users\01\.cursor\projects\c-laragon-www-abangkucing\assets\c__Users_01_AppData_Roaming_Cursor_User_workspaceStorage_0d314593784316bbb95ce1c35001941e_images_IMG_2975-e7da73d6-56cf-4e63-ae93-afaf082cd51a.png'
$outDir = Join-Path $root 'icons'

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Add-Type -AssemblyName System.Drawing

function Resize-Png {
  param(
    [Parameter(Mandatory=$true)][int]$Size,
    [Parameter(Mandatory=$true)][string]$Name
  )

  $img = [System.Drawing.Image]::FromFile($src)
  try {
    $bmp = New-Object System.Drawing.Bitmap $Size, $Size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Match site background (warm off-white)
    $g.Clear([System.Drawing.Color]::FromArgb(255, 255, 253, 245))
    $g.DrawImage($img, 0, 0, $Size, $Size)
    $g.Dispose()

    $dst = Join-Path $outDir $Name
    $bmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
  }
  finally {
    $img.Dispose()
  }
}

Resize-Png -Size 192 -Name 'icon-192.png'
Resize-Png -Size 512 -Name 'icon-512.png'

function Resize-PngPadded {
  param(
    [Parameter(Mandatory=$true)][int]$Size,
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$true)][double]$Scale
  )

  $img = [System.Drawing.Image]::FromFile($src)
  try {
    $bmp = New-Object System.Drawing.Bitmap $Size, $Size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Match site background (warm off-white)
    $g.Clear([System.Drawing.Color]::FromArgb(255, 255, 253, 245))

    $drawSize = [int]([Math]::Round($Size * $Scale))
    if ($drawSize -lt 1) { $drawSize = $Size }
    $x = [int](($Size - $drawSize) / 2)
    $y = [int](($Size - $drawSize) / 2)
    $g.DrawImage($img, $x, $y, $drawSize, $drawSize)
    $g.Dispose()

    $dst = Join-Path $outDir $Name
    $bmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
  }
  finally {
    $img.Dispose()
  }
}

# Maskable icons should have safe padding (centered logo)
Resize-PngPadded -Size 192 -Name 'icon-192-maskable.png' -Scale 0.72
Resize-PngPadded -Size 512 -Name 'icon-512-maskable.png' -Scale 0.72

function Write-IcoFromBitmap {
  param(
    [Parameter(Mandatory=$true)][System.Drawing.Bitmap]$Bitmap,
    [Parameter(Mandatory=$true)][string]$OutPath
  )

  $ms = New-Object System.IO.MemoryStream
  try {
    $Bitmap.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBytes = $ms.ToArray()

    $w = $Bitmap.Width
    $h = $Bitmap.Height
    $wByte = if ($w -ge 256) { 0 } else { [byte]$w }
    $hByte = if ($h -ge 256) { 0 } else { [byte]$h }

    $fs = [System.IO.File]::Open($OutPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
    try {
      $bw = New-Object System.IO.BinaryWriter($fs)

      # ICONDIR
      $bw.Write([UInt16]0)       # reserved
      $bw.Write([UInt16]1)       # type (1 = icon)
      $bw.Write([UInt16]1)       # count

      # ICONDIRENTRY (PNG inside ICO is supported by modern browsers)
      $bw.Write($wByte)          # width
      $bw.Write($hByte)          # height
      $bw.Write([byte]0)         # color count
      $bw.Write([byte]0)         # reserved
      $bw.Write([UInt16]1)       # planes
      $bw.Write([UInt16]32)      # bit count
      $bw.Write([UInt32]$pngBytes.Length) # bytes in resource
      $bw.Write([UInt32]22)      # image offset (6 + 16)

      # image data
      $bw.Write($pngBytes)
      $bw.Flush()
      $bw.Dispose()
    }
    finally {
      $fs.Dispose()
    }
  }
  finally {
    $ms.Dispose()
  }
}

# favicon.ico (64x64) with extra padding so it doesn't look cramped
$faviconBmp = New-Object System.Drawing.Bitmap 64, 64
$g2 = [System.Drawing.Graphics]::FromImage($faviconBmp)
$g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g2.Clear([System.Drawing.Color]::FromArgb(255, 255, 253, 245))
$img2 = [System.Drawing.Image]::FromFile($src)
try {
  $padScale = 0.78
  $drawSize2 = [int]([Math]::Round(64 * $padScale))
  $x2 = [int]((64 - $drawSize2) / 2)
  $y2 = [int]((64 - $drawSize2) / 2)
  $g2.DrawImage($img2, $x2, $y2, $drawSize2, $drawSize2)
}
finally {
  $img2.Dispose()
  $g2.Dispose()
}
$faviconPath = Join-Path $root 'favicon.ico'
Write-IcoFromBitmap -Bitmap $faviconBmp -OutPath $faviconPath
$faviconBmp.Dispose()

Write-Output 'ok'

