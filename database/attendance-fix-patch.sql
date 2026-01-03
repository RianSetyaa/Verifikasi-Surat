-- Quick Fix untuk Attendance Error
-- Jalankan script ini SAJA di Supabase SQL Editor

-- 1. Tambahkan kolom attendance_date
ALTER TABLE attendance_logs 
  ADD COLUMN IF NOT EXISTS attendance_date DATE DEFAULT CURRENT_DATE;

-- 2. Rename kolom reason menjadi notes (untuk konsistensi)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='attendance_logs' AND column_name='reason') THEN
    ALTER TABLE attendance_logs RENAME COLUMN reason TO notes;
  END IF;
END $$;

-- 3. Tambahkan index untuk attendance_date
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_logs(attendance_date);

-- Selesai! Refresh halaman attendance dan coba submit lagi.
