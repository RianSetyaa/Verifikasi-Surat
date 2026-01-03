# PENTING: Perbaikan Error Attendance

## ❌ Error yang Terjadi
```
400 Error pada attendance_logs insert
Column 'attendance_date' dan 'notes' tidak ditemukan
```

## ✅ Solusi

**WAJIB jalankan migration SQL terlebih dahulu!**

### Langkah 1: Jalankan Migration
1. Buka [Supabase SQL Editor](https://app.supabase.com)
2. Copy-paste **SELURUH ISI** file `database/attendance-approval-migration.sql`
3. Click **"Run"**

File ini akan:
- ✅ Menambahkan kolom `attendance_date` ke `attendance_logs`
- ✅ Rename kolom `reason` menjadi `notes` 
- ✅ Menambahkan kolom approval (`approval_status`, `rejection_reason`, dll)
- ✅ Menambahkan status `alpha`
- ✅ Membuat tabel `attendance_schedule`

### Langkah 2: Refresh Page
Setelah migration berhasil, refresh halaman attendance dan coba lagi.

## Penjelasan

Schema asli `attendance_logs` hanya punya:
- `member_id`
- `status`
- `reason`  
- `proof_url`

Tapi kode baru butuh:
- `member_id`
- `attendance_date` ← **BARU**
- `status`
- `notes` ← **RENAMED from reason**
- `proof_url`
- `approval_status` ← **BARU**

Migration SQL sudah saya update untuk handle rename `reason` → `notes` dengan aman.

## Cek Migration Berhasil

Jalankan di SQL Editor:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'attendance_logs';
```

Harusnya muncul kolom:
- attendance_date (date)
- notes (text)
- approval_status (text)
- rejection_reason (text)
- reviewed_by (uuid)
- reviewed_at (timestamp)
