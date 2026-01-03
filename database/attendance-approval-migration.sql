-- Attendance Approval System - Database Migration
-- Jalankan script ini di Supabase SQL Editor setelah attendance-setup.sql

-- 1. Add new columns for approval workflow
ALTER TABLE attendance_logs 
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved' 
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE attendance_logs 
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE attendance_logs 
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);

ALTER TABLE attendance_logs 
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Add attendance_date column for better querying
ALTER TABLE attendance_logs 
  ADD COLUMN IF NOT EXISTS attendance_date DATE DEFAULT CURRENT_DATE;

-- Rename reason to notes for consistency (if reason exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='attendance_logs' AND column_name='reason') THEN
    ALTER TABLE attendance_logs RENAME COLUMN reason TO notes;
  END IF;
END $$;

-- 2. Update status constraint to include 'alpha'
ALTER TABLE attendance_logs 
  DROP CONSTRAINT IF EXISTS attendance_logs_status_check;

ALTER TABLE attendance_logs 
  ADD CONSTRAINT attendance_logs_status_check 
  CHECK (status IN ('hadir', 'sakit', 'izin', 'alpha'));

-- 3. Create function to auto-set approval_status based on status
CREATE OR REPLACE FUNCTION set_approval_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-approve 'hadir', set 'pending' for sakit/izin
  IF NEW.status = 'hadir' THEN
    NEW.approval_status := 'approved';
  ELSIF NEW.status IN ('sakit', 'izin') THEN
    NEW.approval_status := 'pending';
  ELSIF NEW.status = 'alpha' THEN
    NEW.approval_status := 'rejected';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger
DROP TRIGGER IF EXISTS set_approval_status_trigger ON attendance_logs;

CREATE TRIGGER set_approval_status_trigger
  BEFORE INSERT ON attendance_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_approval_status();

-- 5. Update existing data (sakit/izin yang belum direview tetap approved untuk backward compatibility)
UPDATE attendance_logs 
SET approval_status = 'approved' 
WHERE approval_status IS NULL;

-- 6. Create index for performance
CREATE INDEX IF NOT EXISTS idx_attendance_approval_status ON attendance_logs(approval_status);
CREATE INDEX IF NOT EXISTS idx_attendance_reviewed_by ON attendance_logs(reviewed_by);

-- 7. Optional: Attendance Schedule table (for future - bisa diatur via UI)
CREATE TABLE IF NOT EXISTS attendance_schedule (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), 
  -- 0=Minggu, 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat, 6=Sabtu
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE attendance_schedule ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "Anyone can view attendance schedule" ON attendance_schedule;
DROP POLICY IF EXISTS "Sekretaris can modify attendance schedule" ON attendance_schedule;

-- Policy: Everyone can read schedule
CREATE POLICY "Anyone can view attendance schedule"
  ON attendance_schedule FOR SELECT
  USING (true);

-- Policy: Only sekretaris can modify schedule
CREATE POLICY "Sekretaris can modify attendance schedule"
  ON attendance_schedule FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'sekretaris'));

-- 8. Insert default schedule (Senin, Rabu, Jumat 13:00-22:00)
-- Use ON CONFLICT DO NOTHING to allow re-running this script
INSERT INTO attendance_schedule (day_of_week, start_time, end_time, description)
VALUES 
  (1, '13:00', '22:00', 'Latihan Senin'),
  (3, '13:00', '22:00', 'Latihan Rabu'),
  (5, '13:00', '22:00', 'Latihan Jumat')
ON CONFLICT DO NOTHING;

-- 9. Create view for pending approvals (for secretary dashboard)
CREATE OR REPLACE VIEW pending_approvals AS
SELECT 
  al.*,
  m.full_name as member_name,
  m.nim
FROM attendance_logs al
LEFT JOIN ukm_members m ON al.member_id = m.id
WHERE al.approval_status = 'pending'
ORDER BY al.created_at DESC;

COMMENT ON TABLE attendance_schedule IS 'Jadwal latihan UKM untuk validasi absensi';
COMMENT ON COLUMN attendance_logs.approval_status IS 'Status approval: pending=menunggu review, approved=disetujui, rejected=ditolak';
COMMENT ON COLUMN attendance_logs.rejection_reason IS 'Alasan jika absensi ditolak oleh sekretaris';
