# Print Collections Feature - Setup Guide

## Overview
The Print Collections feature allows admins to organize inventory items into virtual folders (collections) for efficient batch printing and exporting. Think of it like a "Playlist" or "Shopping Cart" for inventory items.

## Database Migration

### Step 1: Run the SQL Migration
1. Open your Supabase Dashboard
2. Navigate to the SQL Editor
3. Run the migration file: `supabase/print-collections-migration.sql`

This will create:
- `print_collections` table - Stores collection metadata
- `collection_items` table - Junction table linking collections to items
- Proper indexes for performance
- Row Level Security (RLS) policies
- Auto-updating timestamps
- A `collection_summary` view for easy querying

### Step 2: Verify the Migration
Run this query to verify:
```sql
SELECT * FROM print_collections LIMIT 1;
SELECT * FROM collection_items LIMIT 1;
SELECT * FROM collection_summary LIMIT 1;
```

## Features Implemented

### 1. Collections Dashboard (`/dashboard/print-collections`)
- **Left Sidebar**: Lists all collections with item counts and last modified dates
- **Create Collections**: Click the + button to create new collections
- **Rename Collections**: Rename any collection you own
- **Delete Collections**: Remove collections (items remain in main inventory)
- **Main View**: Shows all items in the selected collection

### 2. Main Inventory Dashboard Integration
- **Checkboxes**: Select multiple items from the inventory
- **"Add to Collection" Button**: Appears in the bulk action toolbar when items are selected
- **Modal**: Choose existing collection or create a new one
- **Batch Operations**: Add multiple items at once

### 3. Collection Management
- **Add Items**: From main dashboard, select items and add to collections
- **Remove Items**: Remove items from collection (doesn't delete from inventory)
- **Search**: Search within a collection
- **Filter**: Filter by category within a collection
- **Select All**: Bulk select/deselect items in a collection

### 4. Batch Actions
- **Download All QR Codes**: Downloads a ZIP file with QR code PNGs for all items in the collection
- **Print All Labels**: Triggers browser print dialog for all collection items
- **Remove Selected**: Remove multiple items from collection at once

## Component Architecture

### New Components
1. **`AddToCollectionModal.tsx`**
   - Modal for adding items to collections
   - Toggle between existing collection or create new
   - Handles duplicate prevention
   - Success/error feedback

2. **`print-collections/page.tsx`**
   - Full collections management page
   - Sidebar with collections list
   - Main view with items grid
   - Search and filter functionality
   - Batch action buttons

### Modified Components
1. **`dashboard/page.tsx`**
   - Added "Add to Collection" button to bulk toolbar
   - Integrated AddToCollectionModal

2. **`NavBar.tsx`**
   - Added "Print Collections" navigation link (auth required)

3. **`lib/types.ts`**
   - Added PrintCollection, CollectionItem, CollectionSummary interfaces
   - Updated Database type with new tables

## Security & Permissions

### Row Level Security (RLS) Policies
- Users can only create collections
- Users can only update/delete their own collections
- Users can view all collections (for collaboration)
- Items can only be added/removed from collections by the creator

### Important Notes
- Deleting a collection DOES NOT delete items from the main inventory
- Items are linked via junction table (many-to-many relationship)
- Duplicate prevention at database level (composite primary key)

## Usage Flow

### Creating and Using Collections
1. **Login** as an admin user
2. **Navigate** to Dashboard
3. **Select items** using checkboxes
4. **Click** "Add to Collection" button
5. **Choose** existing collection or create new
6. **Navigate** to Print Collections page
7. **Select collection** from sidebar
8. **Use batch actions** (Download QR, Print, etc.)

### Managing Collections
- **Rename**: Click "Rename" button when viewing a collection
- **Delete**: Click "Delete Collection" button
- **Remove Items**: Select items and click "Remove Selected"

## Technical Details

### Database Schema
```sql
print_collections (
    id UUID PRIMARY KEY,
    name TEXT,
    created_by UUID → auth.users,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ (auto-updated)
)

collection_items (
    collection_id UUID → print_collections,
    item_id UUID → items,
    added_at TIMESTAMPTZ,
    PRIMARY KEY (collection_id, item_id)
)
```

### QR Code Download
- Uses `qrcode` library to generate QR codes
- Uses `jszip` to bundle multiple PNG files
- Each QR code contains: item ID, unique ID, and name
- Filename format: `{unique_id}_{name}.png`
- ZIP filename: `{collection_name}_QR_Codes.zip`

## Testing Checklist

- [ ] Run SQL migration successfully
- [ ] Create a new collection
- [ ] Rename a collection
- [ ] Delete a collection (verify items still exist in inventory)
- [ ] Add items to collection from dashboard
- [ ] Add items to new collection
- [ ] Remove items from collection
- [ ] Search within collection
- [ ] Filter by category
- [ ] Download all QR codes as ZIP
- [ ] Print all labels
- [ ] Verify RLS policies (non-creator cannot delete collection)

## Future Enhancements
- Share collections with other users
- Export collection to Excel/PDF
- Duplicate collections
- Collection templates
- Scheduled printing
- Print history tracking

## Troubleshooting

### "Collection not found" error
- Check if migration ran successfully
- Verify RLS policies are enabled
- Check user authentication

### QR download fails
- Verify `qrcode` and `jszip` packages are installed
- Check browser console for errors
- Try with smaller collections first

### Items not showing in collection
- Verify items exist in main inventory
- Check junction table: `SELECT * FROM collection_items`
- Refresh the page

## Support
For issues or questions, check:
1. Supabase dashboard for database errors
2. Browser console for client-side errors
3. Network tab for API request failures
