# New Features Implementation Guide

This document describes the three major features that have been added to the OWWA Inventory Management System.

## Feature 1: Password Visibility Toggle in Login

### Description
Added an eye icon button to the login page password field that allows users to toggle between showing and hiding their password as they type.

### Implementation Details
- **File Modified**: `src/app/login/page.tsx`
- **State Added**: `showPassword` boolean state
- **UI Changes**: 
  - Password input field now has relative positioning
  - Eye icon button positioned absolutely on the right side of the input
  - Input type toggles between "password" and "text"

### Components Added
- `EyeIcon`: Shows when password is hidden
- `EyeOffIcon`: Shows when password is visible

### Usage
Users can click the eye icon to:
- View their password while typing (helpful for long/complex passwords)
- Hide the password again for security

---

## Feature 2: Cancel Button During Bulk Download

### Description
Added a cancel button that appears during the bulk sticker download process, allowing users to abort the operation if needed.

### Implementation Details
- **File Modified**: `src/components/BulkStickerGenerator.tsx`
- **State Added**: `isCancelled` boolean state
- **Logic Changes**:
  - Download loop now checks `isCancelled` flag on each iteration
  - If cancelled, the process stops immediately and closes the modal

### UI Changes
- Red "Cancel Download" button appears during processing
- Replaces the need to wait for entire download to complete
- Immediately stops generation and closes the modal

### Usage
When bulk downloading stickers:
1. User starts download process
2. Progress bar shows generation status
3. User can click "Cancel Download" at any time
4. Process stops and modal closes

---

## Feature 3: Archive System with 30-Day Auto-Deletion

### Description
Complete archive system that moves deleted items to a separate archive table instead of permanently deleting them. Archived items can be restored within 30 days, after which they are automatically deleted.

### Implementation Components

#### 1. Database Schema (`supabase/archive-migration.sql`)

**New Table**: `archived_items`
- Mirrors the structure of the `items` table
- Additional fields:
  - `archived_at`: Timestamp when item was archived
  - `archived_by`: UUID of user who archived the item
  - `auto_delete_at`: Calculated as archived_at + 30 days

**Database Functions**:

```sql
-- Archive an item (soft delete)
archive_item(item_id UUID, user_id UUID) RETURNS BOOLEAN

-- Restore an archived item
restore_archived_item(item_id UUID) RETURNS BOOLEAN

-- Clean up expired items (called by cron/scheduler)
cleanup_expired_archived_items() RETURNS INTEGER
```

**Security**:
- Row Level Security (RLS) enabled
- Policies allow authenticated users to view, insert, and delete archived items
- Functions use SECURITY DEFINER for proper permissions

#### 2. Updated Delete Operations

**Files Modified**:
- `src/app/dashboard/page.tsx`
  - `handleDeleteItem()`: Now calls `archive_item` RPC function
  - `handleBulkDeleteWithPassword()`: Archives items instead of deleting
  
- `src/app/dashboard/print-collections/page.tsx`
  - `handleDeleteItem()`: Now calls `archive_item` RPC function

**User Experience**:
- Success messages changed from "deleted" to "archived"
- Items disappear from main inventory but are recoverable
- No visible change in UI flow, just better data safety

#### 3. Archive Management UI (`src/app/dashboard/archived/page.tsx`)

**Features**:
- View all archived items
- Search functionality
- Statistics dashboard showing:
  - Total archived items
  - Items expiring soon (≤7 days)
  - Items expiring today
- Color-coded countdown indicators:
  - Red: 0-3 days remaining
  - Amber: 4-7 days remaining
  - Gray: 8+ days remaining

**Actions Per Item**:
1. **Restore**: Moves item back to active inventory
2. **Delete Permanently**: Immediately deletes from archive (requires confirmation)

**Navigation**:
- New "Archived Items" button in main dashboard (amber colored)
- Located next to "Export to Excel" button

### Setup Instructions

1. **Run the Migration**:
   ```bash
   # In Supabase SQL Editor, run:
   supabase/archive-migration.sql
   ```

2. **Set Up Automatic Cleanup (Optional)**:
   
   Option A - Using Supabase Edge Functions:
   ```typescript
   // Create a scheduled edge function
   Deno.cron("cleanup-archives", "0 2 * * *", async () => {
     const { data } = await supabase.rpc('cleanup_expired_archived_items');
     console.log(`Cleaned up ${data} expired items`);
   });
   ```

   Option B - Using pg_cron Extension:
   ```sql
   SELECT cron.schedule(
       'cleanup-archived-items',
       '0 2 * * *', -- Every day at 2 AM
       'SELECT cleanup_expired_archived_items();'
   );
   ```

### Data Flow

#### Archiving Process
```
User clicks "Delete" 
  → Confirm password (for bulk delete)
  → Call archive_item(item_id, user_id)
  → Copy item to archived_items table
  → Set auto_delete_at = NOW() + 30 days
  → Delete from items table
  → Show "Item archived" message
```

#### Restoration Process
```
User clicks "Restore" in Archive page
  → Call restore_archived_item(item_id)
  → Copy item back to items table
  → Delete from archived_items table
  → Refresh inventory
  → Show "Item restored" message
```

#### Auto-Deletion Process
```
Cron job runs daily at 2 AM
  → Call cleanup_expired_archived_items()
  → DELETE WHERE auto_delete_at <= NOW()
  → Return count of deleted items
  → Log result
```

### Benefits

1. **Data Safety**: Protects against accidental deletions
2. **Recovery Window**: 30-day grace period for restoration
3. **Compliance**: Maintains audit trail of deleted items
4. **Clean Database**: Automatic cleanup prevents archive bloat
5. **User-Friendly**: Clear visual indicators of deletion countdown
6. **Flexible**: Items can be permanently deleted manually if needed

### Future Enhancements

Potential improvements for the archive system:
- Extend auto-deletion period (configurable)
- Export archived items before permanent deletion
- Bulk restore functionality
- Archive activity logs
- Email notifications for expiring items
- Archive search filters (by date, category, etc.)

---

## Testing Checklist

### Password Visibility Toggle
- [ ] Eye icon appears in password field
- [ ] Clicking shows password in plain text
- [ ] Clicking again hides password
- [ ] Works on both desktop and mobile
- [ ] Doesn't interfere with password managers

### Cancel Button in Bulk Download
- [ ] Button appears during download processing
- [ ] Clicking stops the download immediately
- [ ] Modal closes after cancellation
- [ ] No partial ZIP file is downloaded
- [ ] Can start new download after cancelling

### Archive System
- [ ] Deleting item moves it to archive (not permanent delete)
- [ ] Archive page shows all archived items
- [ ] Countdown timer displays correctly
- [ ] Color coding works (red/amber/gray)
- [ ] Restore button moves item back to inventory
- [ ] Permanent delete removes from archive
- [ ] Items disappear after 30 days (if auto-cleanup is set up)
- [ ] Search works in archive page
- [ ] Statistics are accurate

---

## Migration Notes

### Before Deployment
1. Backup your database
2. Test archive migration on staging environment
3. Verify all RPC functions are created successfully
4. Check RLS policies are active

### After Deployment
1. Monitor archived_items table size
2. Verify auto-cleanup is running (check logs)
3. Inform users about the new archive feature
4. Update user documentation/training materials

### Rollback Plan
If issues occur:
```sql
-- Stop using archive functions, revert to direct deletes
-- Can be done without data loss
DROP FUNCTION IF EXISTS archive_item CASCADE;
DROP FUNCTION IF EXISTS restore_archived_item CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_archived_items CASCADE;
-- Keep archived_items table for manual recovery if needed
```

---

## Support

For questions or issues with these features:
1. Check the error logs in Supabase dashboard
2. Verify RPC functions are properly created
3. Ensure authentication is working correctly
4. Check browser console for client-side errors
