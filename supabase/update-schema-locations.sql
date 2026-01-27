-- Update locations table to support soft delete
ALTER TABLE locations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create index for faster queries on deleted locations
CREATE INDEX IF NOT EXISTS idx_locations_deleted_at ON locations(deleted_at);

-- Update policies to allow updates for soft delete
DROP POLICY IF EXISTS "Locations can be updated by authenticated users" ON locations;
CREATE POLICY "Locations can be updated by authenticated users"
  ON locations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add a view for active locations only (not deleted)
CREATE OR REPLACE VIEW active_locations
WITH (security_invoker=true) AS
SELECT * FROM locations WHERE deleted_at IS NULL;
