-- Migration: Add Coach Marketplace & Sharing columns
-- This migration adds the necessary columns and indexes to support the coach marketplace feature
-- Validates: Requirements 5.1, 5.4, 6.3, 10.3

-- Add new columns to coaches table
ALTER TABLE coaches
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'General',
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS source_coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL;

-- Add comment to explain the new columns
COMMENT ON COLUMN coaches.category IS 'Coach category for marketplace filtering: Productivity, Learning, Health, Entertainment, Business, Creative, or General';
COMMENT ON COLUMN coaches.is_featured IS 'Whether this coach should be featured in the marketplace';
COMMENT ON COLUMN coaches.source_coach_id IS 'Reference to the original public coach if this is an installed copy';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_coaches_public ON coaches(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_coaches_featured ON coaches(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_coaches_category ON coaches(category);
CREATE INDEX IF NOT EXISTS idx_coaches_source ON coaches(source_coach_id);

-- Create composite index for marketplace queries (public coaches by category)
CREATE INDEX IF NOT EXISTS idx_coaches_public_category ON coaches(is_public, category) WHERE is_public = true;

-- Add check constraint for valid categories
ALTER TABLE coaches
ADD CONSTRAINT check_coach_category 
CHECK (category IN ('Productivity', 'Learning', 'Health', 'Entertainment', 'Business', 'Creative', 'General'));

-- Update existing coaches to have a default category if NULL
UPDATE coaches SET category = 'General' WHERE category IS NULL;
