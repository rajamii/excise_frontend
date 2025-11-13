# Multiple Allocated Ranges Fix

## Problem
When a single roll (e.g., "TEST1") has multiple non-contiguous allocated ranges:
- Allocated: `000100 → 000199` and `000250 → 000499`
- User uses: `100 → 149` (issued) and `150 → 199` (wastage)
- **Expected**: Available should be `000250 → 000499` (250 units)
- **Actual**: Available shows `000300 → 000300` (1 unit)

## Root Cause
The system is storing only ONE serial range per roll (`fromSerial` and `toSerial`), but a single roll can have MULTIPLE allocated ranges. When calculating available serials, the system only knows about the first range (000100-000199) and doesn't know about the second range (000250-000499).

## Solution

### 1. Store Multiple Allocated Ranges Per Roll
Update the data structure to support multiple ranges:

```typescript
interface HologramRoll {
  id: number;
  cartoonNumber: string;
  type: 'LOCAL' | 'EXPORT' | 'DEFENCE';
  fromSerial: string;  // Keep for backward compatibility (first range start)
  toSerial: string;    // Keep for backward compatibility (last range end)
  allocatedRanges: Array<{  // NEW: Store all allocated ranges
    fromSerial: string;
    toSerial: string;
    count: number;
  }>;
  totalCount: number;
  availableCount: number;
  usedCount: number;
  damagedCount: number;
  status: 'AVAILABLE' | 'IN_USE' | 'COMPLETED' | 'DAMAGED';
  receivedDate: string;
}
```

### 2. Update Hologram Allocation to Store Multiple Ranges
When approving a hologram request with multiple ranges, store them properly:

**File**: `officerinchargehologramreq.component.ts`

```typescript
approveRequest(request: HologramRequest): void {
  // ... existing code ...
  
  // Store allocated ranges for this roll
  const allocatedRanges = this.allocationResult.allocations.map(alloc => ({
    fromSerial: alloc.fromSerial,
    toSerial: alloc.toSerial,
    count: alloc.quantity
  }));
  
  // Save to hologram allocation data
  const allocationData = {
    referenceNo: request.referenceNo,
    hologramType: request.hologramType,
    requestedQuantity: request.requestedQuantity,
    approvedQuantity: this.approvedQuantity,
    allocatedCartoons: this.allocationResult.allocations.map(alloc => ({
      cartoonNumber: alloc.cartoonNumber,
      allocatedRanges: [{  // Store as array
        fromSerial: alloc.fromSerial,
        toSerial: alloc.toSerial,
        count: alloc.quantity
      }]
    })),
    approvalDate: new Date().toISOString(),
    approvedBy: this.currentOfficer.name
  };
  
  localStorage.setItem(`hologramAllocation_${request.referenceNo}`, JSON.stringify(allocationData));
}
```

### 3. Update Roll Data to Include Allocated Ranges
When creating rolls in `hologramdetails.component.ts`:

```typescript
addToHologramOverviewRolls(record: HologramRecord) {
  // ... existing code ...
  
  // Get allocated ranges from allocation data
  const allocationData = JSON.parse(localStorage.getItem(`hologramAllocation_${record.ourRefNo}`) || '{}');
  const allocatedRanges = allocationData.allocatedCartoons?.find(
    (c: any) => c.cartoonNumber === record.cartoonNumber
  )?.allocatedRanges || [];
  
  // If no allocated ranges found, create one from fromSerial/toSerial
  if (allocatedRanges.length === 0) {
    allocatedRanges.push({
      fromSerial: record.fromSerial,
      toSerial: record.toSerial,
      count: record.numberOfHolograms
    });
  }
  
  const newRoll = {
    id: uniqueId,
    cartoonNumber: record.cartoonNumber,
    type: hologramType,
    fromSerial: allocatedRanges[0].fromSerial,  // First range start
    toSerial: allocatedRanges[allocatedRanges.length - 1].toSerial,  // Last range end
    allocatedRanges: allocatedRanges,  // NEW: Store all ranges
    totalCount: record.numberOfHolograms,
    availableCount: record.numberOfHolograms,
    usedCount: 0,
    damagedCount: 0,
    status: 'AVAILABLE',
    receivedDate: record.arrivedDate || new Date().toISOString().split('T')[0]
  };
  
  // Save to all three data sources
  // ...
}
```

### 4. Update Available Range Calculation
Modify `generateRealSerialRanges` in `hologramoveriew.component.ts`:

```typescript
generateRealSerialRanges(...): SerialRange[] {
  // ... existing code for used/damaged ranges ...
  
  // Calculate available ranges from ALL allocated ranges
  if (availableCount > 0) {
    // Get allocated ranges from roll data
    const serialData = JSON.parse(localStorage.getItem('hologramOverviewSerialData') || '[]');
    const serialRoll = serialData.find((roll: any) =>
      roll.rollNumber === cartoonNumber &&
      roll.hologramType === hologramType
    );
    
    const allocatedRanges = serialRoll?.allocatedRanges || [];
    
    // If no allocated ranges, fall back to fromSerial/toSerial
    if (allocatedRanges.length === 0 && serialRoll) {
      allocatedRanges.push({
        fromSerial: serialRoll.fromSerial,
        toSerial: serialRoll.toSerial,
        count: serialRoll.totalCount
      });
    }
    
    // Process EACH allocated range separately
    allocatedRanges.forEach((allocRange: any) => {
      const prefix = allocRange.fromSerial.replace(/\d+/, '');
      const rangeStart = parseInt(allocRange.fromSerial.match(/\d+/)?.[0] || '0');
      const rangeEnd = parseInt(allocRange.toSerial.match(/\d+/)?.[0] || '0');
      
      // Find gaps within THIS allocated range
      let gapStart: number | null = null;
      
      for (let i = rangeStart; i <= rangeEnd; i++) {
        if (!usedSerials.has(i)) {
          if (gapStart === null) {
            gapStart = i;
          }
        } else {
          if (gapStart !== null) {
            ranges.push({
              fromSerial: prefix + String(gapStart).padStart(6, '0'),
              toSerial: prefix + String(i - 1).padStart(6, '0'),
              count: i - gapStart,
              status: 'AVAILABLE',
              description: 'Ready for production use'
            });
            gapStart = null;
          }
        }
      }
      
      // Handle last gap in this range
      if (gapStart !== null) {
        ranges.push({
          fromSerial: prefix + String(gapStart).padStart(6, '0'),
          toSerial: prefix + String(rangeEnd).padStart(6, '0'),
          count: rangeEnd - gapStart + 1,
          status: 'AVAILABLE',
          description: 'Ready for production use'
        });
      }
    });
  }
  
  // ... rest of code ...
}
```

### 5. Display All Allocated Ranges in Roll Details Modal
Update the Roll Details modal to show all allocated ranges:

```html
<div class="allocated-ranges-section">
  <h6>Allocated Ranges</h6>
  <div class="ranges-list">
    @for (range of selectedRoll.allocatedRanges; track range.fromSerial) {
      <span class="badge bg-info me-2">
        {{ range.fromSerial }} → {{ range.toSerial }}
      </span>
    }
  </div>
</div>
```

## Testing
1. Create a roll with multiple allocated ranges (e.g., 000100-000199 and 000250-000499)
2. Use some serials from the first range (e.g., 100-149 issued, 150-199 wastage)
3. Check Serial Numbers Details modal - should show:
   - Available: 000250 → 000499 (250 units)
   - Used: 100 → 149 (50 units)
   - Damaged: 150 → 199 (50 units)

## Benefits
- ✅ Correctly handles rolls with multiple non-contiguous serial ranges
- ✅ Shows all available ranges in Serial Numbers Details modal
- ✅ Accurate available count aggregation
- ✅ Backward compatible with existing single-range rolls
