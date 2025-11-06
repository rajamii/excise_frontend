# Hologram Multiple Entries - Test Scenarios

## Test Scenario 1: Basic Multiple Entries

### Setup
1. Open Hologram Daily Register
2. Select date: 2024-12-15
3. Select type: LOCAL
4. Add new entry or edit existing entry

### Test Case 1.1: Multiple Issued Ranges
**Steps:**
1. Click "➕ Add Range" in Issued column
2. Enter first range: From HG001001, To HG001030 (should calculate 30)
3. Click "➕ Add Range" again
4. Enter second range: From HG001041, To HG001070 (should calculate 30)
5. Click "➕ Add Range" again
6. Enter third range: From HG001081, To HG001100 (should calculate 20)

**Expected Results:**
- Each range shows correct quantity (30, 30, 20)
- Total Issued shows: **80**
- All ranges are editable
- Remove buttons (➖) appear for each range
- Cannot remove if only 1 range remains

### Test Case 1.2: Multiple Wastage Ranges
**Steps:**
1. Click "➕ Add Range" in Wastage column
2. Enter first range: From HG001031, To HG001040 (should calculate 10)
3. Add damage reason: "Printing defects"
4. Click "➕ Add Range" again
5. Enter second range: From HG001071, To HG001080 (should calculate 10)
6. Add damage reason: "Physical damage"

**Expected Results:**
- Each wastage range shows correct quantity (10, 10)
- Total Wastage shows: **20**
- Each range has its own damage reason field
- Remove buttons (➖) appear for each range

### Test Case 1.3: Left Over Calculation
**Steps:**
1. Set Utilized Quantity: 100
2. Verify calculations

**Expected Results:**
- Total Issued: 80
- Total Wastage: 20
- Utilized: 100
- Left Over: 100 - 80 - 20 = **0**

## Test Scenario 2: Data Validation

### Test Case 2.1: Serial Range Validation
**Steps:**
1. Enter invalid range: From HG001050, To HG001040 (to < from)
2. Check quantity calculation

**Expected Results:**
- Quantity should show 0 or error
- System should handle gracefully

### Test Case 2.2: Empty Fields
**Steps:**
1. Leave From Serial empty
2. Enter To Serial: HG001050
3. Check quantity

**Expected Results:**
- Quantity should be 0
- No errors thrown

### Test Case 2.3: Non-numeric Serials
**Steps:**
1. Enter From Serial: ABC123
2. Enter To Serial: ABC150
3. Check quantity calculation

**Expected Results:**
- Should extract numeric parts (123, 150)
- Quantity should be 28 (150-123+1)

## Test Scenario 3: Legacy Data Migration

### Test Case 3.1: Existing Single Entry
**Setup:**
Create entry with legacy structure:
```json
{
  "id": "legacy-1",
  "date": "2024-12-14",
  "hologramType": "LOCAL",
  "issuedFromSerial": "HG001001",
  "issuedToSerial": "HG001050",
  "issuedQuantity": 50,
  "wastageFromSerial": "HG001051",
  "wastageToSerial": "HG001060",
  "wastageQuantity": 10,
  "damageReason": "Old damage reason",
  "utilizedQuantity": 60,
  "leftOverQuantity": 0,
  "isFixed": true
}
```

**Expected Results:**
- Entry should be migrated to new structure
- `issuedEntries` array should contain 1 entry with legacy data
- `wastageEntries` array should contain 1 entry with legacy data
- Display should show both legacy and new structure correctly

## Test Scenario 4: User Interface

### Test Case 4.1: Add/Remove Buttons
**Steps:**
1. Start with 1 issued range
2. Click "➕ Add Range" - should add new row
3. Click "➖ Remove" on second row - should remove it
4. Try to click "➖ Remove" on last remaining row

**Expected Results:**
- Add button always works
- Remove button works when >1 row
- Cannot remove last row (button disabled or hidden)

### Test Case 4.2: Visual Totals
**Steps:**
1. Add multiple ranges with different quantities
2. Check total display

**Expected Results:**
- Totals should be bold and clearly visible
- Totals should update in real-time as ranges change
- Totals should be at bottom of each section

### Test Case 4.3: Responsive Design
**Steps:**
1. Test on different screen sizes
2. Check mobile view

**Expected Results:**
- Multiple entries should display properly on all screen sizes
- Buttons should remain accessible
- Text should not overflow

## Test Scenario 5: Data Persistence

### Test Case 5.1: Save and Reload
**Steps:**
1. Create entry with multiple ranges
2. Save entry (mark as fixed)
3. Refresh page or navigate away and back
4. Check if data persists

**Expected Results:**
- All multiple entries should be saved
- Data should reload correctly
- No data loss

### Test Case 5.2: Service Integration
**Steps:**
1. Create multiple entries
2. Check localStorage
3. Verify service methods work correctly

**Expected Results:**
- Data saved in correct format
- Service methods return correct totals
- Monthly calculations work with multiple entries

## Test Scenario 6: Edge Cases

### Test Case 6.1: Large Numbers
**Steps:**
1. Enter very large serial numbers
2. Test calculation performance

**Expected Results:**
- System should handle large numbers
- No performance issues
- Calculations remain accurate

### Test Case 6.2: Special Characters
**Steps:**
1. Enter serials with special characters: HG-001-001
2. Test extraction logic

**Expected Results:**
- Should extract numeric parts correctly
- No crashes or errors

### Test Case 6.3: Empty Arrays
**Steps:**
1. Create entry with empty issuedEntries array
2. Test initialization

**Expected Results:**
- Should initialize with at least 1 empty entry
- No errors thrown

## Success Criteria

✅ **All test cases pass**  
✅ **No TypeScript errors**  
✅ **No runtime errors**  
✅ **Data persists correctly**  
✅ **UI is responsive and intuitive**  
✅ **Legacy data migrates properly**  
✅ **Calculations are accurate**  
✅ **Performance is acceptable**  

## Manual Testing Checklist

- [ ] Test Case 1.1: Multiple Issued Ranges
- [ ] Test Case 1.2: Multiple Wastage Ranges  
- [ ] Test Case 1.3: Left Over Calculation
- [ ] Test Case 2.1: Serial Range Validation
- [ ] Test Case 2.2: Empty Fields
- [ ] Test Case 2.3: Non-numeric Serials
- [ ] Test Case 3.1: Legacy Data Migration
- [ ] Test Case 4.1: Add/Remove Buttons
- [ ] Test Case 4.2: Visual Totals
- [ ] Test Case 4.3: Responsive Design
- [ ] Test Case 5.1: Save and Reload
- [ ] Test Case 5.2: Service Integration
- [ ] Test Case 6.1: Large Numbers
- [ ] Test Case 6.2: Special Characters
- [ ] Test Case 6.3: Empty Arrays

## Notes
- Test in different browsers (Chrome, Firefox, Safari, Edge)
- Test with different data volumes (1 entry vs 100 entries)
- Test concurrent usage scenarios
- Verify accessibility compliance
- Check console for any warnings or errors