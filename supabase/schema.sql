-- Inventory Management System - Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create status enum for items (safe to run multiple times)
DO $$ BEGIN
    CREATE TYPE item_status AS ENUM ('In Stock', 'Checked Out', 'Maintenance', 'Disposed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create locations table for dropdown options
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default locations
INSERT INTO locations (name) VALUES
  ('RAD'),
  ('AFU'),
  ('PDO')
ON CONFLICT (name) DO NOTHING;

-- Create units table for dropdown options
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create items table with all required fields
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unique_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  serial_number TEXT,
  acquisition_date DATE,
  acquisition_cost DECIMAL(15, 2),
  location TEXT REFERENCES locations(name) ON UPDATE CASCADE,
  end_user TEXT,
  status item_status DEFAULT 'In Stock',
  remarks TEXT,
  itr_or_no TEXT,
  property_number TEXT,
  image_url TEXT,
  quantity INTEGER DEFAULT 0 CHECK (quantity >= 0),
  unit TEXT REFERENCES units(name) ON UPDATE CASCADE,
  owner TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on unique_id for fast QR code lookups
CREATE INDEX IF NOT EXISTS idx_items_unique_id ON items(unique_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);

-- Create index on property_number for searches
CREATE INDEX IF NOT EXISTS idx_items_property_number ON items(property_number);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for items table
DROP TRIGGER IF EXISTS update_items_updated_at ON items;
CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on tables
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Locations are viewable by everyone" ON locations;
DROP POLICY IF EXISTS "Locations can be inserted by authenticated users" ON locations;
DROP POLICY IF EXISTS "Units are viewable by everyone" ON units;
DROP POLICY IF EXISTS "Units can be inserted by authenticated users" ON units;
DROP POLICY IF EXISTS "Units can be updated by authenticated users" ON units;
DROP POLICY IF EXISTS "Units can be deleted by authenticated users" ON units;
DROP POLICY IF EXISTS "Items are viewable by everyone" ON items;
DROP POLICY IF EXISTS "Items can be inserted by authenticated users" ON items;
DROP POLICY IF EXISTS "Items can be updated by authenticated users" ON items;
DROP POLICY IF EXISTS "Items can be deleted by authenticated users" ON items;

-- Locations policies
CREATE POLICY "Locations are viewable by everyone"
  ON locations FOR SELECT
  USING (true);

CREATE POLICY "Locations can be inserted by authenticated users"
  ON locations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Units policies
CREATE POLICY "Units are viewable by everyone"
  ON units FOR SELECT
  USING (true);

CREATE POLICY "Units can be inserted by authenticated users"
  ON units FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Units can be updated by authenticated users"
  ON units FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Units can be deleted by authenticated users"
  ON units FOR DELETE
  TO authenticated
  USING (true);

-- Items policies
CREATE POLICY "Items are viewable by everyone"
  ON items FOR SELECT
  USING (true);

CREATE POLICY "Items can be inserted by authenticated users"
  ON items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Items can be updated by authenticated users"
  ON items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Items can be deleted by authenticated users"
  ON items FOR DELETE
  TO authenticated
  USING (true);

-- Storage bucket for item images
-- Note: You may need to create this bucket manually in Supabase Dashboard
-- Go to Storage > Create new bucket > Name: "inventory" > Make it public

-- If using SQL to create bucket (requires admin access):
INSERT INTO storage.buckets (id, name, public)
VALUES ('inventory', 'inventory', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the inventory bucket
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;

-- Anyone can view images
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'inventory');

-- Authenticated users can upload images
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inventory');

-- Authenticated users can update their images
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'inventory');

-- Authenticated users can delete images
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'inventory');
