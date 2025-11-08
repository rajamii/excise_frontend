# Hologram Allocation Debug Guide

## 🐛 Issue: No Cartoons Showing in Allocation Modal

### Problem
When officer tries to approve a hologram request, the allocation modal shows:
- "0 cartoons available"
- No allocation details in the table
- Even though rolls exist in the Hologram Overview

---

## 🔍 Debug Steps

### Step 1: Check Browser Console
Open browser console (F12) and look for these logs when you click "Approve":

```
=== LOADING HOLOGRAM INVENTORY ===
Saved Rolls: [...]
Saved Serial Data: [...]
Normalized Inventory: [...]
Final Inventory Count: X
Final Inventory: [...]
=== END LOADING HOLOGRAM INVENTORY ===

=== CALCULATING HOLOGRAM ALLOCATION ===
Requested Quantity: 1000
Requested Type: LOCAL
Total Inventory Items: X
Checking sameertest1: {...}
Available Inventory After Filter: [...]
Total Available: X
=== END CALCULATING HOLOGRAM ALLOCATION ===
```

### Step 2: Check Data Structure
The console logs will show if the data is being loaded correctly. Look for:

1. **Cartoon Number:** Should match what you see in Rolls tab (e.g., "sameertest1")
2. **Type:** Should be "LOCAL", "EXPORT", or "DEFENCE"
3. **Status:** Should be "AVAILABLE"
4. **Available Count:** Should be > 0 (e.g., 1000)

---

## 🔧 Common Issues & Fixes

### Issue 1: Type Mismatch
**Symptom:** Console shows `typeMatch: false`

**Cause:** The roll type doesn't match the request type

**Example:**
- Request Type: LOCAL
- Roll Type: EXPORT
- Result: No match ❌

**Fix:** Make sure the roll type matches the request type

---

### Issue 2: Status Not "AVAILABLE"
**Symptom:** Console shows `statusMatch: false`

**Cause:** Roll status is not "AVAILABLE"

**Possible Status Values:**
- AVAILABLE ✅
- IN_USE ❌
- COMPLETED ❌
- DAMAGED ❌

**Fix:** Only rolls with status "AVAILABLE" can be allocated

---

### Issue 3: Available Count is 0
**Symptom:** Console shows `hasAvailable: false`

**Cause:** The roll has no available holograms left

**Fix:** Add a new roll or use a different roll with available holograms

---

### Issue 4: Property Name Mismatch
**Symptom:** Console shows `cartoonNumber: undefined` or `type: undefined`

**Cause:** Data structure uses different property names

**Common Variations:**
- `cartoonNumber` vs `rollNumber`
- `type` vs `hologramType`

**Fix:** The code now normalizes these automatically, but check the console logs

---

## 🎯 Expected Console Output (Working)

```javascript
=== LOADING HOLOGRAM INVENTORY ===
Saved Rolls: [
  {
    id: 1731073200000,
    cartoonNumber: "sameertest1",
    type: "LOCAL",
    fromSerial: "1",
    toSerial: "1000",
    totalCount: 1000,
    availableCount: 1000,
    usedCount: 0,
    damagedCount: 0,
    status: "AVAILABLE",
    receivedDate: "2025-11-08"
  }
]
Normalized Inventory: [same as above]
Final Inventory Count: 1
=== END LOADING HOLOGRAM INVENTORY ===

=== CALCULATING HOLOGRAM ALLOCATION ===
Requested Quantity: 1000
Requested Type: LOCAL
Total Inventory Items: 1
Checking sameertest1: {
  type: "LOCAL",
  typeMatch: true,
  status: "AVAILABLE",
  statusMatch: true,
  availableCount: 1000,
  hasAvailable: true,
  passes: true ✅
}
Available Inventory After Filter: [
  {
    cartoonNumber: "sameertest1",
    type: "LOCAL",
    availableCount: 1000,
    ...
  }
]
Total Available: 1000
Final Allocations: [
  {
    cartoonNumber: "sameertest1",
    fromSerial: "1",
    toSerial: "1000",
    quantity: 1000,
    remainingInCartoon: 0
  }
]
=== END CALCULATING HOLOGRAM ALLOCATION ===
```

---

## 🔍 Manual Check in Console

Run these commands in browser console to check data:

### Check Rolls Data
```javascript
const rolls = JSON.parse(localStorage.getItem('hologramOverviewRolls') || '[]');
console.log('Rolls:', rolls);
console.log('Count:', rolls.length);
rolls.forEach(roll => {
  console.log(`${roll.cartoonNumber || roll.rollNumber}:`, {
    type: roll.type || roll.hologramType,
    status: roll.status,
    available: roll.availableCount
  });
});
```

### Check Serial Data
```javascript
const serial = JSON.parse(localStorage.getItem('hologramOverviewSerialData') || '[]');
console.log('Serial Data:', serial);
console.log('Count:', serial.length);
```

### Check if Roll Matches Request
```javascript
const rolls = JSON.parse(localStorage.getItem('hologramOverviewRolls') || '[]');
const requestType = 'LOCAL'; // Change to your request type
const availableRolls = rolls.filter(roll => 
  (roll.type === requestType || roll.hologramType === requestType) &&
  roll.status === 'AVAILABLE' &&
  roll.availableCount > 0
);
console.log('Available Rolls for', requestType, ':', availableRolls);
```

---

## ✅ Solution Checklist

When you click "Approve" on a hologram request:

- [ ] Console shows "LOADING HOLOGRAM INVENTORY"
- [ ] Console shows at least 1 roll loaded
- [ ] Roll has correct `cartoonNumber` (e.g., "sameertest1")
- [ ] Roll has correct `type` matching request (e.g., "LOCAL")
- [ ] Roll has `status: "AVAILABLE"`
- [ ] Roll has `availableCount > 0`
- [ ] Console shows "CALCULATING HOLOGRAM ALLOCATION"
- [ ] Console shows `typeMatch: true`
- [ ] Console shows `statusMatch: true`
- [ ] Console shows `hasAvailable: true`
- [ ] Console shows `passes: true`
- [ ] Console shows "Available Inventory After Filter" with at least 1 item
- [ ] Console shows "Final Allocations" with allocation details
- [ ] Modal shows cartoon number in the table
- [ ] Modal shows serial range
- [ ] Modal shows quantity

---

## 🚀 Quick Test

1. **Go to Hologram Overview** (`/dev-hologram-overview`)
2. **Check Rolls Tab** - Note the cartoon number (e.g., "sameertest1")
3. **Note the details:**
   - Type: LOCAL/EXPORT/DEFENCE
   - Available: 1000
   - Status: AVAILABLE
4. **Go to Officer In Charge** (`/dev-officer-in-charge`)
5. **Find a request** with matching type (e.g., LOCAL)
6. **Click "Approve"**
7. **Open Console (F12)**
8. **Check the logs** - Should show the roll being found and allocated

---

## 🎯 Expected Result

The allocation modal should show:

```
✓ INVENTORY AVAILABLE
Ready to allocate 1000 holograms from 1 cartoon(s)

Hologram Allocation Details (FIFO - Oldest First)

Cartoon Number | Serial Range | Quantity | Remaining in Cartoon | Actions
sameertest1    | 1 to 1000   | 1,000    | 0                    | [Edit]

Total Allocation: 1,000 units
```

---

## 💡 Tips

1. **Type Must Match:** Request type must match roll type exactly
2. **Status Must Be AVAILABLE:** Only AVAILABLE rolls can be allocated
3. **Check Console:** Always check console logs for detailed debugging
4. **Refresh Data:** Try refreshing the officer page if data seems stale
5. **Clear and Reload:** If issues persist, clear localStorage and reload test data

---

## 🐛 Still Not Working?

If the allocation still shows 0 cartoons:

1. **Check the request type** in the modal title (e.g., "HRQ/2025/001")
2. **Check the roll type** in Hologram Overview
3. **Make sure they match** (LOCAL = LOCAL, EXPORT = EXPORT, etc.)
4. **Check the console logs** for the exact reason why the filter is failing
5. **Look for the "Checking [cartoonNumber]" log** to see why `passes: false`

The console logs will tell you exactly which condition is failing! 🎯
