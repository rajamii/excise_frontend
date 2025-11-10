# Rolls Assigned Display Fix

## Problem
The "ROLLS ASSIGNED" dropdown in Daily Register Entries was showing incorrect roll names:
- Showing: "1,000D (wool)" and "11,000D (wool)" 
- Should show: "t1" and "t2" (the actual cartoon numbers from Hologram Allocation)

The Hologram Allocation dialog correctly shows:
- **Cartoon t1**: 500 units
- **Cartoon t2**: 100 units
- **Total**: 600 units

But the Daily Register was not reading this data correctly.

## Root Cause
The `getAvailableRollsForEntry()` function was not reading from the Hologram Allocation data. It was trying to find rolls in the wrong localStorage keys and with the wrong data structure.

## Solution

### 1. Updated `getAvailableRollsForEntry()` Function
Now reads directly from Hologram Allocation data:

```typescript
getAvailableRollsForEntry(entry: HologramDailyEntry): any[] {
  // First, try to get from hologram allocation data (source of truth)
  const allocationData = this.getHologramAllocationForEntry(entry);
  
  if (allocationData && allocationData.allocatedCartoons) {
    // Return the actual allocated cartoons with their quantities
    return allocationData.allocatedCartoons.map((cartoon: any) => ({
      cartoonNumber: cartoon.cartoonNumber,
      availableCount: cartoon.quantity,
      serialRange: cartoon.serialRange || `${cartoon.fromSerial} - ${cartoon.toSerial}`,
      remainingInCartoon: cartoon.remainingInCartoon || cartoon.quantity,
      totalCount: cartoon.quantity,
      fromSerial: cartoon.fromSerial,
      toSerial: cartoon.toSerial
    }));
  }
  
  // Fallback logic...
}
```

### 2. Enhanced `getHologramAllocationForEntry()` Function
Now searches multiple localStorage keys and normalizes the data:

```typescript
getHologramAllocationForEntry(entry: HologramDailyEntry): any {
  // Try multiple localStorage keys where allocation data might be stored
  const possibleKeys = [
    'hologramAllocations',
    'hologramRequests', 
    'hologramApplications',
    'approvedHologramEntries'
  ];
  
  for (const key of possibleKeys) {
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    
    // Find allocation matching this reference number
    const allocation = data.find((a: any) => 
      a.referenceNo === referenceNo || 
      a.ourRefNo === referenceNo ||
      a.id === referenceNo
    );
    
    if (allocation) {
      // Normalize the data structure
      return {
        referenceNo: allocation.referenceNo || allocation.ourRefNo || allocation.id,
        totalAllocated: allocation.totalAllocated || allocation.requestedQuantity || allocation.numberOfHolograms || 0,
        allocatedCartoons: allocation.allocatedCartoons || allocation.cartoons || []
      };
    }
  }
  
  return null;
}
```

### 3. Added Debug Function
```typescript
debugAllocationData(entry: HologramDailyEntry): void {
  // Logs all allocation data for troubleshooting
  console.log('Reference No:', referenceNo);
  console.log('Allocation Data:', allocationData);
  console.log('Assigned Rolls:', assignedRolls);
  console.log('Available Rolls:', availableRolls);
  console.log('Total Hologram Qty:', totalQty);
}
```

## Expected Behavior

### Before Fix
```
ROLLS ASSIGNED dropdown:
- 1,000D (wool) (500 avail)  ❌ Wrong
- 11,000D (wool) (100 avail) ❌ Wrong
```

### After Fix
```
ROLLS ASSIGNED dropdown:
- t1 (500 avail)  ✅ Correct
- t2 (100 avail)  ✅ Correct

HOLOGRAM QTY: 600  ✅ Correct
```

## Data Flow

```
Hologram Allocation Dialog
  ↓
  Cartoon t1: 500 units
  Cartoon t2: 100 units
  Total: 600 units
  ↓
localStorage (hologramAllocations or hologramRequests)
  ↓
getHologramAllocationForEntry()
  ↓
  {
    referenceNo: "HRQ/251110/749",
    totalAllocated: 600,
    allocatedCartoons: [
      { cartoonNumber: "t1", quantity: 500, ... },
      { cartoonNumber: "t2", quantity: 100, ... }
    ]
  }
  ↓
getAvailableRollsForEntry()
  ↓
  [
    { cartoonNumber: "t1", availableCount: 500, ... },
    { cartoonNumber: "t2", availableCount: 100, ... }
  ]
  ↓
Daily Register Dropdown
  ↓
  "t1 (500 avail)"  ✅
  "t2 (100 avail)"  ✅
```

## Troubleshooting

If rolls are still showing incorrectly:

1. **Check localStorage data structure**
   - Open browser console
   - Run: `localStorage.getItem('hologramAllocations')`
   - Verify the data has `allocatedCartoons` array

2. **Use debug function**
   - Call `debugAllocationData(entry)` from console
   - Check what data is being found

3. **Verify reference number**
   - Make sure the entry has a valid `referenceNo` field
   - Check if it matches the allocation data

4. **Check allocation data format**
   - Allocation should have:
     - `referenceNo` or `ourRefNo`
     - `totalAllocated` or `requestedQuantity`
     - `allocatedCartoons` or `cartoons` array
     - Each cartoon should have: `cartoonNumber`, `quantity`

## Key Changes Summary

1. ✅ `getAvailableRollsForEntry()` - Now reads from allocation data first
2. ✅ `getHologramAllocationForEntry()` - Searches multiple keys and normalizes data
3. ✅ `getTotalHologramQty()` - Reads total from allocation data
4. ✅ `getAssignedRolls()` - Reads roll names from allocation data
5. ✅ Added `debugAllocationData()` - For troubleshooting

## Dynamic Updates

The system is now **fully dynamic** - hologram quantities and roll assignments update automatically:

### Automatic Refresh Mechanisms
1. **Storage Event Listener** - Detects changes in `hologramAllocations`, `hologramRequests`, `hologramApplications`
2. **Polling (30 seconds)** - Checks for updates every 30 seconds
3. **No Caching** - All values fetched fresh from localStorage on every render

### Manual Refresh
Click **"Refresh Allocation Data"** button to:
- Force immediate refresh of all quantities
- Update all roll assignments
- See summary of allocated holograms

### Example Dynamic Behavior
```
Initial State:
- HOLOGRAM QTY: 600
- ROLLS: t1 (500), t2 (100)

User changes allocation to 800 (t1=600, t2=200)
↓
System automatically detects change
↓
Display updates within 30 seconds (or immediately with manual refresh)
↓
New State:
- HOLOGRAM QTY: 800 ✅
- ROLLS: t1 (600), t2 (200) ✅
```

## Testing Checklist

- [ ] Open Daily Register Entries
- [ ] Check HOLOGRAM QTY shows 600
- [ ] Check ROLLS ASSIGNED dropdown shows "t1" and "t2"
- [ ] Verify quantities: t1 (500 avail), t2 (100 avail)
- [ ] Open Hologram Allocation dialog
- [ ] Verify it shows same data: t1=500, t2=100, Total=600
- [ ] **Change allocation** (e.g., to 800 total)
- [ ] Click "Refresh Allocation Data" button
- [ ] Verify display updates to show new values
- [ ] Test debug function if issues persist
