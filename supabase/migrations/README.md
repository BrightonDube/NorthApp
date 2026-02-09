# Database Migrations

This directory contains SQL migration scripts for the North mobile application database.

## Migrations

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
# Apply all pending migrations
supabase db push

# Or apply a specific migration
supabase db push --file supabase/migrations/add_marketplace_columns.sql
```

### Using Supabase Dashboard

1. Navigate to the SQL Editor in your Supabase project dashboard
2. Copy the contents of the migration file
3. Execute the SQL script
4. Verify the changes in the Table Editor

## Rollback

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
