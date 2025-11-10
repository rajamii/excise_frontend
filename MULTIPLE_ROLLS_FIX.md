# Multiple Rolls Display Fix - Final Solution

## Problem
The ROLLS ASSIGNED dropdown was only showing 1 roll (t1) instead of 2 rolls (t1 and t2), even though the Hologram Allocation popup clearly shows both:
- **Cartoon t1**: 500 units
- **Cartoon t2**: 100 units  
- **Total**: 600 units

## Root Cause
The allocation data might be stored in two different ways:
1. **Single object** with an array of cartoons
2. **Multiple objects** (one per cartoon) that need to be combined

The previous code only handled case #1, so when data was stored as separate entries for t1 and t2, it would only find the first one.

## Solution

### Updated `getHologramAllocationForEntry()` Function

Changed from finding a single allocation to finding ALL allocations with the same reference number:

```typescript
// OLD CODE (only found first match)
const allocation = data.find((a: any) => 
  a.referenceNo === referenceNo
);

// NEW CODE (finds all matches)
const matchingAllocations = data.filter((a: any) => 
  a.referenceNo === referenceNo || 
  a.ourRefNo === referenceNo ||
  a.id === referenceNo
);
```

### Combining Multiple Allocations

If multiple allocations are found (one per cartoon), combine them:

```typescript
if (matchingAllocations.length > 1) {
  // Multiple allocations - combine them
  const cartoons = matchingAllocations.map((alloc: any) => ({
    cartoonNumber: alloc.cartoonNumber || alloc.cartoon || '',
    quantity: alloc.quantity || alloc.allocatedQuantity || 0,
    fromSerial: alloc.fromSerial || '',
    toSerial: alloc.toSerial || '',
    serialRange: alloc.serialRange || `${alloc.fromSerial} - ${alloc.toSerial}`,
    remainingInCartoon: alloc.remainingInCartoon || 0
  }));
  
  const totalQty = cartoons.reduce((sum, c) => sum + c.quantity, 0);
  
  normalized = {
    referenceNo: referenceNo,
    totalAllocated: totalQty, // 500 + 100 = 600
    allocatedCartoons: cartoons // [t1, t2]
  };
}
```

## Data Structure Examples

### Case 1: Single Object with Array (Ideal)
```javascript
{
  referenceNo: "HRQ/251110/057",
  totalAllocated: 600,
  allocatedCartoons: [
    { cartoonNumber: "t1", quantity: 500, serialRange: "000001 - 000500" },
    { cartoonNumber: "t2", quantity: 100, serialRange: "000001 - 000100" }
  ]
}
```

### Case 2: Multiple Objects (One Per Cartoon)
```javascript
[
  {
    referenceNo: "HRQ/251110/057",
    cartoonNumber: "t1",
    quantity: 500,
    fromSerial: "000001",
    toSerial: "000500",
    serialRange: "000001 - 000500"
  },
  {
    referenceNo: "HRQ/251110/057",
    cartoonNumber: "t2",
    quantity: 100,
    fromSerial: "000001",
    toSerial: "000100",
    serialRange: "000001 - 000100"
  }
]
```

Both cases now work correctly!

## Expected Behavior

### Before Fix
```
ROLLS ASSIGNED dropdown:
- Select Roll...
- t1 (500 avail) ✅
(Missing t2) ❌
```

### After Fix
```
ROLLS ASSIGNED dropdown:
- Select Roll...
- t1 (500 avail) ✅
- t2 (100 avail) ✅

HOLOGRAM QTY: 600 ✅
```

## Console Logs

When the page loads, you'll see:
```
🔍 Looking for allocation data: { referenceNo: "HRQ/251110/057", cartoonNumber: undefined }
📦 Checking hologramAllocations: X items
🔍 Found 2 matching allocations for reference: HRQ/251110/057
✅ Found allocations in hologramAllocations: [...]
🔄 Combining multiple allocations
🔍 Raw allocation data: [{ cartoonNumber: "t1", ... }, { cartoonNumber: "t2", ... }]
📋 Initial normalized: { referenceNo: "HRQ/251110/057", totalAllocated: 600, allocatedCartoons: [...] }
✅ Final normalized allocation: { ... }
📦 Allocated cartoons: [{ cartoonNumber: "t1", quantity: 500 }, { cartoonNumber: "t2", quantity: 100 }]
```

## Testing

1. **Open Daily Register**
2. **Check browser console** (F12)
3. **Look for the logs** showing how many allocations were found
4. **Verify dropdown shows both rolls**:
   - t1 (500 avail) ✅
   - t2 (100 avail) ✅
5. **Check HOLOGRAM QTY** shows 600 ✅

## Troubleshooting

If only one roll still appears:

1. **Check console logs** - How many matching allocations were found?
   ```
   🔍 Found X matching allocations for reference: ...
   ```

2. **Check localStorage data**:
   ```javascript
   // In browser console
   const data = JSON.parse(localStorage.getItem('hologramAllocations') || '[]');
   const matches = data.filter(a => a.referenceNo === 'HRQ/251110/057');
   console.log('Matching allocations:', matches);
   ```

3. **Verify reference numbers match**:
   - Entry reference: `HRQ/251110/057`
   - Allocation reference: Should be the same

4. **Check data structure**:
   - Does each allocation have `cartoonNumber` field?
   - Does each allocation have `quantity` field?

## Key Changes

1. ✅ Changed from `find()` to `filter()` to get ALL matching allocations
2. ✅ Added logic to combine multiple allocations into one
3. ✅ Calculate total quantity by summing all cartoon quantities
4. ✅ Create allocatedCartoons array from multiple sources
5. ✅ Enhanced console logging to show exactly what's happening

## Summary

The system now handles both storage patterns:
- **Single allocation** with array of cartoons → Works ✅
- **Multiple allocations** (one per cartoon) → Now works ✅

Both t1 and t2 should now appear in the ROLLS ASSIGNED dropdown, with their correct quantities (500 and 100), totaling 600 holograms.
