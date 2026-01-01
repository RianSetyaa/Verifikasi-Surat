# Panduan Setup Google Drive API

Panduan langkah demi langkah untuk mengintegrasikan Google Drive API dengan Sistem Manajemen Surat.

## Prasyarat
- Akun Google
- Google Cloud Project (akan dibuat)

## Langkah-langkah Setup

### 1. Membuat Google Cloud Project

1. Kunjungi [Google Cloud Console](https://console.cloud.google.com/)
2. Klik **Select a project** di bagian atas
3. Klik **NEW PROJECT**
4. Masukkan nama project (contoh: "Sistem Manajemen Surat")
5. Klik **CREATE**

### 2. Mengaktifkan Google Drive API

1. Di Google Cloud Console, pastikan project Anda sudah dipilih
2. Buka **Navigation Menu** (☰) → **APIs & Services** → **Library**
3. Cari "Google Drive API"
4. Klik **Google Drive API**
5. Klik **ENABLE**

### 3. Membuat API Key

1. Buka **Navigation Menu** → **APIs & Services** → **Credentials**
2. Klik **CREATE CREDENTIALS** → **API key**
3. Copy API key yang muncul
4. (Opsional) Klik **RESTRICT KEY** untuk mengamankan API key:
   - Beri nama key
   - Di **API restrictions**, pilih **Restrict key**
   - Centang **Google Drive API**
   - Klik **SAVE**

### 4. Membuat OAuth 2.0 Client ID

1. Masih di halaman **Credentials**
2. Klik **CREATE CREDENTIALS** → **OAuth client ID**
3. Jika diminta, konfigurasikan OAuth consent screen:
   - Pilih **External** (untuk testing) atau **Internal** (untuk organisasi)
   - Isi **App name**, **User support email**, dan **Developer contact information**
   - Klik **SAVE AND CONTINUE**
   - Di **Scopes**, klik **ADD OR REMOVE SCOPES**
   - Cari dan tambahkan scope berikut:
     - `https://www.googleapis.com/auth/drive.file`
   - Klik **SAVE AND CONTINUE**
   - (Untuk External) Tambahkan test users dengan email Anda
   - Klik **SAVE AND CONTINUE**
4. Kembali ke **Credentials** → **CREATE CREDENTIALS** → **OAuth client ID**
5. Pilih **Application type**: **Web application**
6. Masukkan nama (contoh: "Web Client")
7. Di **Authorized JavaScript origins**, tambahkan:
   ```
   http://localhost:8080
   http://127.0.0.1:8080
   ```
   (Sesuaikan dengan URL development server Anda)
8. Di **Authorized redirect URIs**, tambahkan:
   ```
   http://localhost:8080
   http://127.0.0.1:8080
   ```
9. Klik **CREATE**
10. Copy **Client ID** yang muncul

### 5. Membuat Folder Google Drive

1. Buka [Google Drive](https://drive.google.com/)
2. Klik **New** → **Folder**
3. Beri nama folder (contoh: "Dokumen Surat")
4. Klik folder yang baru dibuat
5. Copy **Folder ID** dari URL browser:
   ```
   https://drive.google.com/drive/folders/FOLDER_ID_DI_SINI
   ```

### 6. Konfigurasi di Aplikasi

1. Buka file `js/config.js`
2. Ganti placeholder dengan credentials Anda:
   ```javascript
   googleDrive: {
     clientId: 'YOUR_GOOGLE_CLIENT_ID', // dari langkah 4
     apiKey: 'YOUR_GOOGLE_API_KEY',     // dari langkah 3  
     folderId: 'YOUR_GOOGLE_DRIVE_FOLDER_ID', // dari langkah 5
     scopes: 'https://www.googleapis.com/auth/drive.file'
   }
   ```

## Testing

1. Jalankan aplikasi dengan local server
2. Login ke aplikasi
3. Upload dokumen sebagai Anggota
4. Sistem akan meminta izin Google Drive pertama kali
5. Klik **Allow** untuk memberikan izin
6. File akan terupload ke folder Google Drive yang sudah ditentukan

## Troubleshooting

### Error: "Access blocked: This app's request is invalid"
**Solusi**: Pastikan Anda sudah menambahkan Authorized JavaScript origins dan Authorized redirect URIs di OAuth consent screen.

### Error: "The API key doesn't match the expected domain"
**Solusi**: Tambahkan domain/URL Anda di API key restrictions di Google Cloud Console.

### File tidak muncul di Google Drive
**Solusi**: 
- Periksa Folder ID sudah benar
- Pastikan folder memiliki permission yang tepat
- Periksa Console browser untuk error

### Error: "User not authorized"
**Solusi**: Untuk OAuth consent screen External yang masih dalam testing, tambahkan email user sebagai test user di Google Cloud Console.

## Keamanan

> **PENTING**: Jangan commit credentials ke public repository!

1. Simpan credentials di environment variables atau file terpisah (.env)
2. Tambahkan `config.js` ke `.gitignore` jika menyimpan credentials langsung
3. Gunakan API key restrictions untuk membatasi penggunaan
4. Rotate credentials secara berkala
5. Untuk production, gunakan OAuth consent screen Internal atau verifikasi aplikasi

## Referensi

- [Google Drive API Documentation](https://developers.google.com/drive/api/guides/about-sdk)
- [OAuth 2.0 for Client-side Web Applications](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)
- [Google API JavaScript Client](https://github.com/google/google-api-javascript-client)
