-- Attendance and Member Management Setup
-- Run this in Supabase SQL Editor

-- 1. Create ukm_members table
CREATE TABLE IF NOT EXISTS ukm_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    full_name TEXT NOT NULL,
    nim TEXT,
    prodi TEXT,
    jurusan TEXT,
    voice_type TEXT,
    position TEXT DEFAULT 'Anggota',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create attendance_logs table
CREATE TABLE IF NOT EXISTS attendance_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    member_id UUID REFERENCES ukm_members(id) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('hadir', 'sakit', 'izin', 'alpha')),
    reason TEXT,
    proof_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE ukm_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;

-- 4. Policies for ukm_members
-- Public can read (for the dropdown in attendance form)
CREATE POLICY "Public can view active members"
    ON ukm_members FOR SELECT
    USING (is_active = true);

-- Secretaries can do everything on ukm_members
CREATE POLICY "Secretaries can manage members"
    ON ukm_members FOR ALL
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'sekretaris'));

-- 5. Policies for attendance_logs
-- Public can insert (submit attendance)
CREATE POLICY "Public can submit attendance"
    ON attendance_logs FOR INSERT
    WITH CHECK (true);

-- Secretaries can view attendance logs
CREATE POLICY "Secretaries can view attendance logs"
    ON attendance_logs FOR SELECT
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'sekretaris'));

-- 6. Storage for Proofs
-- Create bucket 'attendance-proofs' if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance-proofs', 'attendance-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public to upload proofs (no auth required for attendance)
CREATE POLICY "Public can upload proofs"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'attendance-proofs');

-- Allow secretaries/public to view proofs
CREATE POLICY "Public can view proofs"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'attendance-proofs');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_member_id ON attendance_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_created_at ON attendance_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ukm_members_active ON ukm_members(is_active);
