# Multi-Roll Hologram Allocation System

## Overview
The system automatically handles situations where a single brand production requires holograms from multiple rolls. Everything is **auto-populated** - users don't need to manually figure out which rolls to use.

## How It Works

### Step 1: Officer Approves Request
When an officer approves a hologram request:

```
Request: 1,500 holograms for "Sikkim Supreme Whisky"

Available Inventory:
- Roll CTN001: 1,000 available (HG001001 - HG002000)
- Roll CTN002: 800 available (HG002001 - HG002800)
```

### Step 2: System Calculates Allocation (FIFO)
The system automatically allocates using First-In-First-Out:

```
Allocation Result:
✓ 1,000 from CTN001 (HG001001 - HG002000)
✓ 500 from CTN002 (HG002001 - HG002500)
```

### Step 3: Auto-Generated Daily Register Entries
The system creates **ONE entry per roll** with all information pre-filled:

#### Entry 1 (Auto-Generated)
```json
{
  "id": "AUTO_1730123456_0",
  "cartoonNumber": "CTN001",           ← Roll number auto-filled
  "referenceNo": "HRQ/2025/001",
  "brandDetails": {
    "brandName": "Sikkim Supreme Whisky"
  },
  "issuedEntries": [{
    "fromSerial": "HG001001",          ← Auto-filled from allocation
    "toSerial": "HG002000",            ← Auto-filled from allocation
    "quantity": 1000                   ← Auto-calculated
  }],
  "utilizedQuantity": 1000,            ← Pre-filled (user can adjust)
  "leftOverQuantity": 0,               ← User will update after production
  "wastageEntries": [],                ← User can add if needed
  "isFixed": false                     ← Editable until saved
}
```

#### Entry 2 (Auto-Generated)
```json
{
  "id": "AUTO_1730123456_1",
  "cartoonNumber": "CTN002",           ← Different roll number
  "referenceNo": "HRQ/2025/001",       ← Same request
  "brandDetails": {
    "brandName": "Sikkim Supreme Whisky"  ← Same brand
  },
  "issuedEntries": [{
    "fromSerial": "HG002001",          ← Auto-filled from allocation
    "toSerial": "HG002500",            ← Auto-filled from allocation
    "quantity": 500                    ← Auto-calculated
  }],
  "utilizedQuantity": 500,
  "leftOverQuantity": 0,
  "wastageEntries": [],
  "isFixed": false
}
```

### Step 4: User Views in Daily Register
The user sees **2 separate rows** in the daily register:

```
┌────┬──────────────┬─────────────────┬──────────┬──────────────┬──────────┬─────────┐
│ SL │ REFERENCE NO │ BRAND           │ CARTOON  │ ISSUED FROM  │ ISSUED TO│ QTY     │
├────┼──────────────┼─────────────────┼──────────┼──────────────┼──────────┼─────────┤
│ 1  │ HRQ/2025/001 │ Sikkim Supreme  │ CTN001   │ HG001001     │ HG002000 │ 1,000   │
│    │              │ Whisky          │          │ (pre-filled) │(pre-fill)│(auto)   │
├────┼──────────────┼─────────────────┼──────────┼──────────────┼──────────┼─────────┤
│ 2  │ HRQ/2025/001 │ Sikkim Supreme  │ CTN002   │ HG002001     │ HG002500 │ 500     │
│    │              │ Whisky          │          │ (pre-filled) │(pre-fill)│(auto)   │
└────┴──────────────┴─────────────────┴──────────┴──────────────┴──────────┴─────────┘
```

### Step 5: User Updates Utilization
The user only needs to update:
- **Utilized Quantity**: How many were actually used in production
- **Wastage** (if any): Add wastage entries if there was damage
- **Left Over**: Auto-calculated based on: `Issued - Utilized - Wastage`

## Key Features

### 1. **Automatic Roll Selection**
✅ System automatically selects which rolls to use (FIFO)
✅ No manual roll number entry needed
✅ Optimal allocation across multiple rolls

### 2. **Pre-Filled Serial Ranges**
✅ "From Serial" and "To Serial" are auto-populated
✅ User can see exactly which serials were allocated
✅ No need to remember or look up serial numbers

### 3. **Separate Tracking**
✅ Each roll gets its own daily register entry
✅ Clear visibility of which roll was used
✅ Accurate inventory tracking per roll

### 4. **Flexible Utilization**
✅ User can adjust utilized quantity per roll
✅ Can add multiple wastage ranges if needed
✅ Left over quantity auto-calculated

## Data Structure

### New Format (Current)
```typescript
interface HologramDailyEntry {
  id: string;
  cartoonNumber: string;              // ← Roll number
  referenceNo: string;                // ← Request reference
  
  // Multiple issued ranges support
  issuedEntries: [{
    id: string;
    fromSerial: string;               // ← Auto-filled
    toSerial: string;                 // ← Auto-filled
    quantity: number;                 // ← Auto-calculated
  }];
  
  // Multiple wastage ranges support
  wastageEntries: [{
    id: string;
    fromSerial: string;
    toSerial: string;
    quantity: number;
    damageReason: string;
  }];
  
  utilizedQuantity: number;           // ← User updates
  leftOverQuantity: number;           // ← Auto-calculated
  isFixed: boolean;                   // ← false until saved
}
```

## User Workflow

### For Single Roll Usage
```
1. Officer approves request
2. System creates 1 entry with pre-filled data
3. User sees 1 row in daily register
4. User updates utilization and saves
```

### For Multiple Roll Usage
```
1. Officer approves request
2. System creates N entries (one per roll) with pre-filled data
3. User sees N rows in daily register (same brand, different rolls)
4. User updates utilization for each roll separately
5. User saves each entry when done
```

## Example Scenarios

### Scenario 1: Request Fits in One Roll
```
Request: 500 holograms
Available: Roll CTN001 has 1,000 available

Result:
→ 1 daily register entry
→ Roll CTN001: 500 allocated
→ User sees 1 row with pre-filled data
```

### Scenario 2: Request Spans Two Rolls
```
Request: 1,500 holograms
Available: 
  - Roll CTN001 has 1,000 available
  - Roll CTN002 has 800 available

Result:
→ 2 daily register entries
→ Roll CTN001: 1,000 allocated (HG001001-HG002000)
→ Roll CTN002: 500 allocated (HG002001-HG002500)
→ User sees 2 rows with pre-filled data
```

### Scenario 3: Request Spans Three Rolls
```
Request: 2,500 holograms
Available:
  - Roll CTN001 has 1,000 available
  - Roll CTN002 has 800 available
  - Roll CTN003 has 1,200 available

Result:
→ 3 daily register entries
→ Roll CTN001: 1,000 allocated
→ Roll CTN002: 800 allocated
→ Roll CTN003: 700 allocated
→ User sees 3 rows with pre-filled data
```

## Benefits

### For Users
1. **No Manual Entry**: All roll numbers and serial ranges are pre-filled
2. **Clear Visibility**: Can see exactly which rolls were used
3. **Easy Tracking**: Each roll is tracked separately
4. **Flexible Updates**: Can adjust utilization per roll

### For System
1. **Accurate Inventory**: Each roll's count is updated correctly
2. **FIFO Compliance**: Oldest rolls are used first automatically
3. **Audit Trail**: Complete history of which rolls were used for which brand
4. **Traceability**: Can trace any serial number back to its roll and brand

### For Auditors
1. **Complete Records**: Every roll usage is documented
2. **Serial Tracking**: Can verify serial number continuity
3. **Brand Traceability**: Can see which brands used which rolls
4. **Wastage Tracking**: Wastage is tracked per roll

## Technical Implementation

### File: `officerinchargehologramreq.component.ts`
```typescript
createDailyRegisterEntries(): void {
  // Creates ONE entry per roll allocation
  const dailyEntries = this.allocationResult.allocations.map((allocation, index) => ({
    id: `AUTO_${Date.now()}_${index}`,
    cartoonNumber: allocation.cartoonNumber,  // ← Roll number
    issuedEntries: [{
      fromSerial: allocation.fromSerial,      // ← Pre-filled
      toSerial: allocation.toSerial,          // ← Pre-filled
      quantity: allocation.quantity           // ← Auto-calculated
    }],
    // ... other fields
  }));
}
```

### File: `hologram-daily-register.component.html`
```html
<!-- Displays pre-filled serial ranges -->
<td class="issued-from">
  <input type="text" 
         [(ngModel)]="issuedEntry.fromSerial"  <!-- Pre-filled -->
         [readonly]="entry.isFixed">           <!-- Editable until saved -->
</td>
```

## Summary

The multi-roll allocation system is **fully automated**:

1. ✅ **Officer approves** → System calculates allocation
2. ✅ **System creates entries** → One per roll with pre-filled data
3. ✅ **User views entries** → Sees separate rows for each roll
4. ✅ **User updates utilization** → Only needs to update quantities
5. ✅ **System tracks inventory** → Each roll updated correctly

**Users never need to manually enter roll numbers or serial ranges** - everything is auto-populated based on the officer's approval!
