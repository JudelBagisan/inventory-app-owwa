-- Check current database status enum and values
-- Run this to verify your database configuration

-- 1. Check what enum types exist
SELECT 
    t.typname as enum_name,
    string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as enum_values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE 'item_status%'
GROUP BY t.typname
ORDER BY t.typname;

-- 2. Check the current column type for items.status
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'items' AND column_name = 'status';

-- 3. Check current status values in the items table
SELECT 
    status,
    COUNT(*) as count
FROM items
GROUP BY status
ORDER BY count DESC;

-- 4. Check for any items with null status
SELECT COUNT(*) as null_status_count
FROM items
WHERE status IS NULL;
