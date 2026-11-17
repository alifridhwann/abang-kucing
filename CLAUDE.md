# CLAUDE.md

## Edit video (TikTok, Instagram Reels, YouTube Shorts)

Format lalai: menegak 9:16, 1080×1920, 30fps, H.264 + AAC, audio dinormalkan ke -14 LUFS.

### Peraturan wajib: storyboard dahulu, render kemudian

Setiap kali pengguna minta edit video:

1. **Jangan render apa-apa dulu.** Semak footage (durasi, resolusi, transkrip jika ada), kemudian
   **tanya pengguna** sama ada mereka mahu storyboard disediakan.
2. **Sediakan storyboard** dan tunjukkan kepada pengguna. Storyboard mesti ada, untuk setiap babak:
   - nombor babak dan julat masa (contoh `00:00–00:03`)
   - klip sumber dan titik potong (in/out)
   - visual: framing/crop 9:16, B-roll, overlay atau animasi
   - teks di skrin / sari kata
   - audio: dialog, muzik, SFX
   - peralihan (transition)
   Sertakan juga anggaran jumlah durasi, hook pada 3 saat pertama, dan CTA di akhir.
3. **Tunggu pengguna luluskan storyboard** secara jelas (contoh "ok", "teruskan", "render").
   Kalau pengguna minta perubahan, kemas kini storyboard dan tanya semula.
4. Hanya selepas storyboard diluluskan, barulah render video.

Peraturan ini terpakai pada semua tool: video-use, HyperFrames, Remotion dan skrip FFmpeg biasa.
Ia juga terpakai pada render semula selepas perubahan besar (struktur babak, urutan, durasi).
Pembetulan kecil yang pengguna minta sendiri (contoh ejaan sari kata) boleh dirender terus.
