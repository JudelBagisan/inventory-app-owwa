-- Inventory Management System - Schema Update v2
-- Run this in your Supabase SQL Editor

-- 1. Create new category enum
DO $$ BEGIN
    CREATE TYPE item_category AS ENUM ('Furniture and Fixtures', 'ICT Equipments', 'Other Equipments');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create new status enum (v2)
DO $$ BEGIN
    CREATE TYPE item_status_v2 AS ENUM ('Brand New', 'Good', 'Usable', 'Repair Needed', 'Unusable');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Add category column to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS category item_category DEFAULT 'Other Equipments';

-- 4. Remove foreign key constraint on location (if exists)
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_location_fkey;

-- 5. Migrate status values from old enum to new
-- First, add a temporary column with new status type
ALTER TABLE items ADD COLUMN IF NOT EXISTS status_new item_status_v2;

-- Map old statuses to new statuses
UPDATE items SET status_new = 
    CASE 
        WHEN status::text = 'In Stock' THEN 'Brand New'::item_status_v2
        WHEN status::text = 'Checked Out' THEN 'Good'::item_status_v2
        WHEN status::text = 'Maintenance' THEN 'Repair Needed'::item_status_v2
        WHEN status::text = 'Disposed' THEN 'Unusable'::item_status_v2
        ELSE 'Usable'::item_status_v2
    END;

-- Drop old status column and rename new one
ALTER TABLE items DROP COLUMN IF EXISTS status;
ALTER TABLE items RENAME COLUMN status_new TO status;

-- Set default for status
ALTER TABLE items ALTER COLUMN status SET DEFAULT 'Brand New'::item_status_v2;

-- 6. Remove owner column
ALTER TABLE items DROP COLUMN IF EXISTS owner;

-- 7. Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);

-- 8. Update the status index
DROP INDEX IF EXISTS idx_items_status;
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);

-- Note: Location remains as TEXT but is no longer constrained to the locations table values
-- Existing location values will be preserved
