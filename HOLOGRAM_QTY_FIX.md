# Hologram Quantity Display Fix

## Problem
The Daily Register Entries was showing incorrect hologram quantities (1000, 400) instead of the actual allocated quantity (600 = 500 from first roll + 100 from second roll).

## Root Cause
The system was trying to calculate hologram quantities by aggregating from individual roll entries, instead of reading directly from the **Hologram Allocation** data, which is the source of truth.

## Solution
Modified the `getTotalHologramQty()` function to:
1. **First** read from Hologram Allocation data (stored in `localStorage.hologramAllocations`)
2. Use the `totalAllocated` field which contains the correct sum (e.g., 600 = 500 + 100)
3. Fall back to entry's `utilizedQuantity` only if allocation data is not available

## Changes Made

### File: `hologram-daily-register.component.ts`

#### 1. Updated `getTotalHologramQty()` function (line ~1912)
```typescript
getTotalHologramQty(entry: HologramDailyEntry): number {
  // First, try to get from hologram allocation data (source of truth)
  const allocationData = this.getHologramAllocationForEntry(entry);
  if (allocationData && allocationData.totalAllocated > 0) {
    console.log('Using allocation data for hologram qty:', allocationData.totalAllocated);
    return allocationData.totalAllocated;
  }
  
  // For saved entries, use the stored utilizedQuantity
  if (entry.isFixed) {
    return entry.utilizedQuantity || 0;
  }

  // Fallback: use entry's utilizedQuantity or originalHologramQty
  return entry.utilizedQuantity || (entry as any).originalHologramQty || 0;
}
```

#### 2. Added `getHologramAllocationForEntry()` function
```typescript
getHologramAllocationForEntry(entry: HologramDailyEntry): any {
  try {
    const referenceNo = (entry as any).referenceNo;
    if (!referenceNo) return null;
    
    // Load hologram allocations from localStorage
    const allocations = JSON.parse(localStorage.getItem('hologramAllocations') || '[]');
    
    // Find allocation matching this reference number
    const allocation = allocations.find((a: any) => a.referenceNo === referenceNo);
    
    if (allocation) {
      console.log('Found allocation for', referenceNo, ':', allocation);
    }
    
    return allocation;
  } catch (error) {
    console.error('Error loading hologram allocation:', error);
    return null;
  }
}
```

#### 3. Updated `getAssignedRolls()` function (line ~1611)
Now reads from allocation data first, showing the actual rolls that were allocated:
```typescript
getAssignedRolls(entry: HologramDailyEntry): string[] {
  // First, try to get from hologram allocation data (source of truth)
  const allocationData = this.getHologramAllocationForEntry(entry);
  if (allocationData && allocationData.allocatedCartoons) {
    return allocationData.allocatedCartoons.map((c: any) => c.cartoonNumber);
  }
  
  // Fallback to locked rolls if allocation data not available
  const lockedRolls = (entry as any).lockedRolls || [];
  if (lockedRolls.length > 0) {
    return lockedRolls.map((r: any) => r.cartoonNumber);
  }
  
  // Last fallback: try to get from entry metadata
  // ... existing code ...
}
```

## Expected Behavior

### Before Fix
- Daily Register showed: 1000 holograms, 400 holograms (incorrect)
- Calculated from individual roll entries (wrong approach)

### After Fix
- Daily Register shows: 600 holograms (correct)
- Read directly from Hologram Allocation data
- Shows actual allocated quantity: 500 (roll 1) + 100 (roll 2) = 600 total

## Data Flow

```
Hologram Allocation (Source of Truth)
  ↓
  totalAllocated: 600
  allocatedCartoons: [
    { cartoonNumber: "1,000D (wool)", quantity: 500 },
    { cartoonNumber: "11,000D (wool)", quantity: 100 }
  ]
  ↓
Daily Register Entries
  ↓
  HOLOGRAM QTY column: 600 ✓
  ROLLS ASSIGNED column: Shows both rolls ✓
```

## Testing

1. Open Daily Register Entries
2. Check the "HOLOGRAM QTY" column
3. Verify it shows 600 (not 1000 or 400)
4. Check "ROLLS ASSIGNED" column shows both rolls (t1 and t2)
5. Verify dropdown shows: "t1 (500 avail)" and "t2 (100 avail)"
6. Open Hologram Allocation dialog
7. Verify "Total Allocated: 600" matches the Daily Register

## Debug Function

Added `debugAllocationData(entry)` function to help troubleshoot allocation data issues.
This function logs:
- Reference number
- Allocation data structure
- Assigned rolls
- Available rolls  
- Total hologram quantity

Call this from browser console or add a debug button to test.

## Key Principle

**Always read from Hologram Allocation data as the source of truth.**
- Hologram Allocation knows exactly how many holograms were allocated from which rolls
- Daily Register should display this data, not try to recalculate it
- This ensures consistency across the entire system

## Dynamic Updates

The system now updates hologram quantities **dynamically**:

### Automatic Updates
1. **Storage Event Listener** - Detects when allocation data changes in localStorage
2. **Polling (30 seconds)** - Checks for updates every 30 seconds
3. **No Caching** - Values are fetched fresh from localStorage on every render

### Manual Refresh
- **"Refresh Allocation Data"** button - Forces immediate refresh of all quantities
- Shows summary of entries with allocation data
- Updates all hologram quantities and roll assignments

### How It Works
```typescript
// Called on every render - NO CACHING
getTotalHologramQty(entry) {
  // Reads fresh from localStorage every time
  const allocationData = this.getHologramAllocationForEntry(entry);
  return allocationData.totalAllocated; // Always current value
}
```

This means:
- ✅ If allocation changes from 600 → 800, display updates automatically
- ✅ If rolls change from (t1, t2) → (t3, t4), dropdown updates automatically  
- ✅ No page refresh needed - data is always current
- ✅ Works across browser tabs (storage events)
