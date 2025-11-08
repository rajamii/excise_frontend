# Visual Test Checklist ✅

## 🎯 Complete Approval Workflow Test

Use this checklist to verify the entire hologram approval workflow is working correctly.

---

## 📝 Test Scenario

**Test Roll:** CTN001  
**Initial State:** Available=500, Used=0, Damaged=0  
**Test Entry:** Issued=90, Wastage=10, Total=100

---

## ✅ Step-by-Step Checklist

### 1️⃣ Initial State Check

**URL:** `http://localhost:4200/dev-hologram-overview`

**Rolls Tab - CTN001:**
- [ ] Available: 500
- [ ] Used: 0
- [ ] Damaged: 0
- [ ] Status: AVAILABLE

**Available Hologram Data Tab - CTN001:**
- [ ] Available Count: 500
- [ ] Percentage: 100%

**Serial Numbers Data Tab - CTN001:**
- [ ] Available: 500
- [ ] Used: 0
- [ ] Damaged: 0

**Issued Hologram Tab:**
- [ ] Note current number of entries: _______

**Issued History Tab:**
- [ ] Note current number of entries: _______

---

### 2️⃣ Create Entry (Supply Chain User)

**URL:** `http://localhost:4200/dev-hologram-daily-register`

**Form Fill:**
- [ ] Hologram Type: LOCAL
- [ ] Date: Today
- [ ] Click "Add New Entry"
- [ ] Cartoon Number: CTN001
- [ ] Reference No: TEST-001
- [ ] Brand Name: Test Brand
- [ ] Alcohol %: 40
- [ ] Size (ML): 750
- [ ] Liquor Type: Whiskey
- [ ] Bottle Size: 750ml
- [ ] Utilized Quantity: 100

**Issued Entry:**
- [ ] Click "Add Issued Entry"
- [ ] From Serial: HG001001
- [ ] To Serial: HG001090
- [ ] Quantity: 90

**Wastage Entry:**
- [ ] Click "Add Wastage Entry"
- [ ] From Serial: HG001091
- [ ] To Serial: HG001100
- [ ] Quantity: 10
- [ ] Damage Reason: Quality control rejection

**Verification:**
- [ ] Left Over Quantity: 0
- [ ] Total Calculation: 90 + 10 + 0 = 100 ✅
- [ ] Click "Save Entry"
- [ ] Success message: "Entry saved successfully! Waiting for Officer In Charge approval."

---

### 3️⃣ Verify Data NOT Updated (Before Approval)

**URL:** `http://localhost:4200/dev-hologram-overview`

**Rolls Tab - CTN001:**
- [ ] Available: 500 (unchanged) ✅
- [ ] Used: 0 (unchanged) ✅
- [ ] Damaged: 0 (unchanged) ✅
- [ ] Status: AVAILABLE (unchanged) ✅

**Issued Hologram Tab:**
- [ ] No new entries ✅

**Issued History Tab:**
- [ ] No new entries ✅

**Result:** Data should NOT be updated yet! ✅

---

### 4️⃣ Officer Approval

**URL:** `http://localhost:4200/dev-hologram-manufacturing-register`

**Find Entry:**
- [ ] Select Hologram Type: LOCAL
- [ ] Select Date: Today
- [ ] Entry visible with status PENDING

**Entry Details:**
- [ ] Cartoon Number: CTN001
- [ ] Reference No: TEST-001
- [ ] Brand: Test Brand
- [ ] Issued: 90 (HG001001 - HG001090)
- [ ] Wastage: 10 (HG001091 - HG001100)
- [ ] Status: PENDING

**Approve:**
- [ ] Click "Approve" button (green checkmark)
- [ ] Confirm approval in modal
- [ ] Success message: "Entry approved successfully! Roll data has been updated in Hologram Overview."

---

### 5️⃣ Verify ALL Data Updated (After Approval)

**URL:** `http://localhost:4200/dev-hologram-overview`

#### Rolls Tab - CTN001
- [ ] Available: **400** (500 - 100) ✅
- [ ] Used: **90** (0 + 90) ✅
- [ ] Damaged: **10** (0 + 10) ✅
- [ ] Status: **IN_USE** (changed from AVAILABLE) ✅

#### Available Hologram Data Tab - CTN001
- [ ] Available Count: **400** (500 - 100) ✅
- [ ] Percentage: **80%** (400/500 * 100) ✅
- [ ] Status: AVAILABLE ✅

#### Serial Numbers Data Tab - CTN001
- [ ] Available: **400** (500 - 100) ✅
- [ ] Used: **90** (0 + 90) ✅
- [ ] Damaged: **10** (0 + 10) ✅
- [ ] Status: **IN_USE** ✅

#### Issued Hologram Tab
**New Entry Added:**
- [ ] Cartoon Number: CTN001
- [ ] Type: LOCAL
- [ ] Reference No: TEST-001
- [ ] Brand Name: Test Brand
- [ ] From Serial: HG001001
- [ ] To Serial: HG001090
- [ ] Quantity: 90
- [ ] Issue Date: Today
- [ ] Approved By: Officer In Charge
- [ ] Timestamp present

#### Issued History Tab
**Entry 1 - ISSUED:**
- [ ] Cartoon Number: CTN001
- [ ] Type: LOCAL
- [ ] Action: ISSUED
- [ ] Reference No: TEST-001
- [ ] Brand Name: Test Brand
- [ ] From Serial: HG001001
- [ ] To Serial: HG001090
- [ ] Quantity: 90
- [ ] Date: Today
- [ ] Approved By: Officer In Charge
- [ ] Remarks: Approved by Officer In Charge

**Entry 2 - WASTAGE:**
- [ ] Cartoon Number: CTN001
- [ ] Type: LOCAL
- [ ] Action: WASTAGE
- [ ] Reference No: TEST-001
- [ ] Brand Name: Test Brand
- [ ] From Serial: HG001091
- [ ] To Serial: HG001100
- [ ] Quantity: 10
- [ ] Date: Today
- [ ] Approved By: Officer In Charge
- [ ] Remarks: Quality control rejection

---

### 6️⃣ Data Persistence Check

**Refresh Page:**
- [ ] Press F5 to refresh
- [ ] All data still shows correctly ✅
- [ ] No data lost ✅

---

### 7️⃣ Browser Console Check

**Open Console (F12):**

**Run Command:**
```javascript
console.log('Rolls:', JSON.parse(localStorage.getItem('hologramOverviewRolls')));
console.log('Issued:', JSON.parse(localStorage.getItem('hologramOverviewIssued')));
console.log('History:', JSON.parse(localStorage.getItem('hologramOverviewHistory')));
```

**Verify:**
- [ ] Rolls data shows CTN001 with correct counts
- [ ] Issued data shows new entry
- [ ] History data shows 2 new entries
- [ ] No errors in console

---

### 8️⃣ Test Rejection (Optional)

**Create Another Entry:**
- [ ] Create new entry in Daily Register
- [ ] Go to Manufacturing Register
- [ ] Click "Reject" button (red X)
- [ ] Enter rejection reason
- [ ] Confirm rejection

**Verify:**
- [ ] Entry status: REJECTED
- [ ] Roll data in Overview: UNCHANGED ✅
- [ ] No new entries in Issued tab ✅
- [ ] No new entries in History tab ✅

---

### 9️⃣ Test Multiple Approvals

**Create Second Entry:**
- [ ] Cartoon Number: CTN001
- [ ] Issued: 50 (HG001101 - HG001150)
- [ ] Wastage: 5 (HG001151 - HG001155)
- [ ] Total: 55

**After Second Approval:**
- [ ] Available: **345** (400 - 55) ✅
- [ ] Used: **140** (90 + 50) ✅
- [ ] Damaged: **15** (10 + 5) ✅
- [ ] Issued tab: 2 entries total ✅
- [ ] History tab: 4 entries total ✅

---

### 🔟 Test Different Hologram Types

**Test EXPORT Type:**
- [ ] Create entry with EXPORT type
- [ ] Approve entry
- [ ] Verify EXPORT roll updates correctly
- [ ] LOCAL roll data unchanged

**Test DEFENCE Type:**
- [ ] Create entry with DEFENCE type
- [ ] Approve entry
- [ ] Verify DEFENCE roll updates correctly
- [ ] LOCAL and EXPORT rolls unchanged

---

## 🎯 Final Verification

### All Tests Pass If:
- [ ] All 5 tabs update automatically after approval
- [ ] Calculations are mathematically correct
- [ ] No duplicate entries created
- [ ] Data persists after page refresh
- [ ] Rejected entries do NOT update roll data
- [ ] Multiple approvals accumulate correctly
- [ ] Different hologram types update independently

---

## ✅ Test Result

**Date:** _______________  
**Tester:** _______________  
**Result:** ⬜ PASS  ⬜ FAIL

**Notes:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## 🐛 If Test Fails

### Check:
1. Browser console for errors
2. localStorage keys exist
3. Correct URLs being used
4. No network errors
5. Page refreshed after approval

### Debug Commands:
```javascript
// View all data
console.log('=== ALL HOLOGRAM DATA ===');
console.log('Rolls:', JSON.parse(localStorage.getItem('hologramOverviewRolls')));
console.log('Available:', JSON.parse(localStorage.getItem('hologramOverviewAvailable')));
console.log('Serial Data:', JSON.parse(localStorage.getItem('hologramOverviewSerialData')));
console.log('Issued:', JSON.parse(localStorage.getItem('hologramOverviewIssued')));
console.log('History:', JSON.parse(localStorage.getItem('hologramOverviewHistory')));
console.log('Daily Entries:', JSON.parse(localStorage.getItem('dailyRegisterEntries')));
```

### Clear and Retry:
```javascript
// Clear all test data
localStorage.removeItem('hologramOverviewRolls');
localStorage.removeItem('hologramOverviewAvailable');
localStorage.removeItem('hologramOverviewSerialData');
localStorage.removeItem('hologramOverviewIssued');
localStorage.removeItem('hologramOverviewHistory');
localStorage.removeItem('dailyRegisterEntries');
localStorage.removeItem('approvedHologramEntries');
console.log('✅ All test data cleared! Refresh and try again.');
```

---

## 🎉 Success!

If all checkboxes are checked, the hologram approval workflow is working perfectly! 🚀

The system correctly:
- ✅ Saves entries from supply chain users
- ✅ Shows pending entries to officers
- ✅ Updates all 5 tabs after approval
- ✅ Maintains data integrity
- ✅ Handles rejections correctly
- ✅ Supports multiple approvals
- ✅ Works with all hologram types
