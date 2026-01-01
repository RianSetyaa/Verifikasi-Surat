-- Sistem Manajemen Surat - Supabase Database Schema
-- Jalankan script ini di Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extended profile)
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('anggota', 'sekretaris')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('surat_masuk', 'surat_keluar', 'notulensi')),
  description TEXT,
  uploaded_by UUID REFERENCES users(id) NOT NULL,
  uploader_name TEXT,  -- Nama pengunggah langsung dari form
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'revision', 'validated')),
  file_url TEXT,
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  document_number TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_revisions table
CREATE TABLE IF NOT EXISTS document_revisions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  revision_note TEXT NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to documents table
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_revisions ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Documents table policies
CREATE POLICY "Anggota can view their own documents"
  ON documents FOR SELECT
  USING (
    uploaded_by = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'sekretaris')
  );

CREATE POLICY "Anggota can insert their own documents"
  ON documents FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Anggota can update their own pending documents"
  ON documents FOR UPDATE
  USING (uploaded_by = auth.uid() AND status IN ('pending', 'revision'));

CREATE POLICY "Sekretaris can view all documents"
  ON documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'sekretaris'));

CREATE POLICY "Sekretaris can update all documents"
  ON documents FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'sekretaris'));

-- Document revisions policies
CREATE POLICY "Users can view revisions for their documents"
  ON document_revisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_revisions.document_id 
      AND (documents.uploaded_by = auth.uid() OR 
           EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'sekretaris'))
    )
  );

CREATE POLICY "Sekretaris can insert revisions"
  ON document_revisions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'sekretaris'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_document_revisions_document_id ON document_revisions(document_id);

-- Insert sample users (optional - for testing)
-- Note: You'll need to create these users in Supabase Auth first, then insert profiles
-- Example:
-- INSERT INTO users (id, email, full_name, role) 
-- VALUES ('user-uuid-from-auth', 'anggota@example.com', 'Nama Anggota', 'anggota');
