# Request Reference Number Implementation

## Overview
Replaced batch number logic with request reference numbers throughout the hologram workflow to make tracking easier and more meaningful for users.

## What Changed

### 1. Display Changes
**Before:** Showed auto-generated batch numbers like `BATCH123456`
**After:** Shows request reference numbers like `TEST/1/2024/12345`

**Affected Areas:**
- Issued Hologram tab
- Issued History tab
- Serial Numbers Details modal

### 2. Data Structure Changes

#### Interfaces Updated:
```typescript
// IssuedHologram
interface IssuedHologram {
  referenceNo: string;  // Changed from batchNumber
  // ... other fields
}

// HistoryHologram
interface HistoryHologram {
  referenceNo: string;  // Changed from batchNumber
  // ... other fields
}

// SerialRange
interface SerialRange {
  referenceNo?: string;  // Changed from batchNumber
  // ... other fields
}

// UsageEvent
interface UsageEvent {
  referenceNo?: string;  // Changed from batchNumber
  // ... other fields
}

// ProductionBatch
interface ProductionBatch {
  referenceNo: string;  // Changed from batchNumber
  // ... other fields
}
```

### 3. Usage History Tracking

When an officer approves a daily register entry, the system now stores:

```typescript
{
  date: '2024-11-09',
  referenceNo: 'TEST/1/2024/12345',  // Request reference number
  brandName: 'Himalayan Gold Rum',
  issuedFromSerial: 'HG001001',
  issuedToSerial: 'HG001100',
  issuedQuantity: 100,
  wastageFromSerial: 'HG001101',
  wastageToSerial: 'HG001110',
  wastageQuantity: 10,
  leftOverQuantity: 890,
  approvedBy: 'Officer In Charge',
  approvedAt: '2024-11-09T10:30:00Z'
}
```

This history is stored in:
- `hologramOverviewRolls` → Each roll's `usageHistory` array
- `hologramOverviewSerialData` → Each serial roll's `usageHistory` array

### 4. Serial Numbers Details Modal

The modal now shows:
- **Request Ref:** TEST/1/2024/12345 (instead of Batch: BATCH123456)
- Icon changed from tag (bi-tag) to file-text (bi-file-text)
- Label changed from "Batch:" to "Request Ref:"

## Files Modified

1. **officerinchargehologramreq.component.ts**
   - Removed batch number generation
   - Uses request reference number when creating issued hologram entries

2. **hologramoveriew.component.ts**
   - Updated all interfaces to use `referenceNo`
   - Updated methods to use `referenceNo` instead of `batchNumber`
   - Updated mock data generation to use reference numbers

3. **hologramoveriew.component.html**
   - Changed "Batch Number" column to "Request Reference"
   - Updated data binding to show `referenceNo`
   - Updated serial details modal to show request reference

4. **hologram-manufacturing-register.component.ts**
   - Added usage history tracking with request reference numbers
   - Stores complete usage details in roll data
   - Stores complete usage details in serial data

## How It Works

### Flow:
1. **User submits hologram request** → Gets reference number (e.g., TEST/1/2024/12345)
2. **Officer approves request** → System allocates holograms using that reference number
3. **User fills daily register** → Reference number is carried through
4. **Officer approves daily register** → System stores usage history with reference number
5. **User views serial details** → Can see which request used which serial numbers

### Example:
```
Request: TEST/1/2024/12345
Brand: Himalayan Gold Rum
Allocated: HG001001 - HG002000 (1000 units)

After Production:
- Used: HG001001 - HG001100 (100 units) → Request Ref: TEST/1/2024/12345
- Wastage: HG001101 - HG001110 (10 units) → Request Ref: TEST/1/2024/12345
- Leftover: HG001111 - HG002000 (890 units) → Returned to available stock
```

## Benefits

1. **Meaningful Tracking:** Request reference numbers are more meaningful than auto-generated batch numbers
2. **End-to-End Visibility:** Same reference number used from request submission to completion
3. **Easy Identification:** Users can easily identify which request consumed which holograms
4. **Audit Trail:** Complete history of which request used which serial numbers
5. **Better Reporting:** Can generate reports based on request reference numbers
6. **User-Friendly:** Officers and users can track requests using familiar reference numbers

## Testing

To verify the implementation:

1. Submit a hologram request and note the reference number
2. Approve the request as officer in charge
3. Fill the daily register with actual usage
4. Approve the daily register entry
5. Check:
   - Issued Hologram tab shows request reference
   - Issued History tab shows request reference
   - Serial Numbers Details modal shows request reference for used ranges
   - Roll data includes usage history with request reference

## Notes

- Mock data generation still creates reference numbers like `REF-001`, `REF-002` for testing
- Real data uses actual request reference numbers from the hologram request workflow
- Usage history is stored in both rolls data and serial data for redundancy
- The system maintains backward compatibility with old data that may have batch numbers
