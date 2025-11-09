# Roll-by-Roll Workflow Implementation Guide

## Overview
This document explains the new **Roll-by-Roll Workflow** for the Daily Hologram Register, which provides a cleaner and more intuitive way to handle entries with multiple rolls.

## Problem Solved
**Before:** When an officer approved 2 or more rolls, the system created 2 separate rows in the daily register, making data entry confusing and difficult to manage.

**After:** The system now creates a **single row** for the approval, regardless of how many rolls are involved. Users complete each roll one by one in a guided workflow.

---

## Key Features

### 1. Single Row Per Approval
- One approval = One entry in the daily register
- Multiple rolls are handled within that single entry
- Cleaner table view with less clutter

### 2. Roll-by-Roll Data Entry
- User selects which roll to work on
- Enters data for that specific roll:
  - **Issued From** serial number
  - **Issued To** serial number
  - **Wastage From** serial number (optional)
  - **Wastage To** serial number (optional)
  - **Damage Reason** (if wastage exists)
- System automatically calculates:
  - Issued Quantity
  - Wastage Quantity
  - Left Over Quantity

### 3. Progressive Workflow
1. Complete Roll 1 → Click "Complete Roll 1"
2. System automatically moves to Roll 2
3. Complete Roll 2 → Click "Complete Roll 2"
4. Continue until all rolls are completed
5. Click "Save Complete Entry" to finalize

### 4. Visual Roll Tabs
- Each roll has its own tab showing:
  - Roll number
  - Cartoon number
  - Total quantity
  - Status (Pending/In Progress/Completed)
- Active roll is highlighted
- Completed rolls show green checkmark
- In-progress rolls show yellow indicator

### 5. Real-time Validation
- Validates that issued + wastage doesn't exceed total quantity
- Shows error if quantities exceed available amount
- Prevents saving until all rolls are completed
- Prevents saving if any roll has validation errors

### 6. Overall Summary
- Shows combined totals across all rolls:
  - Total Hologram Quantity
  - Total Issued
  - Total Wastage
  - Total Left Over
- Updates in real-time as you complete each roll

---

## User Workflow

### Step 1: View Entry with Multiple Rolls
When you open the daily register, entries with multiple rolls will show:
- A special expanded view (not a regular table row)
- Entry header with basic information
- Roll tabs showing all available rolls
- Current roll entry form

### Step 2: Select Roll to Work On
- Click on any roll tab to select it
- The selected roll becomes active (highlighted in blue)
- Entry form shows fields for that specific roll

### Step 3: Enter Roll Data
For the active roll, enter:

**Hologram Issued (Required):**
- Issued From: Starting serial number
- Issued To: Ending serial number
- System calculates: Issued Quantity

**Wastage (Optional):**
- Wastage From: Starting serial number (if any wastage)
- Wastage To: Ending serial number (if any wastage)
- System calculates: Wastage Quantity
- Damage Reason: Explain why wastage occurred

**Left Over (Auto-calculated):**
- System calculates: Total Quantity - (Issued + Wastage)
- Shows in green if positive
- Shows in red if negative (validation error)

### Step 4: Complete Current Roll
- Click "Complete Roll X" button
- System validates the data
- If valid, marks roll as completed
- Automatically moves to next roll (if available)

### Step 5: Repeat for All Rolls
- Continue entering data for each roll
- You can switch between rolls using the tabs
- Edit completed rolls by clicking "Edit This Roll"

### Step 6: Save Complete Entry
- Once all rolls are completed, click "Save Complete Entry"
- System validates all rolls
- Updates roll data in officer-in-charge overview
- Marks entry as saved (cannot be edited)

---

## Data Structure

### Entry with Multiple Rolls
```typescript
{
  id: "ENTRY_001",
  referenceNo: "HRQ/2025/001",
  date: "2025-11-09",
  hologramType: "LOCAL",
  utilizedQuantity: 2000, // Total across all rolls
  
  // Roll-by-roll data
  rollsData: [
    {
      rollId: "CTN001",
      rollNumber: 1,
      cartoonNumber: "CTN001",
      totalQuantity: 1000,
      issuedFromSerial: "HG001001",
      issuedToSerial: "HG001500",
      issuedQuantity: 500,
      wastageFromSerial: "HG001501",
      wastageToSerial: "HG001510",
      wastageQuantity: 10,
      leftOverQuantity: 490,
      damageReason: "Machine malfunction",
      isCompleted: true,
      completedAt: "2025-11-09T10:30:00Z"
    },
    {
      rollId: "CTN002",
      rollNumber: 2,
      cartoonNumber: "CTN002",
      totalQuantity: 1000,
      issuedFromSerial: "HG002001",
      issuedToSerial: "HG002800",
      issuedQuantity: 800,
      wastageFromSerial: "",
      wastageToSerial: "",
      wastageQuantity: 0,
      leftOverQuantity: 200,
      damageReason: "",
      isCompleted: true,
      completedAt: "2025-11-09T10:45:00Z"
    }
  ],
  
  currentRollIndex: 0, // Which roll user is currently editing
  totalRolls: 2,
  
  // Entry-level totals (sum of all rolls)
  issuedQuantity: 1300,
  wastageQuantity: 10,
  leftOverQuantity: 690,
  
  isFixed: false // Becomes true after saving
}
```

---

## Roll Data Updates

### When Entry is Saved
For each completed roll, the system updates:

1. **Rolls Available Tab** (hologramOverviewRolls):
   - Increases `usedCount` by roll's issued quantity
   - Increases `damagedCount` by roll's wastage quantity
   - Decreases `availableCount` by (issued + wastage)
   - Auto-updates `status`:
     - `AVAILABLE` if availableCount > 0
     - `COMPLETED` if availableCount = 0

2. **Available Hologram Tab** (hologramOverviewAvailable):
   - Decreases `availableCount` by (issued + wastage)
   - Recalculates `percentage`
   - Auto-updates `status`

3. **Serial Numbers Tab** (hologramOverviewSerialData):
   - Increases `usedCount` by roll's issued quantity
   - Increases `damagedCount` by roll's wastage quantity
   - Decreases `availableCount` by (issued + wastage)
   - Auto-updates `status`

### Example Update
**Before Save:**
```
Roll CTN001:
- Total: 1000
- Available: 1000
- Used: 0
- Damaged: 0
- Status: AVAILABLE
```

**After Save (Issued: 500, Wastage: 10):**
```
Roll CTN001:
- Total: 1000
- Available: 490
- Used: 500
- Damaged: 10
- Status: AVAILABLE
```

---

## Validation Rules

### Roll-Level Validation
1. **Issued From & To are required**
   - Cannot complete roll without these fields
   
2. **Issued Quantity must be > 0**
   - Serial numbers must be valid and calculate to positive quantity
   
3. **Total Usage cannot exceed Total Quantity**
   - (Issued + Wastage) ≤ Total Quantity
   - Shows error if exceeded
   
4. **Wastage requires Damage Reason**
   - If wastage > 0, damage reason is required

### Entry-Level Validation
1. **All rolls must be completed**
   - Cannot save entry until all rolls are marked complete
   
2. **No validation errors**
   - All rolls must pass validation
   
3. **Date is required**
   - Entry must have a valid date

---

## UI Components

### Roll Tab
- Shows roll number and cartoon number
- Displays total quantity
- Status badge (Pending/In Progress/Completed)
- Icon indicator:
  - ○ Circle = Pending
  - ✎ Pencil = In Progress
  - ✓ Check = Completed
- Click to select and edit

### Entry Form
- **Issued Section** (Blue border):
  - From/To serial inputs
  - Quantity display (auto-calculated)
  
- **Wastage Section** (Yellow border):
  - From/To serial inputs (optional)
  - Quantity display (auto-calculated)
  - Damage reason textarea
  
- **Left Over Summary**:
  - Shows calculation breakdown
  - Color-coded:
    - Green = Positive leftover
    - Blue = Zero leftover (fully utilized)
    - Red = Negative (validation error)

### Action Buttons
- **Complete Roll X**: Marks current roll as complete
- **Edit This Roll**: Reopens completed roll for editing
- **Save Complete Entry**: Finalizes and saves all rolls

### Overall Summary Card
- Shows totals across all rolls
- Updates in real-time
- Save button with progress indicator

---

## Benefits

### For Users
1. **Cleaner Interface**: One row per approval instead of multiple
2. **Guided Workflow**: Step-by-step process for each roll
3. **Less Confusion**: Clear indication of which roll you're working on
4. **Better Validation**: Real-time feedback on data entry
5. **Progress Tracking**: See which rolls are completed

### For Data Management
1. **Easier Storage**: Single entry with nested roll data
2. **Better Organization**: All roll data grouped together
3. **Accurate Tracking**: Each roll's data is separate and clear
4. **Automatic Updates**: Roll data updates happen per roll
5. **Audit Trail**: Completion timestamps for each roll

---

## Testing the Feature

### Test Scenario 1: Two Rolls
1. Create test approval with 2 rolls
2. Open daily register
3. Verify single row is shown (not 2 rows)
4. Complete Roll 1 with valid data
5. Verify system moves to Roll 2
6. Complete Roll 2 with valid data
7. Save entry
8. Verify roll data is updated correctly

### Test Scenario 2: Validation
1. Enter data that exceeds total quantity
2. Verify error message is shown
3. Verify "Complete Roll" button is disabled
4. Fix the data
5. Verify error clears and button enables

### Test Scenario 3: Edit Completed Roll
1. Complete a roll
2. Click "Edit This Roll"
3. Modify the data
4. Complete roll again
5. Verify changes are saved

---

## Migration from Old System

### Existing Entries
- Old entries (without rollsData) continue to work
- They use the legacy table row format
- No migration needed for existing data

### New Entries
- All new entries from officer approvals use roll-by-roll structure
- Automatically grouped by reference number
- Multiple rolls combined into single entry

---

## Technical Implementation

### Key Methods

**loadApprovedEntries()**: Groups entries by reference number and creates roll structure

**getCurrentRoll()**: Gets the roll user is currently editing

**selectRoll()**: Switches to a different roll

**onRollSerialChange()**: Calculates quantities when serials change

**completeCurrentRoll()**: Validates and marks roll as complete

**updateEntryTotalsFromRolls()**: Sums all roll data to entry level

**saveEntry()**: Validates all rolls and saves entry

**updateRollDataForSingleRoll()**: Updates roll data in officer overview

### Data Flow
1. Officer approves hologram request
2. Approval saved to localStorage
3. Daily register loads approved entries
4. Groups entries by reference number
5. Creates roll-by-roll structure
6. User completes each roll
7. System validates and saves
8. Updates roll data in officer overview

---

## Future Enhancements

### Possible Improvements
1. **Bulk Roll Entry**: Enter data for multiple rolls at once
2. **Roll Templates**: Save common patterns for quick entry
3. **Serial Number Validation**: Check against available serials
4. **Auto-fill**: Suggest next serial numbers
5. **Roll History**: Show previous usage of same roll
6. **Export**: Download roll-by-roll data as Excel

---

## Support

### Common Issues

**Q: I can't see the roll tabs**
A: Make sure the entry has multiple rolls (totalRolls > 1)

**Q: Complete Roll button is disabled**
A: Check that you've entered Issued From and To, and that leftover is not negative

**Q: Can't save entry**
A: Ensure all rolls are completed (green checkmark on all tabs)

**Q: How do I edit a saved entry?**
A: Saved entries cannot be edited. They are locked for data integrity.

**Q: Roll data not updating in officer overview**
A: Check browser console for errors. Verify cartoon number matches.

---

## Conclusion

The Roll-by-Roll Workflow provides a much cleaner and more intuitive way to handle multi-roll entries in the Daily Hologram Register. It reduces confusion, improves data accuracy, and makes the entry process more efficient.

**Key Takeaway**: One approval = One entry, with guided roll-by-roll data entry.
