-- Quick Migration: Add uploader_name column to existing documents table
-- Jalankan di Supabase SQL Editor

-- Step 1: Add column uploader_name
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS uploader_name TEXT;

-- Step 2: (Optional) Populate existing documents with uploader name from users table
-- Ini akan mengisi data yang sudah ada dengan nama dari tabel users
UPDATE documents d
SET uploader_name = u.full_name
FROM users u
WHERE d.uploaded_by = u.id
AND d.uploader_name IS NULL;

-- Step 3: Verify
SELECT id, title, uploader_name, uploaded_by FROM documents;
