-- ============================================================================
-- INVENTORY MANAGEMENT SYSTEM - COMPLETE DATABASE SCHEMA
-- ============================================================================
-- This is the full and proper schema for the Inventory Management System
-- Run this in your Supabase SQL Editor to set up the complete database
-- Last Updated: January 23, 2026
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

-- Enable UUID extension for generating unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================================
-- 2. ENUMS (Custom Types)
-- ============================================================================

-- Item Category Enum
DO $$ BEGIN
    CREATE TYPE item_category AS ENUM (
        'Furniture and Fixtures', 
        'ICT Equipments', 
        'Other Equipments'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Item Status Enum (v3 - Latest Version)
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


-- ============================================================================
-- 3. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Locations Table - Stores location options for items
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default locations
INSERT INTO locations (name) VALUES
    ('RAD'),
    ('AFU'),
    ('PDO')
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Units Table - Stores unit of measurement options
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Items Table - Main inventory items table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unique_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category item_category DEFAULT 'Other Equipments',
    serial_number TEXT,
    acquisition_date DATE,
    acquisition_cost DECIMAL(15, 2),
    location TEXT,
    end_user TEXT,
    status item_status_v3 DEFAULT 'Brand New',
    remarks TEXT,
    itr_or_no TEXT,
    property_number TEXT,
    image_url TEXT,
    quantity INTEGER DEFAULT 0 CHECK (quantity >= 0),
    unit TEXT REFERENCES units(name) ON UPDATE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Print Collections Table - Stores collection of items for printing
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS print_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Collection Items Table - Junction table for collections and items
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS collection_items (
    collection_id UUID REFERENCES print_collections(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (collection_id, item_id)
);


-- ============================================================================
-- 4. INDEXES
-- ============================================================================

-- Items table indexes
CREATE INDEX IF NOT EXISTS idx_items_unique_id ON items(unique_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_property_number ON items(property_number);

-- Locations table indexes
CREATE INDEX IF NOT EXISTS idx_locations_deleted_at ON locations(deleted_at);

-- Print collections indexes
CREATE INDEX IF NOT EXISTS idx_print_collections_created_by ON print_collections(created_by);
CREATE INDEX IF NOT EXISTS idx_print_collections_updated_at ON print_collections(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_item_id ON collection_items(item_id);


-- ============================================================================
-- 5. FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function to update updated_at timestamp on items table
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Function to update print_collection timestamp
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_print_collection_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Function to update collection's updated_at when items are added/removed
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_collection_on_item_change()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE print_collections 
    SET updated_at = NOW() 
    WHERE id = COALESCE(NEW.collection_id, OLD.collection_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

-- Trigger for items table updated_at
DROP TRIGGER IF EXISTS update_items_updated_at ON items;
CREATE TRIGGER update_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for print_collections updated_at
DROP TRIGGER IF EXISTS set_print_collection_timestamp ON print_collections;
CREATE TRIGGER set_print_collection_timestamp
    BEFORE UPDATE ON print_collections
    FOR EACH ROW
    EXECUTE FUNCTION update_print_collection_timestamp();

-- Trigger to update collection when items are added/removed
DROP TRIGGER IF EXISTS collection_items_change ON collection_items;
CREATE TRIGGER collection_items_change
    AFTER INSERT OR DELETE ON collection_items
    FOR EACH ROW
    EXECUTE FUNCTION update_collection_on_item_change();


-- ============================================================================
-- 7. VIEWS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View for active (non-deleted) locations only
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW active_locations AS
SELECT * FROM locations WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- View for collection summary with item counts
-- ----------------------------------------------------------------------------
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


-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS Policies for Locations
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Locations are viewable by everyone" ON locations;
CREATE POLICY "Locations are viewable by everyone"
    ON locations FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Locations can be inserted by authenticated users" ON locations;
CREATE POLICY "Locations can be inserted by authenticated users"
    ON locations FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Locations can be updated by authenticated users" ON locations;
CREATE POLICY "Locations can be updated by authenticated users"
    ON locations FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Locations can be deleted by authenticated users" ON locations;
CREATE POLICY "Locations can be deleted by authenticated users"
    ON locations FOR DELETE
    TO authenticated
    USING (true);

-- ----------------------------------------------------------------------------
-- RLS Policies for Units
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Units are viewable by everyone" ON units;
CREATE POLICY "Units are viewable by everyone"
    ON units FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Units can be inserted by authenticated users" ON units;
CREATE POLICY "Units can be inserted by authenticated users"
    ON units FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Units can be updated by authenticated users" ON units;
CREATE POLICY "Units can be updated by authenticated users"
    ON units FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Units can be deleted by authenticated users" ON units;
CREATE POLICY "Units can be deleted by authenticated users"
    ON units FOR DELETE
    TO authenticated
    USING (true);

-- ----------------------------------------------------------------------------
-- RLS Policies for Items
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Items are viewable by everyone" ON items;
CREATE POLICY "Items are viewable by everyone"
    ON items FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Items can be inserted by authenticated users" ON items;
CREATE POLICY "Items can be inserted by authenticated users"
    ON items FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Items can be updated by authenticated users" ON items;
CREATE POLICY "Items can be updated by authenticated users"
    ON items FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Items can be deleted by authenticated users" ON items;
CREATE POLICY "Items can be deleted by authenticated users"
    ON items FOR DELETE
    TO authenticated
    USING (true);

-- ----------------------------------------------------------------------------
-- RLS Policies for Print Collections
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Collections are viewable by authenticated users" ON print_collections;
CREATE POLICY "Collections are viewable by authenticated users"
    ON print_collections FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Collections can be created by authenticated users" ON print_collections;
CREATE POLICY "Collections can be created by authenticated users"
    ON print_collections FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Collections can be updated by creator" ON print_collections;
CREATE POLICY "Collections can be updated by creator"
    ON print_collections FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Collections can be deleted by creator" ON print_collections;
CREATE POLICY "Collections can be deleted by creator"
    ON print_collections FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by);

-- ----------------------------------------------------------------------------
-- RLS Policies for Collection Items
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Collection items are viewable by authenticated users" ON collection_items;
CREATE POLICY "Collection items are viewable by authenticated users"
    ON collection_items FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Items can be added to collections by collection creator" ON collection_items;
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

DROP POLICY IF EXISTS "Items can be removed from collections by collection creator" ON collection_items;
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


-- ============================================================================
-- 9. STORAGE
-- ============================================================================

-- Create storage bucket for inventory item images
INSERT INTO storage.buckets (id, name, public)
VALUES ('inventory', 'inventory', true)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Storage Policies
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public read access" ON storage.objects;
CREATE POLICY "Public read access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'inventory');

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'inventory');

DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
CREATE POLICY "Authenticated users can update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'inventory');

DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
CREATE POLICY "Authenticated users can delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'inventory');


-- ============================================================================
-- 10. PERMISSIONS
-- ============================================================================

-- Grant access to views
GRANT SELECT ON collection_summary TO authenticated;
GRANT SELECT ON active_locations TO authenticated;


-- ============================================================================
-- SCHEMA SETUP COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Inventory Management System Schema Setup Complete!';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Tables Created:';
    RAISE NOTICE '  - locations (with soft delete support)';
    RAISE NOTICE '  - units';
    RAISE NOTICE '  - items (with category and status v3)';
    RAISE NOTICE '  - print_collections';
    RAISE NOTICE '  - collection_items';
    RAISE NOTICE '';
    RAISE NOTICE 'Views Created:';
    RAISE NOTICE '  - active_locations';
    RAISE NOTICE '  - collection_summary';
    RAISE NOTICE '';
    RAISE NOTICE 'Storage Bucket:';
    RAISE NOTICE '  - inventory (public)';
    RAISE NOTICE '';
    RAISE NOTICE 'Row Level Security: Enabled on all tables';
    RAISE NOTICE '============================================================';
END $$;
