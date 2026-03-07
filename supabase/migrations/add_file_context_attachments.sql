-- Migration: Add File Context Attachments
-- This migration adds the necessary tables, storage bucket, and security policies
-- to support file attachments as part of user context
-- Validates: Requirements 3.1, 3.2, 3.3, 6.1, 6.2

-- ============================================================================
-- TABLES
-- ============================================================================

-- Create file_attachments table
CREATE TABLE IF NOT EXISTS file_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'txt', 'md')),
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 10485760), -- Max 10MB
  upload_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  storage_path TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  extracted_content TEXT,
  extraction_success BOOLEAN NOT NULL DEFAULT false,
  extraction_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments to explain the table and columns
COMMENT ON TABLE file_attachments IS 'Stores metadata and extracted content for user-uploaded files (PDFs, text, markdown)';
COMMENT ON COLUMN file_attachments.user_id IS 'Reference to the user who owns this file';
COMMENT ON COLUMN file_attachments.filename IS 'Original filename as uploaded by the user';
COMMENT ON COLUMN file_attachments.file_type IS 'File type: pdf, txt, or md';
COMMENT ON COLUMN file_attachments.file_size IS 'File size in bytes (max 10MB)';
COMMENT ON COLUMN file_attachments.upload_date IS 'Timestamp when the file was uploaded';
COMMENT ON COLUMN file_attachments.storage_path IS 'Path to the file in Supabase Storage';
COMMENT ON COLUMN file_attachments.storage_url IS 'URL to access the file in storage';
COMMENT ON COLUMN file_attachments.extracted_content IS 'Text content extracted from the file';
COMMENT ON COLUMN file_attachments.extraction_success IS 'Whether text extraction was successful';
COMMENT ON COLUMN file_attachments.extraction_error IS 'Error message if extraction failed';

-- Create session_file_selections table
CREATE TABLE IF NOT EXISTS session_file_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  file_id UUID NOT NULL REFERENCES file_attachments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, file_id)
);

-- Add comments to explain the table and columns
COMMENT ON TABLE session_file_selections IS 'Tracks which files are selected for specific chat sessions';
COMMENT ON COLUMN session_file_selections.session_id IS 'Reference to the chat session';
COMMENT ON COLUMN session_file_selections.file_id IS 'Reference to the file attachment';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Indexes for file_attachments table
CREATE INDEX IF NOT EXISTS idx_file_attachments_user_id ON file_attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_upload_date ON file_attachments(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_file_attachments_file_type ON file_attachments(file_type);
CREATE INDEX IF NOT EXISTS idx_file_attachments_extraction_success ON file_attachments(extraction_success);

-- Indexes for session_file_selections table
CREATE INDEX IF NOT EXISTS idx_session_file_selections_session_id ON session_file_selections(session_id);
CREATE INDEX IF NOT EXISTS idx_session_file_selections_file_id ON session_file_selections(file_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to file_attachments table
DROP TRIGGER IF EXISTS update_file_attachments_updated_at ON file_attachments;
CREATE TRIGGER update_file_attachments_updated_at
  BEFORE UPDATE ON file_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on file_attachments table
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own file attachments
CREATE POLICY "Users can view their own file attachments"
ON file_attachments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own file attachments
CREATE POLICY "Users can insert their own file attachments"
ON file_attachments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own file attachments
CREATE POLICY "Users can update their own file attachments"
ON file_attachments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own file attachments
CREATE POLICY "Users can delete their own file attachments"
ON file_attachments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Enable RLS on session_file_selections table
ALTER TABLE session_file_selections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own session file selections
-- (via the file_attachments foreign key relationship)
CREATE POLICY "Users can view their own session file selections"
ON session_file_selections FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM file_attachments
    WHERE file_attachments.id = session_file_selections.file_id
    AND file_attachments.user_id = auth.uid()
  )
);

-- Policy: Users can insert session file selections for their own files
CREATE POLICY "Users can insert session file selections for their own files"
ON session_file_selections FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM file_attachments
    WHERE file_attachments.id = session_file_selections.file_id
    AND file_attachments.user_id = auth.uid()
  )
);

-- Policy: Users can delete their own session file selections
CREATE POLICY "Users can delete their own session file selections"
ON session_file_selections FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM file_attachments
    WHERE file_attachments.id = session_file_selections.file_id
    AND file_attachments.user_id = auth.uid()
  )
);

-- ============================================================================
-- STORAGE BUCKET SETUP
-- ============================================================================

-- Note: Storage bucket creation and policies must be done via Supabase Dashboard
-- or using the Supabase Management API, as they cannot be created via SQL migrations.
-- 
-- The following SQL is provided for reference and documentation purposes.
-- To set up the storage bucket, follow these steps:
--
-- 1. Create the bucket via Supabase Dashboard:
--    - Navigate to Storage in your Supabase project
--    - Click "Create a new bucket"
--    - Name: user-context-files
--    - Public: false (private bucket)
--    - File size limit: 10MB
--    - Allowed MIME types: application/pdf, text/plain, text/markdown
--
-- 2. Apply storage policies via SQL Editor:

-- Storage Policy: Users can upload their own files
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'user-context-files',
--   'user-context-files',
--   false,
--   10485760, -- 10MB in bytes
--   ARRAY['application/pdf', 'text/plain', 'text/markdown']
-- )
-- ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Users can upload files to their own folder
-- CREATE POLICY "Users can upload their own files"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'user-context-files' 
--   AND (storage.foldername(name))[1] = auth.uid()::text
-- );

-- Storage Policy: Users can read their own files
-- CREATE POLICY "Users can read their own files"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (
--   bucket_id = 'user-context-files' 
--   AND (storage.foldername(name))[1] = auth.uid()::text
-- );

-- Storage Policy: Users can update their own files
-- CREATE POLICY "Users can update their own files"
-- ON storage.objects FOR UPDATE
-- TO authenticated
-- USING (
--   bucket_id = 'user-context-files' 
--   AND (storage.foldername(name))[1] = auth.uid()::text
-- )
-- WITH CHECK (
--   bucket_id = 'user-context-files' 
--   AND (storage.foldername(name))[1] = auth.uid()::text
-- );

-- Storage Policy: Users can delete their own files
-- CREATE POLICY "Users can delete their own files"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (
--   bucket_id = 'user-context-files' 
--   AND (storage.foldername(name))[1] = auth.uid()::text
-- );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables were created
-- SELECT table_name, table_type 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('file_attachments', 'session_file_selections');

-- Verify columns in file_attachments
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'file_attachments' 
-- ORDER BY ordinal_position;

-- Verify indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename IN ('file_attachments', 'session_file_selections')
-- ORDER BY indexname;

-- Verify RLS is enabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename IN ('file_attachments', 'session_file_selections');

-- Verify RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename IN ('file_attachments', 'session_file_selections')
-- ORDER BY tablename, policyname;
