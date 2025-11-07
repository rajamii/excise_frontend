# Quick Test Guide - Roll Data Update

## 🚀 Quick Start (5 Minutes)

### Step 1: Create a Test Roll
1. Go to: `http://localhost:4200/dev-hologram-daily-register`
2. Click **"Create Test Roll"** button (blue button with + icon)
3. Enter:
   - Cartoon Number: `TEST001`
   - Total Count: `1000`
4. Click OK
5. Page will refresh automatically

### Step 2: Verify Initial State
1. Click **"Test Roll Update"** button (green button with ✓ icon)
2. Enter: `TEST001`
3. You should see:
   ```
   Available: 1000
   Used: 0
   Damaged: 0
   Status: AVAILABLE
   ```
4. Click OK

### Step 3: Save a Daily Entry
1. Find the entry for `TEST001` in the table
2. Fill in:
   - **Issued From:** `1`
   - **Issued To:** `500`
   - **Wastage From:** `501`
   - **Wastage To:** `510`
3. Click **"Save Entry"** (green checkmark button)
4. Review the modal and click **"Confirm & Save"**

### Step 4: Verify the Update
1. Click **"Test Roll Update"** button again
2. Enter: `TEST001`
3. You should now see:
   ```
   Available: 490 ✓ (decreased by 510)
   Used: 500 ✓ (increased by 500)
   Damaged: 10 ✓ (increased by 10)
   Status: AVAILABLE ✓ (still available)
   ```

### Step 5: Complete the Roll
1. Fill in the remaining holograms:
   - **Issued From:** `511`
   - **Issued To:** `1000`
2. Click **"Save Entry"**
3. Click **"Confirm & Save"**

### Step 6: Verify Completion
1. Click **"Test Roll Update"** button
2. Enter: `TEST001`
3. You should see:
   ```
   Available: 0 ✓ (all used)
   Used: 990 ✓ (500 + 490)
   Damaged: 10 ✓ (same)
   Status: COMPLETED ✓ (changed to completed!)
   ```

---

## 🎯 Test Buttons Explained

### 1. **Create Test Roll** (Blue + Icon)
- Creates a new test roll with specified cartoon number and count
- Automatically adds it to all three data sources
- Creates a corresponding daily entry

### 2. **Test Roll Update** (Green ✓ Icon)
- Verifies current roll data
- Shows detailed information about counts and status
- Checks data consistency across all tabs
- Validates calculations

### 3. **Test Officer Approval** (Yellow ⚡ Icon)
- Simulates an officer approval
- Creates a new auto-generated entry
- Useful for testing the approval workflow

### 4. **Clear Test Data** (Red 🗑️ Icon)
- Clears all test data
- Resets localStorage
- Use this to start fresh

### 5. **Debug Storage** (Gray 🐛 Icon)
- Shows localStorage contents
- Displays all data sources
- Useful for debugging

---

## 📋 Test Scenarios

### Scenario A: Partial Usage
```
Initial: Available=1000, Used=0, Damaged=0
Action: Use 500, Damage 10
Expected: Available=490, Used=500, Damaged=10, Status=AVAILABLE
```

### Scenario B: Complete Usage
```
Initial: Available=1000, Used=0, Damaged=0
Action: Use 1000, Damage 0
Expected: Available=0, Used=1000, Damaged=0, Status=COMPLETED
```

### Scenario C: Multiple Entries
```
Entry 1: Use 300, Damage 10 → Available=690
Entry 2: Use 400, Damage 20 → Available=270
Entry 3: Use 270, Damage 0 → Available=0, Status=COMPLETED
```

---

## ✅ Success Checklist

After each save, verify:
- [ ] Available count decreased correctly
- [ ] Used count increased correctly
- [ ] Damaged count increased correctly
- [ ] Status updated automatically
- [ ] No console errors
- [ ] Changes visible in Officer-in-Charge overview

---

## 🔍 Verification Steps

### Method 1: Using Test Button
1. Click "Test Roll Update"
2. Enter cartoon number
3. Review the detailed report

### Method 2: Manual Check
1. Go to `http://localhost:4200/dev-hologram-overview`
2. Check "Rolls" tab
3. Find your test roll
4. Verify counts and status

### Method 3: Console Check
```javascript
// Open browser console (F12)
const rolls = JSON.parse(localStorage.getItem('hologramOverviewRolls'));
const roll = rolls.find(r => r.cartoonNumber === 'TEST001');
console.log(roll);
```

---

## 🐛 Troubleshooting

### Issue: Roll not updating
**Solution:**
1. Check browser console for errors
2. Verify cartoon number matches exactly
3. Refresh the overview page
4. Run "Test Roll Update" to see current state

### Issue: Status not changing
**Solution:**
1. Verify available count is exactly 0 for COMPLETED
2. Check calculation: Total = Available + Used + Damaged
3. Clear cache and retry

### Issue: Data inconsistent
**Solution:**
1. Click "Clear Test Data"
2. Create new test roll
3. Try again

---

## 📊 Expected Console Logs

When saving an entry, you should see:
```
Roll data updated successfully: {
  cartoonNumber: "TEST001",
  type: "LOCAL",
  usedCount: 500,
  damagedCount: 10,
  availableCount: 490,
  status: "AVAILABLE"
}

Available hologram data updated: {...}
Serial rolls data updated: {...}
```

---

## 🎬 Video Test Script

1. **Introduction** (10 sec)
   - "Testing roll data update functionality"

2. **Create Test Roll** (20 sec)
   - Click "Create Test Roll"
   - Enter TEST001, 1000
   - Show success message

3. **Initial Verification** (15 sec)
   - Click "Test Roll Update"
   - Show initial state: 1000 available

4. **Save Entry** (30 sec)
   - Fill in serials
   - Show calculation
   - Click save and confirm

5. **Verify Update** (20 sec)
   - Click "Test Roll Update"
   - Show updated counts
   - Highlight status still AVAILABLE

6. **Complete Roll** (30 sec)
   - Use remaining holograms
   - Save entry

7. **Final Verification** (20 sec)
   - Click "Test Roll Update"
   - Show available = 0
   - Highlight status = COMPLETED

8. **Overview Check** (20 sec)
   - Navigate to overview
   - Show updated roll in table
   - Point out COMPLETED badge

---

## 💡 Pro Tips

1. **Use meaningful cartoon numbers** for testing (e.g., TEST001, TEST002)
2. **Keep track of calculations** to verify accuracy
3. **Test edge cases** (exactly 0, exactly total count)
4. **Check all three tabs** in overview for consistency
5. **Use browser console** for detailed debugging

---

## 📝 Test Report Template

```
Test Date: ___________
Tester: ___________

Test Roll: ___________
Initial Available: ___________

Entry 1:
- Issued: _______
- Damaged: _______
- Expected Available: _______
- Actual Available: _______
- Status: _______
- ✅ Pass / ❌ Fail

Entry 2:
- Issued: _______
- Damaged: _______
- Expected Available: _______
- Actual Available: _______
- Status: _______
- ✅ Pass / ❌ Fail

Overall Result: ✅ Pass / ❌ Fail
Notes: ___________
```

---

## 🚨 Important Notes

1. **Test in a clean environment** - Clear test data before starting
2. **One roll at a time** - Focus on one test roll to avoid confusion
3. **Verify after each save** - Don't wait until the end
4. **Check console logs** - They provide valuable debugging info
5. **Refresh overview page** - Sometimes needed to see updates

---

## 🎓 Learning Objectives

After completing these tests, you should understand:
- ✅ How roll data updates when entries are saved
- ✅ How status changes automatically (AVAILABLE → COMPLETED)
- ✅ How counts are calculated (Available, Used, Damaged)
- ✅ How data stays consistent across all tabs
- ✅ How to debug issues using test buttons

---

## 📞 Need Help?

If tests fail:
1. Check the detailed test scenario document: `HOLOGRAM_ROLL_UPDATE_TEST_SCENARIO.md`
2. Review console logs for errors
3. Use "Debug Storage" button to inspect data
4. Clear test data and start fresh

---

**Happy Testing! 🎉**
