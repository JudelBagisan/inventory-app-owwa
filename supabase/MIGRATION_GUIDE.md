# Database Migration Guide - Status Update v3

## Problem
You're getting a 400 Bad Request error because the database schema still uses the old status values ('Usable', 'Unusable') but the application code now uses new values ('Serviceable', 'Unserviceable', 'Donated', 'For Disposal', 'Disposable').

## Solution
Run the migration script to update the database schema.

## Steps to Fix

### 1. Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor section

### 2. Run the Migration Script
Copy and paste the entire contents of `update-schema-v3.sql` into the SQL Editor and click "Run"

Alternatively, you can run it from the command line if you have Supabase CLI installed:
```bash
supabase db reset
```

### 3. Verify the Migration
After running the script, verify that:
- The `items` table has a `status` column with type `item_status_v3`
- Existing items have been migrated:
  - 'Usable' → 'Serviceable'
  - 'Unusable' → 'Unserviceable'
  - Other statuses remain unchanged

### 4. Test the Application
After the migration:
1. Refresh your application
2. Try creating a new item
3. Try editing an existing item's status
4. Verify all status options appear correctly

## New Status Values
The updated status enum includes:
- Brand New
- Good
- Serviceable (previously "Usable")
- Unserviceable (previously "Unusable")
- Repair Needed
- Donated (new)
- For Disposal (new)
- Disposable (new)

## Troubleshooting

### If you still get errors:
1. Check that the migration completed without errors
2. Verify the enum was created:
   ```sql
   SELECT enum_range(NULL::item_status_v3);
   ```
3. Check existing data:
   ```sql
   SELECT DISTINCT status FROM items;
   ```

### If you need to rollback:
The old enum types are not dropped automatically. If needed, you can manually drop `item_status_v3` and restore the previous column.
