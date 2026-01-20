-- Inventory Management System - Seed Data
-- Run this AFTER schema.sql in your Supabase SQL Editor

-- Insert default units
INSERT INTO units (name) VALUES
  ('Pieces'),
  ('Boxes'),
  ('Sets'),
  ('Liters'),
  ('Kilograms'),
  ('Meters'),
  ('Rolls'),
  ('Packs'),
  ('Units'),
  ('Pairs')
ON CONFLICT (name) DO NOTHING;

-- Insert sample items for testing with all new fields
INSERT INTO items (
  unique_id, 
  name, 
  description,
  serial_number,
  acquisition_date,
  acquisition_cost,
  location,
  end_user,
  status, 
  remarks,
  itr_or_no,
  property_number,
  quantity, 
  unit, 
  owner
) VALUES
  (
    'SPHV-2019-06-01-0012-RAD-01-02',
    'Epson Printer',
    'Epson l3210 printer',
    '222-19-01-03-12',
    '2019-06-03',
    5500.00,
    'RAD',
    'JUDEL BAGISAN',
    'In Stock',
    'old item but usable',
    'n/a',
    'SPHV-2019-06-01-0012-RAD-01-02',
    1,
    'Units',
    'IT Department'
  ),
  (
    'SPHV-2020-03-15-0025-AFU-02-01',
    'Dell Laptop',
    'Dell Latitude 5520 Business Laptop',
    '5CG02738XJ',
    '2020-03-15',
    45000.00,
    'AFU',
    'MARIA SANTOS',
    'In Stock',
    'Assigned for field work',
    'ITR-2020-0045',
    'SPHV-2020-03-15-0025-AFU-02-01',
    1,
    'Units',
    'Admin Department'
  ),
  (
    'SPHV-2021-08-22-0033-PDO-03-05',
    'Office Chair',
    'Ergonomic mesh office chair with lumbar support',
    'CHAIR-2021-0033',
    '2021-08-22',
    8500.00,
    'PDO',
    'JUAN DELA CRUZ',
    'In Stock',
    'Good condition',
    'ITR-2021-0112',
    'SPHV-2021-08-22-0033-PDO-03-05',
    5,
    'Pieces',
    'Procurement'
  ),
  (
    'SPHV-2018-11-10-0008-RAD-01-01',
    'Canon Scanner',
    'Canon LiDE 400 Flatbed Scanner',
    'BHSC12345',
    '2018-11-10',
    12000.00,
    'RAD',
    'PEDRO REYES',
    'Maintenance',
    'Scheduled for repair',
    'ITR-2018-0089',
    'SPHV-2018-11-10-0008-RAD-01-01',
    1,
    'Units',
    'Records Division'
  ),
  (
    'SPHV-2017-05-20-0002-AFU-02-03',
    'Air Conditioner',
    'Samsung 2HP Split Type Inverter AC',
    'SAM-AC-2017-002',
    '2017-05-20',
    35000.00,
    'AFU',
    'MAINTENANCE UNIT',
    'Disposed',
    'Beyond economical repair',
    'ITR-2017-0023',
    'SPHV-2017-05-20-0002-AFU-02-03',
    1,
    'Units',
    'Facilities'
  )
ON CONFLICT (unique_id) DO NOTHING;

-- NOTE: To create an admin user, use Supabase Authentication
-- Go to Authentication > Users > Create User in your Supabase Dashboard
-- Or use the Supabase Auth API to create a user programmatically
