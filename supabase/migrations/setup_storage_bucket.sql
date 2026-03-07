-- Storage Bucket Setup for File Context Attachments
-- This script sets up the Supabase Storage bucket and policies for user file uploads
-- 
-- IMPORTANT: This script should be run AFTER the main migration (add_file_context_attachments.sql)
-- and requires appropriate permissions to create storage buckets and policies.
--
-- Validates: Requirements 3.1, 6.1, 6.2

-- ============================================================================
-- STORAGE BUCKET CREATION
-- ============================================================================

-- Create the user-context-files bucket
-- Note: If the bucket already exists, this will be ignored
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-context-files',
  'user-context-files',
  false, -- Private bucket (requires authentication)
  10485760, -- 10MB in bytes
  ARRAY['application/pdf', 'text/plain', 'text/markdown', 'text/x-markdown']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- Policy: Users can upload files to their own folder
-- Path format: user-context-files/{user_id}/{file_id}.{extension}
CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-context-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can read their own files
CREATE POLICY "Users can read their own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-context-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own files
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-context-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'user-context-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-context-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify bucket was created
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'user-context-files';

-- Verify storage policies
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%own files%'
ORDER BY policyname;
