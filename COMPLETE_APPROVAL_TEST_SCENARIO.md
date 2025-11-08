# Complete Hologram Approval & Data Update Test Scenario

## Overview
This document provides a complete end-to-end test scenario to verify that when an Officer In Charge approves a hologram entry from the Manufacturing Register, all hologram data is automatically updated in the Hologram Overview page.

---

## What Gets Updated After Officer Approval?

When an officer approves an entry, the following tabs in Hologram Overview are automatically updated:

1. **Rolls Tab** - Available, Used, and Damaged counts
2. **Available Hologram Data Tab** - Available counts and percentages
3. **Serial Numbers Data Tab** - Serial range status and counts
4. **Issued Hologram Tab** - New issued entry added
5. **Issued History Tab** - History entries for issued and wastage

---

## Complete Test Scenario

### Prerequisites
1. Server running at `http://localhost:4200`
2. At least one hologram roll available in the system

---

### Step 1: Check Initial State in Hologram Overview
**URL:** `http://localhost:4200/dev-hologram-overview`

1. Go to **Rolls Tab**
   - Note down a roll (e.g., CTN001):
     - Available: 500
     - Used: 0
     - Damaged: 0
     - Status: AVAILABLE

2. Go to **Available Hologram Data Tab**
   - Note the same roll:
     - Available Count: 500
     - Percentage: 100%

3. Go to **Serial Numbers Data Tab**
   - Note the same roll:
     - Available: 500
     - Used: 0
     - Damaged: 0

4. Go to **Issued Hologram Tab**
   - Note the current number of entries

5. Go to **Issued History Tab**
   - Note the current number of history entries

**Screenshot or Note:** Record all these initial values

---

### Step 2: Create a Daily Register Entry (Supply Chain User)
**URL:** `http://localhost:4200/dev-hologram-daily-register`

1. Select **Hologram Type:** LOCAL
2. Select **Date:** Today's date
3. Click **"Add New Entry"**

4. Fill in the entry:
   - **Cartoon Number:** CTN001 (the roll you noted earlier)
   - **Reference No:** TEST-REF-001
   - **Brand Name:** Test Brand
   - **Alcohol %:** 40
   - **Size (ML):** 750
   - **Liquor Type:** Whiskey
   - **Bottle Size:** 750ml

5. **Hologram Utilization:**
   - **Utilized Quantity:** 100

6. **Issued Holograms:**
   - Click "Add Issued Entry"
   - **From Serial:** HG001001
   - **To Serial:** HG001090
   - **Quantity:** 90

7. **Wastage/Damaged:**
   - Click "Add Wastage Entry"
   - **From Serial:** HG001091
   - **To Serial:** HG001100
   - **Quantity:** 10
   - **Damage Reason:** Quality control rejection

8. **Left Over Quantity:** 0

9. **Verify Calculation:**
   - Total should match: 90 (issued) + 10 (wastage) + 0 (leftover) = 100 ✅

10. Click **"Save Entry"**
    - You should see: "✅ Entry saved successfully! Waiting for Officer In Charge approval."

---

### Step 3: Verify Entry is Pending (Before Approval)
**URL:** `http://localhost:4200/dev-hologram-overview`

1. Check **Rolls Tab** - CTN001:
   - Available: 500 (unchanged) ✅
   - Used: 0 (unchanged) ✅
   - Damaged: 0 (unchanged) ✅
   - **Status: AVAILABLE (unchanged)** ✅

2. Check **Available Hologram Data Tab** - CTN001:
   - Available Count: 500 (unchanged) ✅
   - Percentage: 100% (unchanged) ✅

3. Check **Serial Numbers Data Tab** - CTN001:
   - Available: 500 (unchanged) ✅
   - Used: 0 (unchanged) ✅
   - Damaged: 0 (unchanged) ✅

**Result:** Roll data should NOT be updated yet because officer hasn't approved ✅

---

### Step 4: Officer Approves the Entry
**URL:** `http://localhost:4200/dev-hologram-manufacturing-register`

1. Select **Hologram Type:** LOCAL
2. Select **Date:** Today's date
3. You should see the pending entry you just created

4. **Entry Details Should Show:**
   - Cartoon Number: CTN001
   - Reference No: TEST-REF-001
   - Brand: Test Brand
   - Issued: 90 (HG001001 - HG001090)
   - Wastage: 10 (HG001091 - HG001100)
   - Status: PENDING

5. Click **"Approve"** button (green checkmark)
6. Confirm approval in the modal
7. You should see: "✅ Entry approved successfully! Roll data has been updated in Hologram Overview."

---

### Step 5: Verify All Data is Updated (After Approval)
**URL:** `http://localhost:4200/dev-hologram-overview`

#### 5.1 Check Rolls Tab - CTN001
Expected changes:
- **Available: 400** (500 - 100) ✅
- **Used: 90** (0 + 90) ✅
- **Damaged: 10** (0 + 10) ✅
- **Status: IN_USE** (changed from AVAILABLE) ✅

#### 5.2 Check Available Hologram Data Tab - CTN001
Expected changes:
- **Available Count: 400** (500 - 100) ✅
- **Percentage: 80%** (400/500 * 100) ✅
- **Status: AVAILABLE** ✅

#### 5.3 Check Serial Numbers Data Tab - CTN001
Expected changes:
- **Available: 400** (500 - 100) ✅
- **Used: 90** (0 + 90) ✅
- **Damaged: 10** (0 + 10) ✅
- **Status: IN_USE** ✅

#### 5.4 Check Issued Hologram Tab
Expected: **New entry added**
- Cartoon Number: CTN001
- Type: LOCAL
- Reference No: TEST-REF-001
- Brand Name: Test Brand
- Issued From: HG001001
- Issued To: HG001090
- Quantity: 90
- Issued Date: Today's date
- Approved By: Officer In Charge

#### 5.5 Check Issued History Tab
Expected: **Two new history entries**

**Entry 1 - Issued:**
- Cartoon Number: CTN001
- Type: LOCAL
- Action: ISSUED
- Reference No: TEST-REF-001
- Brand Name: Test Brand
- From Serial: HG001001
- To Serial: HG001090
- Quantity: 90
- Date: Today's date
- Approved By: Officer In Charge
- Remarks: Approved by Officer In Charge

**Entry 2 - Wastage:**
- Cartoon Number: CTN001
- Type: LOCAL
- Action: WASTAGE
- Reference No: TEST-REF-001
- Brand Name: Test Brand
- From Serial: HG001091
- To Serial: HG001100
- Quantity: 10
- Date: Today's date
- Approved By: Officer In Charge
- Remarks: Quality control rejection

---

## Step 6: Test Multiple Approvals

Repeat Steps 2-5 with different values to test cumulative updates:

### Second Entry:
- Cartoon Number: CTN001
- Issued: 50 (HG001101 - HG001150)
- Wastage: 5 (HG001151 - HG001155)
- Total: 55

**After Second Approval, CTN001 should show:**
- Available: 345 (400 - 55)
- Used: 140 (90 + 50)
- Damaged: 15 (10 + 5)

---

## Step 7: Test Rejection Scenario

1. Create another entry in Daily Register
2. Go to Manufacturing Register
3. Click **"Reject"** button (red X)
4. Enter rejection reason: "Incorrect serial numbers"
5. Confirm rejection

**Verify:**
- Entry status changes to REJECTED
- Roll data in Hologram Overview remains UNCHANGED ✅
- No new entries in Issued Hologram or History tabs ✅

---

## Step 8: Test with Different Hologram Types

Repeat the entire process for:
- **EXPORT** type holograms
- **DEFENCE** type holograms

Each type should update independently in all tabs.

---

## Step 9: Test Roll Completion

Continue approving entries until a roll's available count reaches 0:

**Expected Behavior:**
- Status changes to **COMPLETED**
- Roll still appears in all tabs
- Available count shows 0
- Used + Damaged = Total Count

---

## Quick Verification Checklist

After each approval, verify:

- [ ] Rolls Tab - Counts updated correctly
- [ ] Rolls Tab - Status changed if needed
- [ ] Available Hologram Data Tab - Available count decreased
- [ ] Available Hologram Data Tab - Percentage recalculated
- [ ] Serial Numbers Data Tab - All counts updated
- [ ] Issued Hologram Tab - New entry added
- [ ] Issued History Tab - History entries added (issued + wastage if applicable)
- [ ] All calculations are mathematically correct
- [ ] No duplicate entries created
- [ ] Data persists after page refresh

---

## Common Issues to Check

### Issue 1: Data Not Updating
**Symptoms:** After approval, Hologram Overview shows old data

**Check:**
1. Open browser console (F12)
2. Look for errors in console
3. Check localStorage keys:
   - `hologramOverviewRolls`
   - `hologramOverviewAvailable`
   - `hologramOverviewSerialData`
   - `hologramOverviewIssued`
   - `hologramOverviewHistory`

**Solution:** Refresh the Hologram Overview page

### Issue 2: Incorrect Calculations
**Symptoms:** Numbers don't add up correctly

**Check:**
1. Verify the entry in Daily Register has correct totals
2. Check that Issued + Wastage + Leftover = Utilized Quantity
3. Verify serial number ranges match quantities

### Issue 3: Duplicate Entries
**Symptoms:** Same entry appears multiple times

**Check:**
1. Don't click "Save" or "Approve" multiple times
2. Wait for success message before proceeding
3. Clear localStorage if needed: `localStorage.clear()`

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Supply Chain User Creates Entry                   │
│  Location: /dev-hologram-daily-register                     │
│  Action: Fill form and click "Save Entry"                   │
│  Result: Entry saved to localStorage with status PENDING    │
│  Roll Data: NOT UPDATED YET ❌                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Officer In Charge Reviews Entry                    │
│  Location: /dev-hologram-manufacturing-register             │
│  Action: View pending entries                               │
│  Result: Entry visible with PENDING status                  │
│  Roll Data: STILL NOT UPDATED ❌                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Officer Approves Entry                             │
│  Location: /dev-hologram-manufacturing-register             │
│  Action: Click "Approve" button                             │
│  Result: Entry status changed to APPROVED                   │
│  Roll Data: NOW UPDATED! ✅                                 │
│                                                              │
│  Updates Triggered:                                          │
│  ✅ Rolls Tab - Available/Used/Damaged counts updated       │
│  ✅ Available Hologram Data - Counts and % updated          │
│  ✅ Serial Numbers Data - All counts updated                │
│  ✅ Issued Hologram - New entry added                       │
│  ✅ Issued History - History entries added                  │
│                                                              │
│  Location: /dev-hologram-overview                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Expected Console Logs

When officer approves, you should see these console logs:

```
Updating roll data after approval for: CTN001
Rolls data updated: {cartoonNumber: "CTN001", usedCount: 90, damagedCount: 10, availableCount: 400, status: "IN_USE"}
Available hologram data updated: {cartoonNumber: "CTN001", availableCount: 400, percentage: 80}
Serial numbers data updated: {rollNumber: "CTN001", usedCount: 90, damagedCount: 10, availableCount: 400}
Issued hologram data updated: {cartoonNumber: "CTN001", issuedQuantity: 90, ...}
Issued history data updated
Roll data updated successfully after approval
```

---

## Success Criteria

✅ **Test Passes If:**
1. All 5 tabs in Hologram Overview update automatically after approval
2. Calculations are mathematically correct
3. No duplicate entries are created
4. Data persists after page refresh
5. Rejected entries do NOT update roll data
6. Multiple approvals accumulate correctly
7. Roll status changes appropriately (AVAILABLE → IN_USE → COMPLETED)

❌ **Test Fails If:**
1. Any tab shows incorrect data after approval
2. Data doesn't update automatically (requires manual refresh)
3. Calculations are wrong
4. Duplicate entries appear
5. Rejected entries update roll data
6. Data is lost after page refresh

---

## Troubleshooting Commands

### View localStorage data in browser console:
```javascript
// View all hologram data
console.log('Rolls:', JSON.parse(localStorage.getItem('hologramOverviewRolls')));
console.log('Available:', JSON.parse(localStorage.getItem('hologramOverviewAvailable')));
console.log('Serial Data:', JSON.parse(localStorage.getItem('hologramOverviewSerialData')));
console.log('Issued:', JSON.parse(localStorage.getItem('hologramOverviewIssued')));
console.log('History:', JSON.parse(localStorage.getItem('hologramOverviewHistory')));
console.log('Daily Entries:', JSON.parse(localStorage.getItem('dailyRegisterEntries')));
```

### Clear all test data:
```javascript
localStorage.removeItem('hologramOverviewRolls');
localStorage.removeItem('hologramOverviewAvailable');
localStorage.removeItem('hologramOverviewSerialData');
localStorage.removeItem('hologramOverviewIssued');
localStorage.removeItem('hologramOverviewHistory');
localStorage.removeItem('dailyRegisterEntries');
localStorage.removeItem('approvedHologramEntries');
console.log('All hologram data cleared!');
```

---

## Notes

1. **Real-time Updates:** The Hologram Overview page auto-refreshes every 30 seconds, but you can manually refresh to see updates immediately.

2. **Data Persistence:** All data is stored in localStorage, so it persists across page refreshes but is cleared when you clear browser data.

3. **Multiple Users:** In a real system with backend, multiple users can work simultaneously. With localStorage, you're simulating this on a single browser.

4. **Serial Number Validation:** The system validates that serial numbers are sequential and quantities match the range.

5. **Approval Workflow:** Only Officer In Charge can approve entries. Supply Chain users can only create and save entries.

---

## End of Test Scenario

This comprehensive test ensures the complete workflow from entry creation to officer approval and data updates is working correctly! 🎉
