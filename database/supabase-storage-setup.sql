-- Supabase Storage Setup untuk Dokumen Surat
-- Jalankan script ini di Supabase SQL Editor setelah menjalankan supabase-schema.sql

-- Create storage bucket untuk dokumen
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies untuk bucket documents
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Users can view all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Users can update their own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents' AND owner = auth.uid());

CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND owner = auth.uid());

-- Note: Public bucket means files accessible via public URL
-- RLS policies still control who can upload/delete
-- Files will be stored in path: documents/{user_id}/{filename}
