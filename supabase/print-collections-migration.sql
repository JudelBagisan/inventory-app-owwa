-- Print Collections Feature - Database Migration
-- Run this in your Supabase SQL Editor

-- 1. Create print_collections table
CREATE TABLE IF NOT EXISTS print_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create collection_items junction table
CREATE TABLE IF NOT EXISTS collection_items (
    collection_id UUID REFERENCES print_collections(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (collection_id, item_id)
);

-- 3. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_print_collections_created_by ON print_collections(created_by);
CREATE INDEX IF NOT EXISTS idx_print_collections_updated_at ON print_collections(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_item_id ON collection_items(item_id);

-- 4. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_print_collection_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS set_print_collection_timestamp ON print_collections;
CREATE TRIGGER set_print_collection_timestamp
    BEFORE UPDATE ON print_collections
    FOR EACH ROW
    EXECUTE FUNCTION update_print_collection_timestamp();

-- 6. Create trigger to update collection's updated_at when items are added/removed
CREATE OR REPLACE FUNCTION update_collection_on_item_change()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE print_collections 
    SET updated_at = NOW() 
    WHERE id = COALESCE(NEW.collection_id, OLD.collection_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS collection_items_change ON collection_items;
CREATE TRIGGER collection_items_change
    AFTER INSERT OR DELETE ON collection_items
    FOR EACH ROW
    EXECUTE FUNCTION update_collection_on_item_change();

-- 7. Enable Row Level Security
ALTER TABLE print_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS Policies for print_collections

-- Allow authenticated users to view all collections
CREATE POLICY "Collections are viewable by authenticated users"
    ON print_collections FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to create collections
CREATE POLICY "Collections can be created by authenticated users"
    ON print_collections FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

-- Allow users to update their own collections
CREATE POLICY "Collections can be updated by creator"
    ON print_collections FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Allow users to delete their own collections
CREATE POLICY "Collections can be deleted by creator"
    ON print_collections FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by);

-- 9. Create RLS Policies for collection_items

-- Allow authenticated users to view collection items
CREATE POLICY "Collection items are viewable by authenticated users"
    ON collection_items FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to add items to collections they own
CREATE POLICY "Items can be added to collections by collection creator"
    ON collection_items FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM print_collections 
            WHERE id = collection_id 
            AND created_by = auth.uid()
        )
    );

-- Allow users to remove items from their own collections
CREATE POLICY "Items can be removed from collections by collection creator"
    ON collection_items FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM print_collections 
            WHERE id = collection_id 
            AND created_by = auth.uid()
        )
    );

-- 10. Create a view to get collection with item counts
CREATE OR REPLACE VIEW collection_summary AS
SELECT 
    pc.id,
    pc.name,
    pc.created_by,
    pc.created_at,
    pc.updated_at,
    COUNT(ci.item_id) as item_count
FROM print_collections pc
LEFT JOIN collection_items ci ON pc.id = ci.collection_id
GROUP BY pc.id, pc.name, pc.created_by, pc.created_at, pc.updated_at;

-- Grant access to the view
GRANT SELECT ON collection_summary TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Print Collections migration completed successfully!';
END $$;
