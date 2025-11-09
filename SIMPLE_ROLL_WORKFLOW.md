# Simple Roll-by-Roll Workflow

## Overview
When an officer approves multiple rolls (e.g., 2 rolls), the system now creates **ONE single row** in the daily register instead of 2 separate rows.

## How It Works

### 1. View the Entry
- You'll see ONE row with a badge showing "2 Rolls" (or however many rolls were approved)
- The row has a new "ROLL" column with a dropdown

### 2. Select a Roll
- Click the dropdown in the "ROLL" column
- Choose which roll you want to work on
- Example: "CTN001 (1,000)" means Cartoon Number CTN001 with 1,000 holograms

### 3. Enter Serial Numbers
Once you select a roll, you can enter:
- **Issued From**: Starting serial number
- **Issued To**: Ending serial number
- **Wastage From**: (Optional) Wastage starting serial
- **Wastage To**: (Optional) Wastage ending serial

The system automatically calculates:
- Issued Quantity
- Wastage Quantity
- Left Over

### 4. Complete the Roll
- Click "Complete Roll" button in the Actions column
- System validates your data
- Roll is marked as completed ✓

### 5. Repeat for Other Rolls
- Select the next roll from the dropdown
- Enter its serial numbers
- Click "Complete Roll"
- Continue until all rolls are done

### 6. Save the Entry
- Once ALL rolls are completed, click "Save Entry"
- The button shows progress: "Save Entry 2/2"
- System saves all roll data and updates the officer overview

## Example

**Scenario**: Officer approved 2 rolls
- Roll 1: CTN001 with 1,000 holograms
- Roll 2: CTN002 with 1,500 holograms

**Steps**:
1. You see ONE row in the table
2. Select "CTN001 (1,000)" from dropdown
3. Enter: Issued From: HG001001, Issued To: HG001500
4. Click "Complete Roll" → Roll 1 done ✓
5. Select "CTN002 (1,500)" from dropdown
6. Enter: Issued From: HG002001, Issued To: HG002800
7. Click "Complete Roll" → Roll 2 done ✓
8. Click "Save Entry 2/2" → All done!

## Benefits
- ✅ Cleaner table - one row instead of multiple
- ✅ Easy to understand - just select roll and enter numbers
- ✅ Progress tracking - see which rolls are completed
- ✅ No confusion - clear workflow

## Notes
- You MUST complete all rolls before saving
- Each roll's data is validated separately
- Completed rolls show a ✓ checkmark in the dropdown
- You can only save when all rolls are completed
