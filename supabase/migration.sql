-- Inventory Management System - Migration Script
-- Run this to add new columns to an EXISTING items table
-- Run this BEFORE running seed.sql

-- Create locations table if not exists
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on locations (safe to run multiple times)
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Locations are viewable by everyone" ON locations;
DROP POLICY IF EXISTS "Locations can be inserted by authenticated users" ON locations;

-- Recreate policies
CREATE POLICY "Locations are viewable by everyone"
  ON locations FOR SELECT
  USING (true);

CREATE POLICY "Locations can be inserted by authenticated users"
  ON locations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert default locations
INSERT INTO locations (name) VALUES
  ('RAD'),
  ('AFU'),
  ('PDO')
ON CONFLICT (name) DO NOTHING;

-- Add new columns to items table (if they don't exist)
DO $$ 
BEGIN
    -- Add description column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'description') THEN
        ALTER TABLE items ADD COLUMN description TEXT;
    END IF;

    -- Add serial_number column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'serial_number') THEN
        ALTER TABLE items ADD COLUMN serial_number TEXT;
    END IF;

    -- Add acquisition_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'acquisition_date') THEN
        ALTER TABLE items ADD COLUMN acquisition_date DATE;
    END IF;

    -- Add acquisition_cost column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'acquisition_cost') THEN
        ALTER TABLE items ADD COLUMN acquisition_cost DECIMAL(15, 2);
    END IF;

    -- Add location column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'location') THEN
        ALTER TABLE items ADD COLUMN location TEXT REFERENCES locations(name) ON UPDATE CASCADE;
    END IF;

    -- Add end_user column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'end_user') THEN
        ALTER TABLE items ADD COLUMN end_user TEXT;
    END IF;

    -- Add itr_or_no column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'itr_or_no') THEN
        ALTER TABLE items ADD COLUMN itr_or_no TEXT;
    END IF;

    -- Add property_number column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'property_number') THEN
        ALTER TABLE items ADD COLUMN property_number TEXT;
    END IF;

    -- Add image_url column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'image_url') THEN
        ALTER TABLE items ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Create index on property_number for searches
CREATE INDEX IF NOT EXISTS idx_items_property_number ON items(property_number);
