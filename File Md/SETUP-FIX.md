# 🔧 Petunjuk Setup - Perbaikan Error

Anda mendapat error 403/406 karena SQL schema belum dijalankan di Supabase. Ikuti langkah berikut:

## ✅ Langkah 1: Jalankan SQL Schema di Supabase

1. **Buka Supabase Dashboard**
   - Login ke [https://app.supabase.com/](https://app.supabase.com/)
   - Pilih project Anda (`fwtcvytfkmwzgkarcwxw`)

2. **Buka SQL Editor**
   - Di sidebar kiri, klik **SQL Editor**
   - Klik **New Query**

3. **Copy & Paste Schema**
   - Buka file: `C:\Verifikasi Surat\database\supabase-schema.sql`
   - Select semua (Ctrl+A), Copy (Ctrl+C)
   - Paste di SQL Editor Supabase
   - Klik **Run** atau tekan F5

4. **Verifikasi**
   - Setelah selesai, klik **Table Editor** di sidebar
   - Pastikan tabel berikut muncul:
     - ✅ `users`
     - ✅ `documents`  
     - ✅ `document_revisions`

## ✅ Langkah 2: File yang Sudah Diperbaiki

Saya sudah memperbaiki 2 file:

### 1. `database/supabase-schema.sql`
**Perubahan**: Ditambahkan policy untuk INSERT user
```sql
CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### 2. `js/auth.js`  
**Perubahan**: 
- Fixed `loadUserProfile()` untuk handle error 406
- Fixed `signUp()` untuk create user profile dengan benar

### 3. `js/config.js`
**Perubahan**: Fixed Google Drive folder ID (sekarang sudah benar)

## ✅ Langkah 3: Testing

Setelah SQL schema dijalankan:

1. **Refresh Browser** (Ctrl+F5)

2. **Test Registrasi**
   - Klik "Daftar Sekarang"
   - Isi form:
     - Nama: Nama Anda
     - Email: email@example.com
     - Password: minimal 6 karakter
     - Role: Anggota atau Sekretaris
   - Klik "Daftar"

3. **Cek Email (Opsional)**
   - Jika Supabase email confirmation enabled, cek inbox
   - Klik link verifikasi

4. **Test Login**
   - Gunakan email & password yang tadi
   - Klik "Masuk"
   - Harus redirect ke dashboard sesuai role

## ❌ Jika Masih Error

### Error: "User already registered"
**Solusi**: Email sudah terdaftar. Gunakan email lain atau login saja.

### Error: "Email confirmation required"
**Solusi**: Cek email untuk link verifikasi, atau disable email confirmation:
- Di Supabase Dashboard → **Authentication** → **Settings**
- Scroll ke "Email Auth"
- Disable "Confirm email"

### Error: Masih 403/406
**Solusi**: 
1. Pastikan SQL schema sudah dijalankan
2. Cek di Table Editor apakah tabel sudah ada
3. Pastikan `config.js` sudah benar (Supabase URL & key)
4. Clear browser cache & cookies
5. Try incognito/private mode

### Error: Google Drive tidak berfungsi
**Solusi**: 
- Setup Google Drive API belum selesai
- Untuk sementara, sistem tetap bisa jalan tanpa Google Drive
- File URL akan null, tapi rest workflow tetap berfungsi
- Ikuti `docs/google-drive-setup.md` untuk setup lengkap

## 📝 Checklist

- [ ] SQL schema sudah dijalankan di Supabase
- [ ] Tabel `users`, `documents`, `document_revisions` sudah ada
- [ ] Browser sudah di-refresh
- [ ] Test registrasi berhasil
- [ ] Test login berhasil
- [ ] Dashboard muncul sesuai role

## 🎯 Next Steps

Setelah semua berfungsi:

1. **Setup Google Drive** (opsional tapi recommended)
   - Ikuti panduan di `docs/google-drive-setup.md`
   - Update `js/config.js` jika ada perubahan credentials

2. **Test Complete Workflow**
   - Register 2 user: 1 Anggota + 1 Sekretaris
   - Login sebagai Anggota → Upload dokumen
   - Login sebagai Sekretaris → Review & validasi
   - Check nomor surat ter-generate

3. **Deploy ke Production** (opsional)
   - Host di Netlify, Vercel, atau GitHub Pages
   - Update Google OAuth authorized origins
   - Setup environment variables untuk credentials

---

**Jika masih ada masalah, beri tahu saya error message lengkapnya!** 🚀
