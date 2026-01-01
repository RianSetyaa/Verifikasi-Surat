# Sistem Manajemen Surat

Platform digital untuk pengelolaan surat dan dokumen administratif dengan fitur upload, review, dan validasi.

## 🎯 Fitur Utama

### Untuk Anggota
- ✅ Upload dokumen (Surat Masuk, Surat Keluar, Notulensi)
- ✅ Tracking status dokumen real-time
- ✅ Notifikasi revisi dengan catatan lengkap
- ✅ Lihat nomor surat yang sudah tervalidasi
- ✅ Upload otomatis ke Google Drive

### Untuk Sekretaris
- ✅ Dashboard statistik dokumen
- ✅ Review dan validasi dokumen
- ✅ Kirim catatan revisi ke anggota
- ✅ Generate nomor surat otomatis
- ✅ Filter dan pencarian dokumen
- ✅ Update real-time

## 🚀 Teknologi

- **Frontend**: HTML, CSS (Modern Design System), Vanilla JavaScript
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Storage**: Google Drive API
- **Authentication**: Supabase Auth dengan Role-Based Access Control

## 📋 Prasyarat

- Akun [Supabase](https://supabase.com/) (gratis)
- Akun Google untuk Google Drive API
- Web server lokal (bisa menggunakan `npx serve` atau sejenisnya)
- Browser modern (Chrome, Firefox, Edge, Safari)

## 🛠️ Setup & Instalasi

### 1. Clone/Download Project

```bash
cd "C:\Verifikasi Surat"
```

### 2. Setup Supabase

#### A. Buat Project Supabase
1. Kunjungi [https://app.supabase.com/](https://app.supabase.com/)
2. Klik **New Project**
3. Isi detail project
4. Tunggu hingga setup selesai

#### B. Jalankan Database Schema
1. Buka **SQL Editor** di Supabase Dashboard
2. Copy seluruh isi file `database/supabase-schema.sql`
3. Paste dan klik **RUN**
4. Pastikan semua tables dan policies tercipta

#### C. Dapatkan API Credentials
1. Buka **Project Settings** → **API**
2. Copy **Project URL** dan **anon/public key**

### 3. Setup Google Drive API

Ikuti panduan lengkap di: **[docs/google-drive-setup.md](docs/google-drive-setup.md)**

Ringkasan:
1. Buat Google Cloud Project
2. Enable Google Drive API
3. Buat API Key dan OAuth 2.0 Client ID
4. Buat folder di Google Drive
5. Copy Folder ID

### 4. Konfigurasi Aplikasi

Edit file `js/config.js`:

```javascript
const CONFIG = {
  supabase: {
    url: 'https://xxxxx.supabase.co',  // Ganti dengan URL Supabase Anda
    anonKey: 'eyJxxx...'                // Ganti dengan Anon Key Anda
  },
  googleDrive: {
    clientId: 'xxxxx.apps.googleusercontent.com',  // OAuth Client ID
    apiKey: 'AIzaXXXX',                             // API Key
    folderId: 'xxxxx',                              // Google Drive Folder ID
    scopes: 'https://www.googleapis.com/auth/drive.file'
  }
};
```

### 5. Jalankan Aplikasi

```bash
# Menggunakan npx serve (recommended)
npx -y serve .

# Atau menggunakan Python
python -m http.server 8080

# Atau menggunakan PHP
php -S localhost:8080
```

Buka browser dan akses: `http://localhost:8080`

## 👥 Cara Menggunakan

### Registrasi User

1. Buka aplikasi
2. Klik **Daftar Sekarang**
3. Isi form registrasi:
   - Nama lengkap
   - Email
   - Password (min. 6 karakter)
   - Role (Anggota/Sekretaris)
4. Cek email untuk verifikasi (jika diaktifkan di Supabase)

### Workflow Anggota

1. **Login** dengan akun Anggota
2. **Upload Dokumen**:
   - Isi judul dan deskripsi
   - Pilih jenis dokumen
   - Drag & drop atau pilih file
   - Klik "Upload Dokumen"
3. **Tracking Status**:
   - Lihat tabel dokumen Anda
   - Status: Menunggu Review / Perlu Revisi / Tervalidasi
4. **Jika Revisi**:
   - Klik tombol revisi (✏️)
   - Baca catatan dari Sekretaris
   - Perbaiki dan upload ulang

### Workflow Sekretaris

1. **Login** dengan akun Sekretaris
2. **Review Dokumen**:
   - Lihat dokumen pending di dashboard
   - Klik tombol review (📝)
   - Buka dan periksa file
3. **Aksi Review**:
   - **Validasi**: Generate nomor surat otomatis
   - **Minta Revisi**: Kirim catatan perbaikan ke anggota
4. **Filter & Pencarian**:
   - Filter berdasarkan status
   - Filter berdasarkan jenis dokumen

## 📁 Struktur Project

```
C:\Verifikasi Surat\
├── database/
│   └── supabase-schema.sql      # Database schema dan RLS policies
├── docs/
│   └── google-drive-setup.md    # Panduan setup Google Drive
├── js/
│   ├── auth.js                  # Authentication management
│   ├── config.js                # Konfigurasi API credentials
│   ├── google-drive.js          # Google Drive integration
│   ├── member-dashboard.js      # Member dashboard logic
│   ├── secretary-dashboard.js   # Secretary dashboard logic
│   └── utils.js                 # Utility functions
├── styles/
│   └── main.css                 # Main stylesheet
├── index.html                   # Login/Register page
├── member-dashboard.html        # Member dashboard
├── secretary-dashboard.html     # Secretary dashboard
└── README.md                    # This file
```

## 🔒 Keamanan

- **Row Level Security (RLS)**: Setiap user hanya bisa akses data mereka
- **Role-Based Access**: Anggota dan Sekretaris memiliki permission berbeda
- **Supabase Auth**: Authentication dengan JWT tokens
- **Google OAuth**: Secure file upload dengan user consent

## 🎨 Design System

- Modern glassmorphism design
- Responsive untuk semua device
- Smooth animations dan transitions
- Professional color palette
- Google Fonts (Inter)

## 🔧 Troubleshooting

### Login Gagal
- Periksa credentials di `config.js`
- Pastikan user sudah terdaftar di Supabase Auth dan table `users`
- Cek browser console untuk error

### Upload Gagal
- Periksa Google Drive credentials
- Pastikan sudah memberikan izin saat pertama kali
- Periksa ukuran file (max 10MB)

### Real-time Update Tidak Jalan
- Pastikan Realtime diaktifkan di Supabase Dashboard
- Periksa RLS policies sudah benar
- Refresh halaman

## 📝 Catatan Penting

> **PENTING**: File `js/config.js` berisi credentials rahasia. Jangan commit ke public repository!

Untuk production:
1. Gunakan environment variables
2. Setup proper CORS dan domain restrictions
3. Enable email verification di Supabase
4. Tambahkan rate limiting
5. Setup backup database

## 🤝 Support

Jika menemui kendala:
1. Periksa browser console untuk error messages
2. Lihat dokumentasi Supabase dan Google Drive API
3. Pastikan semua setup steps sudah diikuti dengan benar

## 📄 License

This project is for internal use.

---

Dibuat dengan ❤️ untuk digitalisasi administrasi yang lebih baik
