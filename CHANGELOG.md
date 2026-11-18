# Changelog / Log Perubahan – Abang Kucing

Dokumen ini untuk rekod perubahan yang dibuat pada sistem (untuk dimaklumkan kepada owner).

## Cara Update (setiap kali ada edit)
- Tambah entry terbaru di **paling atas** bawah seksyen “Unreleased” atau buat tarikh baru.
- Format ringkas: **tarikh**, **ringkasan**, **fail terlibat**, **nota penting**.

---

## Unreleased

### New: Ejen WhatsApp untuk tempahan grooming (draf)
- **Apa**: Workflow Kapso dengan pembantu AI Claude yang jawab soalan grooming dalam BM, kumpul butiran tempahan dan serahkan ringkasan kepada staf untuk sahkan slot. Status draf; trigger pada nombor Sandbox sahaja (tidak aktif).
- **Fail**: `workflows/grooming-booking-agent/` (`system-prompt.md`, `build.mjs`, `workflow.json`, `definition.json`, `README.md`), `.gitignore`
- **Nota**: Belum dipasang ke Kapso: perlu akses tulis workflow. Data ejen hanya dari chat WhatsApp dan jawapan owner; data website tidak digunakan (keputusan owner).

### Major Enhancement: Addon Pricing by Cat Type
- **Apa**: Add-on sekarang ada harga berbeza ikut jenis kucing:
  - **Short Hair / Long Hair**: Mandian kutu/fungus RM15, Ubat cacing RM15, Content RM50, Ubat kutu RM60
  - **Kitten**: Longhair RM10, Mandian kutu/fungus RM10, Ubat cacing RM10, Ubat kutu RM40, Content RM50
- **Implementasi**: Add-on sekarang diletakkan dalam setiap cat row, bukan global
- **Fail**: `booking.html`, `js/booking.js`, `css/style.css`

### Major Enhancement: Date Booking Restrictions
- **Apa**: Tarikh tempahan sekarang ada sekatan:
  - Minimum: Esok (tak boleh book hari ini atau lepas)
  - Maximum: 2 bulan dari hari ini
  - Admin boleh block hari tertentu (cuti, off day)
- **Fail**: `js/booking.js`

### Major Enhancement: Admin Blocked Days System
- **Apa**: Admin boleh block hari tertentu supaya customer tak boleh book
- **UI**: Tab baru "Tetapan" dalam admin panel dengan calendar view
- **Fail**: `admin.html`, `js/admin.js`, `css/style.css`
- **Database**: Table baru `blocked_days`

### Enhancement: Hotel Disclaimer
- **Apa**: Tambah disclaimer dalam Cat Hotel:
  - "Pasir kucing sahaja disediakan"
  - "Makanan tidak disediakan untuk mengelakkan masalah cirit birit akibat perubahan makanan mendadak"
- **Fail**: `booking.html`, `css/style.css`

### Major Enhancement: New Booking Status System
- **Apa**: Status booking sekarang ada 4 jenis:
  - `pending` - Menunggu
  - `in_progress` - Sedang Diproses (grooming dalam proses)
  - `completed` - Selesai
  - `cancelled` - Dibatalkan
- **Flow**: pending → in_progress → completed
- **Fail**: `admin.html`, `js/admin.js`, `customer.html`, `css/style.css`
- **Database**: Column `completed_at` dalam `bookings`

### Major Enhancement: Loyalty Points with Expiry
- **Apa**: Sistem loyalty points sekarang:
  - Points diberikan bila booking selesai (RM1 = 1 point)
  - Points expired 3 bulan selepas booking completed
  - UI tunjuk sejarah points dengan tarikh expired
  - Warning kalau ada points nak expired dalam 30 hari
- **Fail**: `loyalty.html`, `js/admin.js`
- **Database**: Table baru `loyalty_transactions` (ganti `loyalty_points`)

### Enhancement: Admin Manual Add Points
- **Apa**: Admin boleh tambah points manual kepada customer
- **UI**: Button "Points" dalam senarai pelanggan, modal untuk masukkan jumlah
- **Manual points tidak expired**
- **Fail**: `admin.html`, `js/admin.js`, `css/style.css`

### Major Enhancement: Pickup Distance-Based Pricing
- **Apa**: Kos pickup dikira automatik berdasarkan jarak:
  - Base: RM10 untuk 8km pertama
  - Tambahan: RM1.20 per km selepas 8km
  - Contoh: 12km = RM10 + (4 × RM1.20) = RM14.80
- **Implementasi**: Haversine formula untuk kira jarak
- **Admin**: Set lokasi kedai dalam Settings
- **Fail**: `booking.html`, `js/booking.js`, `admin.html`, `js/admin.js`, `css/style.css`
- **Database**: Table `settings` dengan key `base_location`

### Database Schema Update
- **Tables baru**:
  - `blocked_days` - Untuk simpan hari yang di-block
  - `settings` - Untuk simpan settings (base location, etc)
  - `loyalty_transactions` - Untuk track points per booking dengan expiry
- **Columns baru**:
  - `bookings.completed_at` - Track bila booking selesai
- **RLS Policies**: Semua table baru ada proper RLS
- **SQL File**: `database/schema_update.sql`

---

- ### Redesign: Customer Dashboard (Simple & Clean)
  - **Apa**: Dashboard customer diubah kepada design yang lebih simple dan authentic:
    - Header ringkas dengan brand + greeting + logout
    - Stats box untuk Tempahan & Points
    - Button CTA utama yang jelas
    - Booking list dalam format row (bukan fancy card)
    - Bottom nav yang minimal
  - **Kenapa**: Design sebelum terlalu "AI generated" — sekarang lebih natural untuk bisnes lokal
  - **Fail**: `customer.html`, `css/style.css`

- ### Enhancement: Booking UI (mobile card + sticky total)
  - **Apa**: `booking` guna layout mobile-first (cards, pills untuk jenis, segmented control, sticky bottom total + continue).
  - **Fail**: `booking.html`, `js/booking.js`, `css/style.css`

- ### Adjustment: Add-on tanpa harga (Booking)
  - **Apa**: Add-on dalam grooming jadi pilihan sahaja (tiada harga dipaparkan/ditambah dalam kiraan).
  - **Fail**: `booking.html`, `js/booking.js`

- ### Enhancement: Date picker lebih cantik (Booking)
  - **Apa**: Tarikh tempahan guna calendar popup custom (lebih premium + konsisten).
  - **Fail**: `booking.html`, `js/booking.js`, `css/style.css`

- ### Enhancement: Dashboard customer UI konsisten
  - **Apa**: `customer` guna topbar + card style yang sama dengan booking (lebih kemas, bahasa konsisten).
  - **Fail**: `customer.html`, `css/style.css`

- ### Fix/Hardening: Forgot Password (Supabase) lebih stabil
  - **Apa**: `forgot-password` tidak lagi bergantung pada “global variable” dari `id` HTML (lebih robust).
  - **Fail**: `js/auth-forget.js`

- ### Fix/Hardening: Reset Password (Supabase) betul-betul tukar password
  - **Apa**: `reset-password` kini buat `updateUser({ password })`, papar error yang jelas, dan disable form bila session recovery tiada.
  - **Fail**: `reset-password.html`, `js/auth-reset.js`

- ### Fix/Hardening: Profile page konsisten dengan Supabase (elak crash)
  - **Apa**: `profile.html` sekarang guna Supabase + auth guard, `profile.js` baca/tulis table `profiles` (fallback kalau kolum `phone` tiada).
  - **Fail**: `profile.html`, `js/profile.js`

---

## 2026-01-28
### Enhancement: URL tanpa `.html` (clean URL)
- **Apa**: Page boleh diakses tanpa extension (contoh `/login`, `/booking`) dan jika user buka `*.html` sistem auto-redirect buang extension.
- **Kenapa**: Nampak lebih kemas/profesional untuk customer & owner.
- **Fail**: `.htaccess`, serta kemas kini link/redirect dalam beberapa fail HTML/JS.
- **Nota**: Ini bergantung pada **Apache + mod_rewrite** (Laragon Apache). Jika guna Nginx, perlu rewrite rules Nginx.

### Enhancement: Flow register simpan profil customer
- **Apa**: Register tambah field **Nama Pendek** + **Tempat Tinggal** (untuk pickup).
- **Apa**: Data disimpan dalam metadata Supabase dan (jika session wujud) disimpan ke table `profiles`.
- **Fail**: `register.html`, `js/auth-register.js`, `js/auth-login.js`
- **Nota DB**: Table `profiles` perlu ada kolum `name`, `address` (atau update schema).

### Enhancement: Booking Grooming lebih praktikal
- **Apa**: Booking Grooming boleh:
  - pilih **cara kedatangan**: walk-in / pickup (pickup auto guna profil register)
  - **tambah kucing (>1)**
  - pilih **jenis**: kitten (RM25), short hair (RM35), long hair (RM45)
  - pilih **addon** (harga per kucing)
  - auto kira **total** dan papar **butiran**.
- **Data simpanan**: disimpan dalam `bookings.details` (cth: `arrival_method`, `pickup_*`, `cats[]`, `addons[]`).
- **Fail**: `booking.html`, `js/booking.js`
- **Nota DB**: Table `bookings` perlu ada kolum `details` (json/jsonb) jika belum ada.

### Fix: Script forgot-password guna fail yang betul
- **Apa**: Betulkan include script supaya `forgot-password.html` load `js/auth-forget.js`.
- **Fail**: `forgot-password.html`

### Fix: Buang kod “import …” yang tertampal selepas `</html>`
- **Apa**: Ada beberapa admin pages mengandungi teks `import { supabaseClient } ...` selepas penutup HTML (boleh muncul di UI).
- **Fail**: `admin.html`, `admin-dashboard.html`, `admin-bookings.html`, `admin-loyalty.html`

