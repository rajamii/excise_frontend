# Officer In Charge Verification - Testing Guide

## Quick Test Scenario

### Step 1: Create Test Entry as Supply Chain User

1. Navigate to: `http://localhost:4200/dev-hologram-daily-register`
2. Click **"Create Test Roll"** button (if no rolls exist)
   - Enter Cartoon Number: `TEST001`
   - Enter Total Count: `1000`
3. Find the auto-generated entry in the table
4. Fill in the hologram usage:
   - **Issued From Serial:** `HG001001`
   - **Issued To Serial:** `HG001500`
   - **Issued Qty:** Auto-calculated (500)
   - **Wastage From Serial:** `HG001501` (optional)
   - **Wastage To Serial:** `HG001510` (optional)
   - **Wastage Qty:** Auto-calculated (10)
   - **Left Over:** Auto-calculated (490)
5. Click **"Save Entry"** button
6. Review the confirmation modal
7. Click **"Confirm & Save"**
8. ✅ Entry is saved and sent to Officer for verification

### Step 2: Verify Entry as Officer In Charge

1. Navigate to: `http://localhost:4200/dev-hologram-manufacturing-register`
2. You should see the entry in the **Pending Approval** section
3. Review the entry details:
   - Reference Number
   - Date
   - Brand Details
   - Hologram Qty: 1000
   - Issued Qty: 500
   - Wastage Qty: 10
   - Left Over: 490
   - Total: 1000 (should match Hologram Qty)
4. Verify calculation: 500 + 10 + 490 = 1000 ✓

### Step 3: Approve Entry

1. Click the **green checkmark** button (Approve)
2. Review the approval modal
3. Verify calculation verification shows: ✓ Matches
4. Click **"Approve Entry"**
5. ✅ Entry is approved and status changes to **APPROVED**

### Step 4: Verify Approved Entry in Daily Register

1. Navigate back to: `http://localhost:4200/dev-hologram-daily-register`
2. The approved entry should now be visible in the register
3. Entry should be marked as **Fixed** (cannot be edited)

## Test Scenario 2: Rejection Flow

### Step 1: Create Another Test Entry

1. Navigate to: `http://localhost:4200/dev-hologram-daily-register`
2. Create another entry with different data
3. Save the entry

### Step 2: Reject Entry as Officer

1. Navigate to: `http://localhost:4200/dev-hologram-manufacturing-register`
2. Find the new pending entry
3. Click the **red X** button (Reject)
4. Enter rejection reason: "Incorrect serial numbers"
5. Click **"Confirm Rejection"**
6. ✅ Entry is rejected and status changes to **REJECTED**

## Test Scenario 3: Filter Testing

### Test Filters

1. Navigate to: `http://localhost:4200/dev-hologram-manufacturing-register`
2. Test **Date Filter:**
   - Select today's date
   - Verify only today's entries are shown
3. Test **Month Filter:**
   - Select current month
   - Verify entries for current month are shown
4. Test **Hologram Type Filter:**
   - Click **LOCAL** tab
   - Verify only LOCAL entries are shown
   - Click **EXPORT** tab
   - Verify only EXPORT entries are shown
5. Test **Clear Filters:**
   - Click **"Clear Filters"** button
   - Verify all filters reset to current date/month/year

## Test Scenario 4: Auto-Refresh

### Test Auto-Refresh Feature

1. Open two browser windows side by side:
   - Window 1: `http://localhost:4200/dev-hologram-daily-register`
   - Window 2: `http://localhost:4200/dev-hologram-manufacturing-register`
2. In Window 1 (Daily Register):
   - Create and save a new entry
3. In Window 2 (Officer Verification):
   - Wait up to 30 seconds
   - The new entry should automatically appear
   - Or click **"Refresh"** button for immediate update

## Test Scenario 5: Calculation Verification

### Test Calculation Mismatch Detection

1. Navigate to: `http://localhost:4200/dev-hologram-daily-register`
2. Create an entry with:
   - Hologram Qty: 1000
   - Issued Qty: 600
   - Wastage Qty: 500
   - Left Over: -100 (negative!)
3. System should show validation error
4. Entry cannot be saved until calculation is correct

## Expected Results

### Summary Cards Should Show:
- **Total Entries:** Count of all entries
- **Pending Approval:** Count of pending entries
- **Approved:** Count of approved entries
- **Rejected:** Count of rejected entries

### Entry Status Indicators:
- **PENDING:** Yellow badge
- **APPROVED:** Green badge, green row highlight
- **REJECTED:** Red badge, red row highlight

### Calculation Verification:
- ✓ Green checkmark = Calculation matches
- ✗ Red X = Calculation mismatch

## Troubleshooting

### No Entries Showing?
1. Check if you're on the correct date/month/year
2. Click **"Clear Filters"** to reset
3. Click **"Refresh"** to reload data
4. Check browser console for errors

### Entry Not Appearing After Save?
1. Verify entry was saved successfully (check alert message)
2. Navigate to Officer verification page
3. Click **"Refresh"** button
4. Check localStorage in browser DevTools:
   - Key: `dailyRegisterEntries`
   - Should contain your entry

### Approval Not Working?
1. Check browser console for errors
2. Verify calculation matches hologram quantity
3. Try refreshing the page
4. Check localStorage for `approvedHologramEntries`

## Browser DevTools Debugging

### Check LocalStorage:
1. Open browser DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Expand **Local Storage**
4. Click on your domain
5. Look for these keys:
   - `dailyRegisterEntries` - All saved entries
   - `approvedHologramEntries` - Approved entries only

### Check Console Logs:
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for log messages:
   - "Loaded pending entries: X"
   - "Filtered entries: X"
   - "Entry saved for officer verification: ID"
   - "Entry approved successfully"

## Success Criteria

✅ Supply Chain user can save entries
✅ Officer can see pending entries
✅ Officer can approve entries
✅ Officer can reject entries with reason
✅ Approved entries appear in daily register
✅ Filters work correctly
✅ Auto-refresh works
✅ Calculation verification works
✅ Summary cards show correct counts
✅ Status badges display correctly

## Notes

- All data is stored in browser localStorage
- Clearing browser data will reset all entries
- Auto-refresh checks every 30 seconds
- Manual refresh is instant
- Rejection reason is mandatory
- Approved entries cannot be edited
