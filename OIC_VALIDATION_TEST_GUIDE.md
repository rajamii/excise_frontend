# OIC Daily Hologram Register - Validation Testing Guide

## Quick Test Steps

### 1. Create Test Data
1. Navigate to the OIC Daily Hologram Register page
2. Click "Create Test Approval" button
3. A test entry will be created with:
   - Reference: `TEST/HRQ/2025/XXXXXX`
   - Hologram Type: LOCAL (or current selected type)
   - Quantity: 500 units
   - Allocated Range: `HG001001 - HG001500`

### 2. Test Range Validation

#### Test Case 1: Valid Range Within Allocated Bounds ✅
1. Select the test roll from dropdown
2. Enter Issued FROM: `HG001001`
3. Enter Issued TO: `HG001100`
4. **Expected**: No error, quantity calculated as 100
5. Click "Lock Roll" - should succeed

#### Test Case 2: Range Outside Allocated Bounds ❌
1. Select the test roll from dropdown
2. Enter Issued FROM: `HG001400`
3. Enter Issued TO: `HG001600`
4. **Expected**: Red border, error message "Serial range must be entirely within ONE of the allocated ranges: HG001001-HG001500"
5. Lock button should be disabled

#### Test Case 3: Overlapping Issued Ranges ❌
1. Select the test roll from dropdown
2. Enter first Issued range: FROM `HG001001` TO `HG001100`
3. Click "Add Range" to add second issued range
4. Enter second Issued range: FROM `HG001050` TO `HG001150`
5. **Expected**: Red border on both ranges, error message about overlap
6. Lock button should be disabled

#### Test Case 4: Issued and Wastage Overlap ❌
1. Select the test roll from dropdown
2. Enter Issued FROM: `HG001001` TO `HG001100`
3. Enter Wastage FROM: `HG001050` TO `HG001150`
4. **Expected**: Red border on both fields, error message "Overlaps with wastage range..."
5. Lock button should be disabled

#### Test Case 5: Valid Multiple Ranges ✅
1. Select the test roll from dropdown
2. Enter first Issued range: FROM `HG001001` TO `HG001100`
3. Click "Add Range"
4. Enter second Issued range: FROM `HG001101` TO `HG001200`
5. Enter Wastage FROM: `HG001201` TO `HG001250`
6. **Expected**: No errors, all ranges valid
7. Left Over should show: 250 (500 - 100 - 100 - 50)
8. Click "Lock Roll" - should succeed

#### Test Case 6: Cross-Roll Validation ❌
1. Lock first roll with range `HG001001` to `HG001100`
2. Select the same roll again (if available) or create another test entry
3. Try to enter range `HG001050` to `HG001150`
4. **Expected**: Error message "Range overlaps with issued range from locked roll..."
5. Lock button should be disabled

#### Test Case 7: Incomplete Range ❌
1. Select the test roll from dropdown
2. Enter only Issued FROM: `HG001001` (leave TO empty)
3. Try to click "Lock Roll"
4. **Expected**: Alert message "Both 'ISSUED FROM' and 'ISSUED TO' must be filled for each range"
5. Lock should fail

### 3. Test Lock and Save Flow

#### Complete Entry Flow ✅
1. Create test approval
2. Select roll from dropdown
3. Enter valid Issued range: `HG001001` to `HG001300`
4. Enter valid Wastage range: `HG001301` to `HG001350`
5. Verify Left Over: 150 (500 - 300 - 50)
6. Click "Lock Roll" - should succeed
7. Roll should appear in "Locked Rolls" section
8. Click "Save Entry" - should succeed
9. Entry should be marked as "Saved" with green badge

### 4. Visual Validation Indicators

#### What to Look For:
- ✅ **Valid Input**: Normal white background, no border
- ❌ **Invalid Input**: Red border (`is-invalid` class)
- 📝 **Error Message**: Red text below invalid field
- 🔒 **Lock Button**: 
  - Enabled (blue) when all validations pass
  - Disabled (gray) when validations fail
- 💾 **Save Button**:
  - Enabled when all rolls are locked
  - Disabled when current roll selection exists

### 5. Clear Test Data
1. Click "Clear Test Data" button
2. Confirm twice (safety check)
3. All test entries should be removed
4. Page should show "No Entries Found"

## Expected Behavior Summary

| Scenario | Input | Expected Result |
|----------|-------|-----------------|
| Valid range | 001001-001100 | ✅ No error, quantity calculated |
| Out of bounds | 001400-001600 | ❌ Error: "must be within allocated ranges" |
| Overlapping issued | 001001-001100, 001050-001150 | ❌ Error: "ranges overlap" |
| Issued/Wastage overlap | Issued 001001-001100, Wastage 001050-001150 | ❌ Error: "overlaps with wastage" |
| Cross-roll overlap | Roll1: 001001-001100, Roll2: 001050-001150 | ❌ Error: "overlaps with locked roll" |
| Incomplete range | FROM: 001001, TO: (empty) | ❌ Error: "both FROM and TO must be filled" |
| Valid multiple ranges | 001001-001100, 001101-001200 | ✅ No error, lock succeeds |

## Troubleshooting

### Issue: Lock button always disabled
- Check if all ranges have both FROM and TO filled
- Check if any ranges show red border (validation error)
- Check if Left Over is negative

### Issue: Error message not showing
- Ensure you've entered both FROM and TO serials
- Try changing the input to trigger validation
- Check browser console for any errors

### Issue: Can't save entry
- Ensure all rolls are locked (no current roll selection)
- Check if all allocated ranges are locked
- Verify Left Over is not negative

## Notes

- Validation happens in real-time as you type
- Serial numbers are extracted numerically (HG001001 → 1001)
- Ranges must be entirely within a single allocated range
- Cross-roll validation prevents duplicate serial usage
- All validations must pass before locking a roll
