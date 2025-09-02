-- Add content_hash column to surveys table
-- Migration: Add content_hash column for survey content deduplication

-- Check if content_hash column already exists
DO $$
BEGIN
    -- Add content_hash column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'surveys' 
        AND column_name = 'content_hash'
    ) THEN
        ALTER TABLE surveys 
        ADD COLUMN content_hash VARCHAR(255);
        
        -- Add index for better query performance
        CREATE INDEX IF NOT EXISTS idx_surveys_content_hash 
        ON surveys(content_hash);
        
        RAISE NOTICE 'content_hash column added to surveys table';
    ELSE
        RAISE NOTICE 'content_hash column already exists in surveys table';
    END IF;
END $$;

-- Update existing surveys with NULL content_hash (optional)
-- This is for backward compatibility with existing data
UPDATE surveys 
SET content_hash = NULL 
WHERE content_hash IS NULL;

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'surveys' 
AND column_name = 'content_hash';
