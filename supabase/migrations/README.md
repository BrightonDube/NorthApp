# Database Migrations

This directory contains SQL migration scripts for the North mobile application database.

## Migrations

### add_file_context_attachments.sql

**Purpose**: Adds support for the File Context Attachments feature

**Changes**:
- Creates `file_attachments` table with columns for file metadata and extracted content
- Creates `session_file_selections` table for session-specific file management
- Adds indexes for performance optimization
- Implements Row Level Security (RLS) policies for both tables
- Creates trigger for automatic `updated_at` timestamp updates
- Includes documentation for storage bucket setup (requires separate execution)

**Tables Created**:
- `file_attachments` - Stores file metadata, storage paths, and extracted text content
- `session_file_selections` - Tracks which files are selected for specific chat sessions

**Indexes Created**:
- `idx_file_attachments_user_id` - Index on user_id for fast user file queries
- `idx_file_attachments_upload_date` - Index on upload_date for chronological sorting
- `idx_file_attachments_file_type` - Index on file_type for filtering by type
- `idx_file_attachments_extraction_success` - Index on extraction_success for filtering
- `idx_session_file_selections_session_id` - Index on session_id for session queries
- `idx_session_file_selections_file_id` - Index on file_id for file queries

**RLS Policies**:
- Users can only view, insert, update, and delete their own file attachments
- Users can only manage session file selections for their own files

**Constraints**:
- `file_type` must be one of: 'pdf', 'txt', 'md'
- `file_size` must be between 1 byte and 10MB (10485760 bytes)
- Unique constraint on (session_id, file_id) in session_file_selections

**Validates**: Requirements 3.1, 3.2, 3.3, 6.1, 6.2

### setup_storage_bucket.sql

**Purpose**: Sets up Supabase Storage bucket and policies for file uploads

**Changes**:
- Creates `user-context-files` storage bucket with 10MB file size limit
- Configures allowed MIME types (PDF, text, markdown)
- Implements storage policies for user-specific file access control

**Storage Policies**:
- Users can upload files to their own folder (path: {user_id}/{file_id}.{ext})
- Users can read, update, and delete only their own files
- All operations require authentication

**Note**: This script must be run AFTER `add_file_context_attachments.sql`

**Validates**: Requirements 3.1, 6.1, 6.2

### add_marketplace_columns.sql

**Purpose**: Adds support for the Coach Marketplace & Sharing feature

**Changes**:
- Adds `category` column to `coaches` table (VARCHAR(50), default 'General')
- Adds `is_featured` column to `coaches` table (BOOLEAN, default false)
- Adds `source_coach_id` column to `coaches` table (UUID, references coaches.id)

**Indexes Created**:
- `idx_coaches_public` - Partial index on `is_public` for marketplace queries
- `idx_coaches_featured` - Partial index on `is_featured` for featured section
- `idx_coaches_category` - Index on `category` for category filtering
- `idx_coaches_source` - Index on `source_coach_id` for tracking installed coaches
- `idx_coaches_public_category` - Composite index for marketplace category queries

**Constraints**:
- Check constraint on `category` to ensure valid values: Productivity, Learning, Health, Entertainment, Business, Creative, General

**Validates**: Requirements 5.1, 5.4, 6.3, 10.3

## Running Migrations

### Using Supabase CLI

```bash
# Apply the main file attachments migration
supabase db push --file supabase/migrations/add_file_context_attachments.sql

# Then apply the storage bucket setup
supabase db push --file supabase/migrations/setup_storage_bucket.sql

# Or apply all pending migrations
supabase db push
```

### Using Supabase Dashboard

1. Navigate to the SQL Editor in your Supabase project dashboard
2. First, copy and execute the contents of `add_file_context_attachments.sql`
3. Then, copy and execute the contents of `setup_storage_bucket.sql`
4. Verify the changes in the Table Editor and Storage sections

### Manual Setup (Alternative)

If the storage bucket SQL script doesn't work, you can create the bucket manually:

1. Navigate to Storage in your Supabase Dashboard
2. Click "Create a new bucket"
3. Configure:
   - Name: `user-context-files`
   - Public: `false` (private bucket)
   - File size limit: `10MB`
   - Allowed MIME types: `application/pdf`, `text/plain`, `text/markdown`
4. Then run the storage policies from `setup_storage_bucket.sql` in the SQL Editor

## Rollback

### Rollback File Context Attachments Migration

To rollback the file context attachments migration:

```sql
-- Drop storage policies
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;

-- Delete storage bucket (this will delete all files!)
DELETE FROM storage.buckets WHERE id = 'user-context-files';

-- Drop RLS policies for session_file_selections
DROP POLICY IF EXISTS "Users can delete their own session file selections" ON session_file_selections;
DROP POLICY IF EXISTS "Users can insert session file selections for their own files" ON session_file_selections;
DROP POLICY IF EXISTS "Users can view their own session file selections" ON session_file_selections;

-- Drop RLS policies for file_attachments
DROP POLICY IF EXISTS "Users can delete their own file attachments" ON file_attachments;
DROP POLICY IF EXISTS "Users can update their own file attachments" ON file_attachments;
DROP POLICY IF EXISTS "Users can insert their own file attachments" ON file_attachments;
DROP POLICY IF EXISTS "Users can view their own file attachments" ON file_attachments;

-- Drop trigger
DROP TRIGGER IF EXISTS update_file_attachments_updated_at ON file_attachments;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_session_file_selections_file_id;
DROP INDEX IF EXISTS idx_session_file_selections_session_id;
DROP INDEX IF EXISTS idx_file_attachments_extraction_success;
DROP INDEX IF EXISTS idx_file_attachments_file_type;
DROP INDEX IF EXISTS idx_file_attachments_upload_date;
DROP INDEX IF EXISTS idx_file_attachments_user_id;

-- Drop tables (this will delete all data!)
DROP TABLE IF EXISTS session_file_selections;
DROP TABLE IF EXISTS file_attachments;
```

### Rollback Marketplace Columns Migration

To rollback the marketplace columns migration:

```sql
-- Remove indexes
DROP INDEX IF EXISTS idx_coaches_public_category;
DROP INDEX IF EXISTS idx_coaches_source;
DROP INDEX IF EXISTS idx_coaches_category;
DROP INDEX IF EXISTS idx_coaches_featured;
DROP INDEX IF EXISTS idx_coaches_public;

-- Remove constraint
ALTER TABLE coaches DROP CONSTRAINT IF EXISTS check_coach_category;

-- Remove columns
ALTER TABLE coaches DROP COLUMN IF EXISTS source_coach_id;
ALTER TABLE coaches DROP COLUMN IF EXISTS is_featured;
ALTER TABLE coaches DROP COLUMN IF EXISTS category;
```

## Verification

### Verify File Context Attachments Migration

After running the migration, verify the changes:

```sql
-- Check that tables exist
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('file_attachments', 'session_file_selections');

-- Check file_attachments columns
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'file_attachments' 
ORDER BY ordinal_position;

-- Check session_file_selections columns
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'session_file_selections' 
ORDER BY ordinal_position;

-- Check that indexes exist
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('file_attachments', 'session_file_selections')
ORDER BY indexname;

-- Check that RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('file_attachments', 'session_file_selections');

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename IN ('file_attachments', 'session_file_selections')
ORDER BY tablename, policyname;

-- Check storage bucket
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'user-context-files';

-- Check storage policies
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%own files%'
ORDER BY policyname;
```

### Verify Marketplace Columns Migration

After running the migration, verify the changes:

```sql
-- Check that columns exist
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'coaches' 
AND column_name IN ('category', 'is_featured', 'source_coach_id');

-- Check that indexes exist
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'coaches' 
AND indexname LIKE 'idx_coaches_%';

-- Check that constraint exists
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'check_coach_category';
```

## Notes

- The migration is idempotent (uses `IF NOT EXISTS` and `IF EXISTS` clauses)
- Existing coaches will have `category` set to 'General' by default
- The `source_coach_id` foreign key uses `ON DELETE SET NULL` to preserve installed coaches even if the source is deleted
- All indexes are created with `IF NOT EXISTS` to allow safe re-running of the migration
