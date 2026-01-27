# Print Multiple Copies Feature

## Overview
Added a new feature to the Print Collections page that allows users to specify how many copies of each sticker/item they want to print, with duplicates appearing per page.

## What's New

### 1. Copy Count Input
- Each selected item now has a **"Copies"** input field (1-99 range)
- Appears below the checkbox when an item is selected
- Default value is 1 copy per item

### 2. Smart Copy Counter
The Print/Download buttons now show:
- **Total copies** to be printed/downloaded
- **Number of unique items** (if different from total)
- Example: "Print Stickers (15 from 5)" means 15 total stickers from 5 unique items

### 3. Duplicate Generation
When printing or downloading:
- Items are duplicated based on their copy count
- Duplicates are distributed across pages (10 stickers per page in print mode)
- All copies maintain the same quality and data

## Usage Example

### Scenario: Printing Multiple Department Stickers

1. **Select Items**: Check 3 different computers
   - Computer A: Set copies to 5
   - Computer B: Set copies to 3
   - Computer C: Set copies to 2

2. **Click Print**: Button shows "Print Stickers (10 from 3)"
   - Total: 10 stickers will be printed
   - From: 3 unique items

3. **Result**: Print dialog opens with 1 page containing all 10 stickers
   - 5 copies of Computer A
   - 3 copies of Computer B
   - 2 copies of Computer C

## Technical Implementation

### State Management
```typescript
// Track copy count for each item
const [itemCopies, setItemCopies] = useState<Map<string, number>>(new Map());
```

### Item Duplication Logic
```typescript
const getSelectedItems = (): Item[] => {
    const items: Item[] = [];
    collectionItems.forEach(item => {
        if (selectedItems.has(item.id)) {
            const copies = itemCopies.get(item.id) || 1;
            // Duplicate the item 'copies' times
            for (let i = 0; i < copies; i++) {
                items.push(item);
            }
        }
    });
    return items;
};
```

### Total Copies Calculation
```typescript
const getTotalCopies = (): number => {
    let total = 0;
    selectedItems.forEach(itemId => {
        total += itemCopies.get(itemId) || 1;
    });
    return total;
};
```

## UI Changes

### Before
- Simple checkbox selection
- Button: "Print Stickers (5)"

### After
- Checkbox + Copies input (when selected)
- Button: "Print Stickers (15 from 5)"
- Shows both total copies and unique item count

## Benefits

1. **Efficiency**: Print multiple labels for the same item without re-selecting
2. **Batch Processing**: Handle large print jobs with varying quantities
3. **Flexibility**: Different copy counts per item in the same print job
4. **User-Friendly**: Clear indication of total output before printing
5. **Space-Saving**: Optimal page layout with mixed quantities

## Validation

- **Minimum**: 1 copy per item
- **Maximum**: 99 copies per item
- **Auto-correction**: Invalid inputs default to 1
- **Visual Feedback**: Copy count only shown for selected items
