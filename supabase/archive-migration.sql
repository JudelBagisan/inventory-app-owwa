-- ============================================================================
-- ARCHIVE FEATURE MIGRATION
-- ============================================================================
-- Adds archive functionality for deleted items with 30-day auto-deletion
-- Items that are deleted are moved to archived_items table instead of hard delete
-- After 30 days, archived items are permanently deleted
-- ============================================================================

-- Create archived_items table
CREATE TABLE IF NOT EXISTS archived_items (
    id UUID PRIMARY KEY,
    unique_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category item_category,
    serial_number TEXT,
    acquisition_date DATE,
    acquisition_cost DECIMAL(15, 2),
    location TEXT,
    end_user TEXT,
    status item_status_v3,
    remarks TEXT,
    itr_or_no TEXT,
    property_number TEXT,
    image_url TEXT,
    quantity INTEGER DEFAULT 0,
    unit TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    archived_by UUID REFERENCES auth.users(id),
    auto_delete_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Add index for auto-deletion queries
CREATE INDEX IF NOT EXISTS idx_archived_items_auto_delete 
ON archived_items(auto_delete_at) 
WHERE auto_delete_at IS NOT NULL;

-- Add index for archived_by
CREATE INDEX IF NOT EXISTS idx_archived_items_archived_by 
ON archived_items(archived_by);

-- Add index for unique_id lookups
CREATE INDEX IF NOT EXISTS idx_archived_items_unique_id 
ON archived_items(unique_id);

-- Enable RLS on archived_items
ALTER TABLE archived_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for archived_items
DROP POLICY IF EXISTS "Archived items are viewable by authenticated users" ON archived_items;
CREATE POLICY "Archived items are viewable by authenticated users"
ON archived_items FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Archived items can be inserted by authenticated users" ON archived_items;
CREATE POLICY "Archived items can be inserted by authenticated users"
ON archived_items FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Archived items can be deleted by authenticated users" ON archived_items;
CREATE POLICY "Archived items can be deleted by authenticated users"
ON archived_items FOR DELETE
TO authenticated
USING (true);

-- Function to archive an item instead of deleting it
CREATE OR REPLACE FUNCTION archive_item(item_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    item_record RECORD;
BEGIN
    -- Get the item data
    SELECT * INTO item_record FROM items WHERE id = item_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Insert into archived_items
    INSERT INTO archived_items (
        id, unique_id, name, description, category, serial_number,
        acquisition_date, acquisition_cost, location, end_user, status,
        remarks, itr_or_no, property_number, image_url, quantity, unit,
        created_at, updated_at, archived_by
    ) VALUES (
        item_record.id, item_record.unique_id, item_record.name, 
        item_record.description, item_record.category, item_record.serial_number,
        item_record.acquisition_date, item_record.acquisition_cost, 
        item_record.location, item_record.end_user, item_record.status,
        item_record.remarks, item_record.itr_or_no, item_record.property_number,
        item_record.image_url, item_record.quantity, item_record.unit,
        item_record.created_at, item_record.updated_at, user_id
    );
    
    -- Delete from items table
    DELETE FROM items WHERE id = item_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore an archived item
CREATE OR REPLACE FUNCTION restore_archived_item(item_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    archived_record RECORD;
BEGIN
    -- Get the archived item data
    SELECT * INTO archived_record FROM archived_items WHERE id = item_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Insert back into items table
    INSERT INTO items (
        id, unique_id, name, description, category, serial_number,
        acquisition_date, acquisition_cost, location, end_user, status,
        remarks, itr_or_no, property_number, image_url, quantity, unit,
        created_at, updated_at
    ) VALUES (
        archived_record.id, archived_record.unique_id, archived_record.name,
        archived_record.description, archived_record.category, archived_record.serial_number,
        archived_record.acquisition_date, archived_record.acquisition_cost,
        archived_record.location, archived_record.end_user, archived_record.status,
        archived_record.remarks, archived_record.itr_or_no, archived_record.property_number,
        archived_record.image_url, archived_record.quantity, archived_record.unit,
        archived_record.created_at, NOW()
    );
    
    -- Delete from archived_items
    DELETE FROM archived_items WHERE id = item_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired archived items (run daily via cron or scheduler)
CREATE OR REPLACE FUNCTION cleanup_expired_archived_items()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete items where auto_delete_at has passed
    DELETE FROM archived_items 
    WHERE auto_delete_at <= NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION archive_item TO authenticated;
GRANT EXECUTE ON FUNCTION restore_archived_item TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_archived_items TO authenticated;

-- Note: For automatic cleanup, you can set up a cron job or use Supabase Edge Functions
-- to call cleanup_expired_archived_items() daily. Example using pg_cron extension:
-- 
-- SELECT cron.schedule(
--     'cleanup-archived-items',
--     '0 2 * * *', -- Every day at 2 AM
--     'SELECT cleanup_expired_archived_items();'
-- );
