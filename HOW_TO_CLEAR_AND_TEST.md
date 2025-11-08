# How to Clear All Data and Test Fresh

## 🧹 Clear All Hologram Data

### Step 1: Go to Hologram Overview
**URL:** `http://localhost:4200/dev-hologram-overview`

### Step 2: Click "Clear Test Data" Button
- Look for the yellow button in the top right: **"Clear Test Data"**
- Click it
- Confirm the dialog

### Step 3: Verify Everything is Empty
All tabs should now be empty:
- ✅ **Rolls Tab** - No data, empty state
- ✅ **Available Hologram Data Tab** - No data, empty state
- ✅ **Serial Numbers Data Tab** - No data, empty state
- ✅ **Issued Hologram Tab** - No data, empty state
- ✅ **Issued History Tab** - No data, empty state

---

## 🎯 Now Test the Complete Workflow

### Step 1: Add Test Hologram Roll
First, you need to add a hologram roll to the system. You can do this from:
- Hologram Details page
- Officer In Charge Hologram Request page
- Or manually add test data

**Quick way - Use browser console:**
```javascript
// Add a test roll
const testRoll = {
  id: Date.now(),
  cartoonNumber: 'CTN001',
  type: 'LOCAL',
  fromSerial: 'HG001001',
  toSerial: 'HG001500',
  totalCount: 500,
  availableCount: 500,
  usedCount: 0,
  damagedCount: 0,
  status: 'AVAILABLE',
  receivedDate: new Date().toISOString().split('T')[0]
};

// Add to all three storage locations
const rolls = JSON.parse(localStorage.getItem('hologramOverviewRolls') || '[]');
rolls.push(testRoll);
localStorage.setItem('hologramOverviewRolls', JSON.stringify(rolls));

const available = JSON.parse(localStorage.getItem('hologramOverviewAvailable') || '[]');
available.push({
  id: testRoll.id,
  cartoonNumber: testRoll.cartoonNumber,
  type: testRoll.type,
  availableRange: testRoll.fromSerial + ' - ' + testRoll.toSerial,
  availableCount: testRoll.availableCount,
  nextSerial: testRoll.fromSerial,
  percentage: 100,
  status: 'AVAILABLE'
});
localStorage.setItem('hologramOverviewAvailable', JSON.stringify(available));

const serial = JSON.parse(localStorage.getItem('hologramOverviewSerialData') || '[]');
serial.push({
  id: testRoll.id,
  rollNumber: testRoll.cartoonNumber,
  hologramType: testRoll.type,
  fromSerial: testRoll.fromSerial,
  toSerial: testRoll.toSerial,
  totalCount: testRoll.totalCount,
  availableCount: testRoll.availableCount,
  usedCount: testRoll.usedCount,
  damagedCount: testRoll.damagedCount,
  status: testRoll.status,
  receivedDate: testRoll.receivedDate,
  usageHistory: []
});
localStorage.setItem('hologramOverviewSerialData', JSON.stringify(serial));

console.log('✅ Test roll CTN001 added! Refresh the page.');
```

Then refresh the page to see the roll.

---

### Step 2: Create Daily Register Entry
**URL:** `http://localhost:4200/dev-hologram-daily-register`

1. Select **LOCAL** hologram type
2. Click **"Add New Entry"**
3. Fill in:
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

✅ Should see: "Entry saved successfully!"

---

### Step 3: Verify Data NOT Updated Yet
**URL:** `http://localhost:4200/dev-hologram-overview`

Check **Rolls Tab** - CTN001:
- Available: **500** (unchanged) ✅
- Used: **0** (unchanged) ✅
- Damaged: **0** (unchanged) ✅

---

### Step 4: Officer Approves Entry
**URL:** `http://localhost:4200/dev-hologram-manufacturing-register`

1. Select **LOCAL** type
2. Find your entry (TEST-001)
3. Click **"Approve"** (green checkmark)
4. Confirm approval

✅ Should see: "Entry approved successfully! Roll data has been updated."

---

### Step 5: Verify ALL Data Updated
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
- **1 new entry** ✅
- Cartoon: CTN001
- Quantity: 90

#### Issued History Tab:
- **2 new entries** ✅
  1. ISSUED: 90 holograms
  2. WASTAGE: 10 holograms

---

## 🎉 Success!

If all 5 tabs show the updated data, the workflow is working perfectly!

---

## 🔄 To Test Again

1. Go to Hologram Overview
2. Click **"Clear Test Data"**
3. Confirm
4. Add a new test roll (using console command above)
5. Repeat the workflow

---

## 🐛 Quick Debug

### Check what data exists:
```javascript
console.log('Rolls:', JSON.parse(localStorage.getItem('hologramOverviewRolls')));
console.log('Available:', JSON.parse(localStorage.getItem('hologramOverviewAvailable')));
console.log('Serial:', JSON.parse(localStorage.getItem('hologramOverviewSerialData')));
console.log('Issued:', JSON.parse(localStorage.getItem('hologramOverviewIssued')));
console.log('History:', JSON.parse(localStorage.getItem('hologramOverviewHistory')));
```

### Clear everything manually:
```javascript
localStorage.clear();
console.log('✅ Everything cleared!');
```

---

## 📋 What Gets Cleared

When you click "Clear Test Data", these are removed:

1. **hologramOverviewRolls** - All roll data
2. **hologramOverviewAvailable** - All available hologram data
3. **hologramOverviewSerialData** - All serial numbers data
4. **hologramOverviewIssued** - All issued hologram entries
5. **hologramOverviewHistory** - All history entries
6. **dailyRegisterEntries** - All daily register entries
7. **approvedHologramEntries** - All approved entries

Everything starts fresh! 🎯
