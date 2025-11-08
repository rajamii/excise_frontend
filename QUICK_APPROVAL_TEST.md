# Quick Approval Test Guide

## 🎯 Quick Test (5 Minutes)

### Step 1: Create Entry (Supply Chain User)
**URL:** `http://localhost:4200/dev-hologram-daily-register`

1. Select: **LOCAL** hologram type
2. Click **"Add New Entry"**
3. Fill:
   - Cartoon Number: **CTN001**
   - Reference No: **TEST-001**
   - Brand: **Test Brand**
   - Utilized Qty: **100**
4. Add Issued:
   - From: **HG001001**
   - To: **HG001090**
   - Qty: **90**
5. Add Wastage:
   - From: **HG001091**
   - To: **HG001100**
   - Qty: **10**
   - Reason: **Quality issue**
6. Click **"Save Entry"**

✅ Should see: "Entry saved successfully! Waiting for Officer In Charge approval."

---

### Step 2: Check Before Approval
**URL:** `http://localhost:4200/dev-hologram-overview`

Go to **Rolls Tab** and find CTN001:
- Available: **500** (unchanged)
- Used: **0** (unchanged)
- Damaged: **0** (unchanged)

✅ **Data should NOT be updated yet!**

---

### Step 3: Approve Entry (Officer)
**URL:** `http://localhost:4200/dev-hologram-manufacturing-register`

1. Select: **LOCAL** type
2. Find your entry (TEST-001)
3. Click **"Approve"** (green checkmark)
4. Confirm approval

✅ Should see: "Entry approved successfully! Roll data has been updated in Hologram Overview."

---

### Step 4: Verify All Updates
**URL:** `http://localhost:4200/dev-hologram-overview`

#### Rolls Tab - CTN001:
- Available: **400** ✅ (500 - 100)
- Used: **90** ✅ (0 + 90)
- Damaged: **10** ✅ (0 + 10)
- Status: **IN_USE** ✅

#### Available Hologram Data Tab - CTN001:
- Available Count: **400** ✅
- Percentage: **80%** ✅

#### Serial Numbers Data Tab - CTN001:
- Available: **400** ✅
- Used: **90** ✅
- Damaged: **10** ✅

#### Issued Hologram Tab:
- **New entry added** ✅
- Cartoon: CTN001
- Quantity: 90
- From: HG001001
- To: HG001090

#### Issued History Tab:
- **Two new entries** ✅
  1. ISSUED: 90 holograms
  2. WASTAGE: 10 holograms

---

## ✅ Success Criteria

All 5 tabs should show updated data automatically after approval!

---

## 🔍 Quick Debug

Open browser console (F12) and run:

```javascript
// Check if data exists
console.log('Rolls:', JSON.parse(localStorage.getItem('hologramOverviewRolls')));
console.log('Issued:', JSON.parse(localStorage.getItem('hologramOverviewIssued')));
console.log('History:', JSON.parse(localStorage.getItem('hologramOverviewHistory')));
```

---

## 🧹 Clear Test Data

In browser console:

```javascript
localStorage.removeItem('hologramOverviewRolls');
localStorage.removeItem('hologramOverviewAvailable');
localStorage.removeItem('hologramOverviewSerialData');
localStorage.removeItem('hologramOverviewIssued');
localStorage.removeItem('hologramOverviewHistory');
localStorage.removeItem('dailyRegisterEntries');
console.log('All test data cleared!');
```

---

## 🐛 Troubleshooting

### Data not updating?
1. Refresh the Hologram Overview page
2. Check browser console for errors
3. Verify you approved (not rejected) the entry

### Wrong calculations?
1. Verify Issued + Wastage + Leftover = Utilized Quantity
2. Check serial number ranges match quantities

### Duplicate entries?
1. Don't click buttons multiple times
2. Wait for success message
3. Clear localStorage and start fresh

---

## 📊 Expected Console Logs

When officer approves, you should see:

```
Updating roll data after approval for: CTN001
Rolls data updated: {cartoonNumber: "CTN001", ...}
Available hologram data updated: {cartoonNumber: "CTN001", ...}
Serial numbers data updated: {rollNumber: "CTN001", ...}
Issued hologram data updated: {cartoonNumber: "CTN001", ...}
Issued history data updated
Roll data updated successfully after approval
```

---

## 🎉 That's It!

The complete workflow is working if all 5 tabs update automatically after officer approval!
