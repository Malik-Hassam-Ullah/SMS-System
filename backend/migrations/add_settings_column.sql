-- ============================================================
-- SMS System — Add settings JSONB column to branches table
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add the settings column if it doesn't already exist
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Verify it was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'branches' 
AND column_name = 'settings';
