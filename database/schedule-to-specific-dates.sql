-- Update Attendance Schedule: Dari Hari Berulang ke Tanggal Spesifik
-- Jalankan di Supabase SQL Editor

-- 1. Rename tabel lama (backup)
ALTER TABLE IF EXISTS attendance_schedule RENAME TO attendance_schedule_old;

-- 2. Buat tabel baru dengan struktur tanggal spesifik
CREATE TABLE IF NOT EXISTS attendance_schedule (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  practice_date DATE NOT NULL UNIQUE, -- Tanggal latihan spesifik
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE attendance_schedule ENABLE ROW LEVEL SECURITY;

-- 4. Drop old policies
DROP POLICY IF EXISTS "Anyone can view attendance schedule" ON attendance_schedule;
DROP POLICY IF EXISTS "Sekretaris can modify attendance schedule" ON attendance_schedule;

-- 5. Create new policies
CREATE POLICY "Anyone can view attendance schedule"
  ON attendance_schedule FOR SELECT
  USING (true);

CREATE POLICY "Sekretaris can modify attendance schedule"
  ON attendance_schedule FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'sekretaris'));

-- 6. Insert contoh jadwal (sesuaikan dengan jadwal Anda)
-- Contoh: 3 latihan di bulan Januari 2026
INSERT INTO attendance_schedule (practice_date, start_time, end_time, description)
VALUES 
  ('2026-01-06', '13:00', '22:00', 'Latihan Reguler'),
  ('2026-01-08', '13:00', '22:00', 'Latihan Reguler'),
  ('2026-01-10', '13:00', '22:00', 'Latihan Reguler')
ON CONFLICT (practice_date) DO NOTHING;

-- 7. Create index untuk performa
CREATE INDEX IF NOT EXISTS idx_schedule_practice_date ON attendance_schedule(practice_date);
CREATE INDEX IF NOT EXISTS idx_schedule_active ON attendance_schedule(is_active);

-- 8. Drop tabel lama setelah yakin migrasi berhasil
-- DROP TABLE IF EXISTS attendance_schedule_old;

COMMENT ON TABLE attendance_schedule IS 'Jadwal latihan dengan tanggal spesifik (bukan berulang)';
COMMENT ON COLUMN attendance_schedule.practice_date IS 'Tanggal latihan spesifik (YYYY-MM-DD)';
