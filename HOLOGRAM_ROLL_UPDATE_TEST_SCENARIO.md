# Hologram Roll Data Update - Test Scenario

## Overview
This document provides step-by-step testing scenarios to verify that the roll data updates correctly when saving daily register entries.

---

## Test Scenario 1: Partial Usage (Status: AVAILABLE → AVAILABLE)

### Initial Setup
1. **Navigate to Officer-in-Charge Overview**
   - URL: `http://localhost:4200/dev-hologram-overview`
   - Click on "Rolls" tab

2. **Check Initial Roll Data**
   - Find a roll with status "AVAILABLE"
   - Example: Cartoon Number "cttest1" (LOCAL)
   - Note down the initial values:
     ```
     Cartoon Number: cttest1
     Type: LOCAL
     Total Count: 1000
     Available: 1000
     Used: 0
     Damaged: 0
     Status: AVAILABLE
     ```

### Test Steps

**Step 1: Navigate to Daily Register**
- Go to: `http://localhost:4200/dev-hologram-daily-register`
- Select "LOCAL" tab
- Find the entry for "cttest1"

**Step 2: Fill in Usage Data**
- Issued From: `1`
- Issued To: `500`
- Issued Qty: `500` (auto-calculated)
- Wastage From: `501`
- Wastage To: `510`
- Wastage Qty: `10` (auto-calculated)
- Left Over: `490` (auto-calculated)
- Total: `1000` (should match)

**Step 3: Save the Entry**
- Click "Save Entry" button
- Review the confirmation modal:
  ```
  Total Hologram Qty: 1,000
  Issued Qty: 500
  Wastage Qty: 10
  Left Over: 490
  Total (Issued + Wastage + Left Over): 1,000
  ✓ Calculation Verified - Totals Match!
  ```
- Click "Confirm & Save"

**Step 4: Verify Roll Data Update**
- Navigate back to: `http://localhost:4200/dev-hologram-overview`
- Click "Rolls" tab
- Find "cttest1" roll

### Expected Results
```
Cartoon Number: cttest1
Type: LOCAL
Total Count: 1000
Available: 490 ✓ (was 1000, decreased by 510)
Used: 500 ✓ (was 0, increased by 500)
Damaged: 10 ✓ (was 0, increased by 10)
Status: AVAILABLE ✓ (still AVAILABLE because available > 0)
```

### ✅ Pass Criteria
- Available count decreased by (Issued + Wastage) = 510
- Used count increased by Issued = 500
- Damaged count increased by Wastage = 10
- Status remains "AVAILABLE" (because 490 > 0)

---

## Test Scenario 2: Complete Usage (Status: AVAILABLE → COMPLETED)

### Initial Setup
1. **Create a new test roll** or use existing roll
   - Cartoon Number: "CTN838" (LOCAL)
   - Total Count: 500
   - Available: 500
   - Used: 0
   - Damaged: 0
   - Status: AVAILABLE

### Test Steps

**Step 1: Navigate to Daily Register**
- Go to: `http://localhost:4200/dev-hologram-daily-register`
- Select "LOCAL" tab
- Find the entry for "CTN838"

**Step 2: Use All Remaining Holograms**
- Issued From: `1`
- Issued To: `500`
- Issued Qty: `500` (auto-calculated)
- Wastage From: (leave empty)
- Wastage To: (leave empty)
- Wastage Qty: `0`
- Left Over: `0` (auto-calculated)
- Total: `500` (should match)

**Step 3: Save the Entry**
- Click "Save Entry" button
- Review the confirmation modal
- Click "Confirm & Save"

**Step 4: Verify Roll Data Update**
- Navigate back to: `http://localhost:4200/dev-hologram-overview`
- Click "Rolls" tab
- Find "CTN838" roll

### Expected Results
```
Cartoon Number: CTN838
Type: LOCAL
Total Count: 500
Available: 0 ✓ (was 500, decreased by 500)
Used: 500 ✓ (was 0, increased by 500)
Damaged: 0 ✓ (no wastage)
Status: COMPLETED ✓ (changed from AVAILABLE to COMPLETED)
```

### ✅ Pass Criteria
- Available count = 0
- Used count = 500
- Status changed to "COMPLETED" (because available = 0)
- Badge color changed to gray/secondary

---

## Test Scenario 3: Mixed Usage with Damage (Status: AVAILABLE → AVAILABLE)

### Initial Setup
- Cartoon Number: "CTN839" (EXPORT)
- Total Count: 300
- Available: 300
- Used: 0
- Damaged: 0
- Status: AVAILABLE

### Test Steps

**Step 1: Fill in Mixed Usage**
- Issued From: `1`
- Issued To: `200`
- Issued Qty: `200`
- Wastage From: `201`
- Wastage To: `250`
- Wastage Qty: `50`
- Left Over: `50`
- Damage Reason: "Machine malfunction during printing"

**Step 2: Save and Verify**
- Click "Confirm & Save"
- Check roll data in overview

### Expected Results
```
Cartoon Number: CTN839
Type: EXPORT
Total Count: 300
Available: 50 ✓ (was 300, decreased by 250)
Used: 200 ✓ (increased by 200)
Damaged: 50 ✓ (increased by 50)
Status: AVAILABLE ✓ (still AVAILABLE because 50 > 0)
```

---

## Test Scenario 4: Multiple Entries on Same Roll

### Initial Setup
- Cartoon Number: "CTN001" (LOCAL)
- Total Count: 1000
- Available: 1000
- Used: 0
- Damaged: 0

### Test Steps

**Entry 1:**
- Issued: 1-300 (300 units)
- Wastage: 301-310 (10 units)
- Save entry

**Expected After Entry 1:**
```
Available: 690 (1000 - 310)
Used: 300
Damaged: 10
Status: AVAILABLE
```

**Entry 2:**
- Issued: 311-600 (290 units)
- Wastage: 601-650 (50 units)
- Save entry

**Expected After Entry 2:**
```
Available: 350 (690 - 340)
Used: 590 (300 + 290)
Damaged: 60 (10 + 50)
Status: AVAILABLE
```

**Entry 3:**
- Issued: 651-1000 (350 units)
- Wastage: 0
- Save entry

**Expected After Entry 3:**
```
Available: 0 (350 - 350)
Used: 940 (590 + 350)
Damaged: 60
Status: COMPLETED ✓ (changed to COMPLETED)
```

---

## Test Scenario 5: Verify All Three Data Sources

### What to Check
After saving any entry, verify that ALL three data sources are updated:

**1. Rolls Tab**
- Navigate to: Rolls tab
- Check: Available, Used, Damaged, Status

**2. Available Hologram Data Tab**
- Navigate to: Available Hologram Data tab
- Check: Available Count, Percentage, Status

**3. Serial Numbers Data Tab**
- Navigate to: Serial Numbers Data tab
- Check: Available Count, Used Count, Damaged Count, Status

### Expected Behavior
All three tabs should show **consistent data** with the same values for:
- Available Count
- Used Count
- Damaged Count
- Status

---

## Quick Test Checklist

### Before Testing
- [ ] Clear browser cache
- [ ] Open browser console (F12)
- [ ] Navigate to Officer-in-Charge Overview
- [ ] Note initial roll data

### During Testing
- [ ] Fill in serial numbers correctly
- [ ] Verify calculations match
- [ ] Check validation messages
- [ ] Review confirmation modal
- [ ] Click "Confirm & Save"

### After Testing
- [ ] Refresh Officer-in-Charge Overview page
- [ ] Verify Available count decreased
- [ ] Verify Used count increased
- [ ] Verify Damaged count increased
- [ ] Verify Status updated correctly
- [ ] Check browser console for logs
- [ ] Verify all three tabs show consistent data

---

## Console Logs to Monitor

Open browser console (F12) and look for these logs:

```javascript
// When saving entry
"Roll data updated successfully:" {
  cartoonNumber: "cttest1",
  type: "LOCAL",
  usedCount: 500,
  damagedCount: 10,
  availableCount: 490,
  status: "AVAILABLE"
}

// Available hologram data
"Available hologram data updated:" {...}

// Serial rolls data
"Serial rolls data updated:" {...}
```

---

## Troubleshooting

### Issue: Roll data not updating

**Check:**
1. Cartoon number exists in entry metadata
2. Hologram type matches (LOCAL/EXPORT/DEFENCE)
3. Browser console for error messages
4. localStorage data: `localStorage.getItem('hologramOverviewRolls')`

**Solution:**
```javascript
// In browser console, check data:
console.log(JSON.parse(localStorage.getItem('hologramOverviewRolls')));
console.log(JSON.parse(localStorage.getItem('approvedHologramEntries')));
```

### Issue: Status not changing to COMPLETED

**Check:**
- Available count should be exactly 0
- Verify calculation: Total Count = Used + Damaged + Available

**Debug:**
```javascript
// Check roll data
const rolls = JSON.parse(localStorage.getItem('hologramOverviewRolls'));
const roll = rolls.find(r => r.cartoonNumber === 'cttest1');
console.log('Available:', roll.availableCount);
console.log('Status:', roll.status);
```

### Issue: Multiple tabs showing different data

**Solution:**
- Refresh the page (F5)
- Clear localStorage and restart test
- Check that all three update methods are called

---

## Success Indicators

### ✅ Test Passed If:
1. Available count decreases by (Issued + Wastage)
2. Used count increases by Issued quantity
3. Damaged count increases by Wastage quantity
4. Status = "AVAILABLE" when available > 0
5. Status = "COMPLETED" when available = 0
6. All three tabs show consistent data
7. No console errors
8. Changes persist after page refresh

### ❌ Test Failed If:
1. Counts don't update
2. Status doesn't change
3. Console shows errors
4. Data inconsistent across tabs
5. Changes lost after refresh

---

## Test Data Template

Use this template to create test scenarios:

```
Roll Name: _______________
Type: LOCAL / EXPORT / DEFENCE
Initial Available: _______
Issued Qty: _______
Wastage Qty: _______
Expected Available: _______ (Initial - Issued - Wastage)
Expected Status: AVAILABLE / COMPLETED
```

---

## Automated Test Script

Run this in browser console to verify data:

```javascript
// Test verification script
function verifyRollUpdate(cartoonNumber, expectedAvailable, expectedUsed, expectedDamaged, expectedStatus) {
  const rolls = JSON.parse(localStorage.getItem('hologramOverviewRolls') || '[]');
  const roll = rolls.find(r => r.cartoonNumber === cartoonNumber);
  
  if (!roll) {
    console.error('❌ Roll not found:', cartoonNumber);
    return false;
  }
  
  const tests = [
    { name: 'Available', actual: roll.availableCount, expected: expectedAvailable },
    { name: 'Used', actual: roll.usedCount, expected: expectedUsed },
    { name: 'Damaged', actual: roll.damagedCount, expected: expectedDamaged },
    { name: 'Status', actual: roll.status, expected: expectedStatus }
  ];
  
  let allPassed = true;
  tests.forEach(test => {
    const passed = test.actual === test.expected;
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${test.name}: ${test.actual} (expected: ${test.expected})`);
    if (!passed) allPassed = false;
  });
  
  return allPassed;
}

// Example usage:
verifyRollUpdate('cttest1', 490, 500, 10, 'AVAILABLE');
```

---

## Video Recording Checklist

If recording a demo:
1. Show initial roll data in overview
2. Navigate to daily register
3. Fill in serial numbers
4. Show calculation verification
5. Click save and confirm
6. Navigate back to overview
7. Show updated roll data
8. Highlight the changes (available, used, damaged, status)
9. Show all three tabs for consistency

---

## End of Test Scenarios

For questions or issues, check the browser console logs and localStorage data.
