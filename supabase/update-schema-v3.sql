-- Inventory Management System - Schema Update v3
-- Update status enum to include new values
-- Run this in your Supabase SQL Editor

-- 1. Create new status enum (v3) with updated values
DO $$ BEGIN
    CREATE TYPE item_status_v3 AS ENUM (
        'Brand New', 
        'Good', 
        'Serviceable', 
        'Unserviceable', 
        'Repair Needed', 
        'Donated', 
        'For Disposal', 
        'Disposable'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add temporary column with new status type
ALTER TABLE items ADD COLUMN IF NOT EXISTS status_v3 item_status_v3;

-- 3. Map old statuses to new statuses
UPDATE items SET status_v3 = 
    CASE 
        WHEN status::text = 'Brand New' THEN 'Brand New'::item_status_v3
        WHEN status::text = 'Good' THEN 'Good'::item_status_v3
        WHEN status::text = 'Usable' THEN 'Serviceable'::item_status_v3
        WHEN status::text = 'Repair Needed' THEN 'Repair Needed'::item_status_v3
        WHEN status::text = 'Unusable' THEN 'Unserviceable'::item_status_v3
        ELSE 'Serviceable'::item_status_v3
    END
WHERE status_v3 IS NULL;

-- 4. Drop old status column and rename new one
ALTER TABLE items DROP COLUMN IF EXISTS status;
ALTER TABLE items RENAME COLUMN status_v3 TO status;

-- 5. Set default for status
ALTER TABLE items ALTER COLUMN status SET DEFAULT 'Brand New'::item_status_v3;

-- 6. Drop old enum types (optional, only if not used elsewhere)
-- Uncomment these if you're sure the old types aren't used:
-- DROP TYPE IF EXISTS item_status CASCADE;
-- DROP TYPE IF EXISTS item_status_v2 CASCADE;
