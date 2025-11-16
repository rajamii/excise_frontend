# Daily Hologram Record Register - Quick Start Guide

## What You're Seeing Now

The Daily Hologram Record Register is currently **empty** because there are no approved hologram requests yet. This is normal for a fresh system!

## How to View the Register with Data

### Option 1: Load Sample Historical Data (Recommended for Testing)

1. Click the **"Load Sample Data"** button in the top right
2. This will create 6 sample entries showing:
   - **3 Completed entries** (from 3 days ago, 2 days ago, yesterday)
   - **3 Under Process entries** (from yesterday and today)
   - Some completed **on time** (before 5 PM)
   - Some completed **late** (after 5 PM)
   - Some **overdue** (still under process after 5 PM)

### Option 2: Create Real Data Through the Workflow

Follow this complete workflow:

#### Step 1: Create Hologram Request (Supply Chain User)
1. Go to Supply Chain → Hologram Request
2. Fill in the form:
   - Brand Name: Select any brand
   - Bottle Size: Select size
   - Hologram Quantity: Enter quantity
   - Usage Date: Select date
3. Submit the request

#### Step 2: Approve Request (Officer In-Charge)
1. Go to Officer In-Charge Dashboard
2. Click "Hologram Register" tab
3. Find your request in "Request Register Entries"
4. Click the green checkmark to approve
5. **Important**: Note the approval time!

#### Step 3: View in Daily Register (Commissioner)
1. Go to Commissioner Dashboard
2. Click "DAILY HOLOGRAM REGISTER" tab
3. You'll see your entry with:
   - Status: **UNDER_PROCESS**
   - Deadline: **5 PM on approval date**
   - Time Remaining: **Countdown timer**

#### Step 4: Complete Manufacturing (Officer In-Charge)
1. Go to Officer In-Charge Dashboard
2. Click "Manufacturing Register" tab
3. Find your entry in "Pending Verification Entries"
4. Click "Verify & Complete"
5. Entry moves to completed

#### Step 5: Check Completion Status (Commissioner)
1. Return to Daily Register
2. Entry now shows:
   - Status: **COMPLETED**
   - Completed On Time: **Yes/No** (based on 5 PM deadline)
   - Completion Date & Time

## Understanding the Register

### Register Columns

| Column | Description |
|--------|-------------|
| **SL. NO.** | Serial number |
| **REFERENCE NO.** | Unique request reference |
| **SUBMISSION DATE** | When request was submitted |
| **USAGE DATE** | Planned hologram usage date |
| **BRAND DETAILS** | Brand name, type, alcohol % |
| **TYPE** | LOCAL / EXPORT / DEFENCE |
| **BOTTLE SIZE** | Bottle size in ml |
| **HOLOGRAM QTY** | Quantity of holograms |
| **STATUS** | APPROVED / UNDER_PROCESS / COMPLETED |
| **TIME REMAINING** | Countdown to 5 PM deadline or overdue time |
| **COMPLETED ON TIME** | Yes/No (only for completed entries) |
| **ACTIONS** | View details button |

### Status Meanings

- **🟢 APPROVED**: Just approved by officer, not yet in process
- **🟡 UNDER_PROCESS**: Currently being processed, deadline active
- **🔵 COMPLETED**: Process finished, manufacturing verified

### Time Tracking

- **Green Text**: More than 4 hours remaining
- **Yellow Text**: 2-4 hours remaining
- **Red Text**: Less than 2 hours remaining
- **Bold Red**: OVERDUE (past 5 PM deadline)

### Overdue Alerts

When entries are overdue:
1. **Red alert banner** appears at top of Commissioner Dashboard
2. **Badge with count** shows on "DAILY HOLOGRAM REGISTER" tab
3. **Overdue entries highlighted** in red in the table
4. **"Show Only Overdue"** filter available

## Sample Data Details

When you load sample data, you'll see:

### Completed On Time ✅
- **HRQ/2025/001**: Sikkim Supreme Whisky (5,000 units)
  - Approved: 3 days ago at 10:30 AM
  - Completed: Same day at 4:30 PM
  - Status: ✅ Completed On Time

- **HRQ/2025/003**: Royal Sikkim Brandy (2,500 units)
  - Approved: Yesterday at 9:45 AM
  - Completed: Same day at 2:20 PM
  - Status: ✅ Completed On Time

### Completed Late ⚠️
- **HRQ/2025/002**: Himalayan Gold Rum (3,000 units)
  - Approved: 2 days ago at 11:15 AM
  - Completed: Same day at 6:45 PM (1h 45m late)
  - Status: ⚠️ Completed Late

### Under Process (Current) 🔄
- **HRQ/2025/004**: Mountain Dew Vodka (4,000 units)
  - Approved: Yesterday at 2:20 PM
  - Status: 🔴 OVERDUE (past 5 PM deadline)

- **HRQ/2025/005**: Gangtok Special Whisky (6,000 units)
  - Approved: Today at 8:00 AM
  - Status: 🟢 Under Process (time remaining)

- **HRQ/2025/006**: Teesta Valley Rum (3,500 units)
  - Approved: Today at 1:30 PM
  - Status: 🟡 Under Process (few hours remaining)

## Features to Try

### 1. Filtering
- **Reference Number**: Search by reference
- **Status**: Filter by UNDER_PROCESS or COMPLETED
- **Type**: Filter by LOCAL, EXPORT, or DEFENCE
- **Date Range**: Filter by approval date
- **Show Only Overdue**: See only overdue entries

### 2. Statistics Cards
- **Total Entries**: All entries in register
- **Under Process**: Currently being processed
- **Completed On Time**: Finished before 5 PM
- **Overdue**: Past deadline, still processing

### 3. View Details
- Click the eye icon on any entry
- See complete information including:
  - All entry details
  - Allocation information (cartoon numbers, serial ranges)
  - Time tracking details
  - Completion status

### 4. Export
- Click "Export" button
- Download register data (will be implemented with backend)

### 5. Refresh
- Click "Refresh" button
- Reload latest data from system

### 6. Clear All
- Click "Clear All" button
- Remove all register data (for testing)

## Real-World Usage

In production, this register will:

1. **Automatically populate** when officers approve requests
2. **Track all hologram processing** in real-time
3. **Alert commissioners** about overdue entries
4. **Maintain complete history** of all requests
5. **Provide audit trail** for compliance
6. **Generate reports** for management

## Troubleshooting

### "No entries found"
- **Solution**: Click "Load Sample Data" to see how it works
- **Or**: Create a real request through the workflow

### "Overdue alert not showing"
- **Check**: Are there entries past 5 PM deadline?
- **Wait**: System checks every 30 seconds
- **Refresh**: Click refresh button

### "Time not updating"
- **Wait**: Updates every 30 seconds automatically
- **Refresh**: Click refresh button to force update

### "Can't see completed status"
- **Check**: Has manufacturing been verified?
- **Verify**: Go to Officer In-Charge → Manufacturing Register
- **Complete**: Click "Verify & Complete" on the entry

## Next Steps

1. **Load Sample Data** to see the register in action
2. **Explore the filters** to find specific entries
3. **View entry details** to see complete information
4. **Try the real workflow** by creating a new request
5. **Monitor overdue alerts** to see time tracking

## Key Benefits

✅ **Complete Visibility**: See all hologram processing in one place
✅ **Time Tracking**: Know exactly when deadlines are approaching
✅ **Accountability**: Track who approved and when
✅ **Compliance**: Ensure timely processing
✅ **History**: Maintain complete audit trail
✅ **Alerts**: Proactive notification of delays

---

**Need Help?** The register automatically updates as requests flow through the system. Just approve requests as Officer In-Charge, and they'll appear here!
