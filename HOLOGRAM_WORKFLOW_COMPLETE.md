# Complete Hologram Request Workflow

## Overview
This document describes the complete end-to-end workflow for hologram requests from submission to completion, with automatic status tracking in the Daily Hologram Record Register.

## Workflow Stages

### Stage 1: Request Submission (Supply Chain User)
**Location**: `/dev-hologramrequestlevel1`

**Actions**:
1. Supply Chain User fills out hologram request form:
   - Date to Use Hologram in Factory
   - Hologram to Use for Which Brand
   - Bottle Size (Quantity)
   - Hologram Type (LOCAL/EXPORT/DEFENCE)
   - Total Number of Holograms
   - Additional Information/Remarks

2. User clicks "Submit Request"

**Result**:
- Request saved to `localStorage.hologramRequests`
- Status: `PENDING`
- Entry automatically created in Daily Hologram Record Register
- **Daily Register Status**: `APPLIED` (Blue badge)
- **Time Display**: "Awaiting Approval"

---

### Stage 2: Officer Approval (Officer In-Charge)
**Location**: `/dev-officer-in-charge` → Hologram Register Tab → Request Register Entries

**Actions**:
1. Officer In-Charge views pending requests
2. Reviews request details
3. Clicks green checkmark (✓) to approve
4. System allocates hologram serial numbers
5. Approval date and time recorded

**Result**:
- Request status updated to `APPROVED`
- Approval date/time saved
- Entry moves to "Pending Verification Entries" in Manufacturing Register
- **Daily Register Status**: `UNDER_PROCESS` (Yellow badge)
- **Deadline Set**: 5 PM on approval date
- **Time Display**: Countdown timer (e.g., "6h 30m remaining")
- **Overdue Alert**: If past 5 PM, shows "Overdue by Xh Ym"

---

### Stage 3: Manufacturing Completion (Officer In-Charge)
**Location**: `/dev-officer-in-charge` → Manufacturing Register Tab → Pending Verification Entries

**Actions**:
1. Officer In-Charge views pending verification entries
2. Verifies manufacturing is complete
3. Clicks "Verify & Complete" button
4. Completion date and time recorded

**Result**:
- Entry saved to `localStorage.hologramManufacturingRegister`
- Manufacturing status: `COMPLETED`
- Completion date/time saved
- **Daily Register Status**: `COMPLETED` (Green badge)
- **Time Display**: "Completed"
- **Completed On Time**: Shows "Yes" (green) or "No" (yellow) based on 5 PM deadline

---

## Daily Hologram Record Register

### Status Flow

```
APPLIED (Blue)
    ↓ Officer approves
UNDER_PROCESS (Yellow)
    ↓ Officer completes manufacturing
COMPLETED (Green)
```

### Status Meanings

| Status | Badge Color | Icon | Meaning | Time Display |
|--------|-------------|------|---------|--------------|
| **APPLIED** | Blue | 📄 | Request submitted, awaiting officer approval | "Awaiting Approval" |
| **UNDER_PROCESS** | Yellow | ⏳ | Approved by officer, manufacturing in progress | Countdown to 5 PM deadline |
| **COMPLETED** | Green | ✅ | Manufacturing verified and completed | "Completed" |

### Time Tracking

#### For APPLIED Status:
- No deadline yet
- Shows "Awaiting Approval"
- No overdue tracking

#### For UNDER_PROCESS Status:
- Deadline: 5 PM on approval date
- Shows countdown: "6h 30m remaining"
- Color coding:
  - **Green**: More than 4 hours remaining
  - **Yellow**: 2-4 hours remaining
  - **Red**: Less than 2 hours remaining
  - **Bold Red**: OVERDUE

#### For COMPLETED Status:
- Shows "Completed"
- Displays "Completed On Time" badge:
  - **Green "Yes"**: Completed before 5 PM
  - **Yellow "No"**: Completed after 5 PM

### Statistics Dashboard

The register shows 6 key metrics:

1. **Total Entries**: All requests in the register
2. **Applied**: Requests awaiting approval (Blue)
3. **Under Process**: Approved, being manufactured (Yellow)
4. **Completed On Time**: Finished before 5 PM (Green)
5. **Completed Late**: Finished after 5 PM (Gray)
6. **Overdue**: Past 5 PM, still under process (Red)

### Overdue Alerts

When entries are overdue (past 5 PM and still UNDER_PROCESS):

1. **Red Alert Banner** appears on Commissioner Dashboard
2. **Badge with count** shows on "DAILY HOLOGRAM REGISTER" tab
3. **Overdue entries highlighted** in red in the table
4. **"Show Only Overdue"** filter checkbox available
5. **Overdue hours calculated** and displayed

---

## Data Storage

### localStorage Keys

#### hologramRequests
Stores all hologram requests with status tracking:
```json
{
  "id": "unique-id",
  "referenceNo": "HRQ/2025/001",
  "refNumber": "HRQ/2025/001",
  "submissionDate": "2025-11-17",
  "submissionTime": "09:00:00",
  "usageDate": "2025-11-17",
  "brandName": "sikkim-supreme",
  "bottleSize": "750ml",
  "totalHolograms": 5000,
  "hologramType": "LOCAL",
  "type": "LOCAL",
  "status": "PENDING|APPROVED|REJECTED",
  "approvalDate": "2025-11-17",
  "approvalTime": "10:30:00",
  "approvedQuantity": 5000,
  "distilleryName": "Sikkim Distilleries Ltd",
  "allocations": [...]
}
```

#### hologramManufacturingRegister
Stores completion records:
```json
{
  "referenceNo": "HRQ/2025/001",
  "status": "COMPLETED",
  "completionDate": "2025-11-17T16:30:00",
  "completionTime": "16:30:00"
}
```

#### overdueHologramEntries
Stores current overdue entries for dashboard alerts:
```json
[
  {
    "referenceNo": "HRQ/2025/004",
    "status": "UNDER_PROCESS",
    "isOverdue": true,
    "overdueHours": 3,
    ...
  }
]
```

---

## Testing the Complete Workflow

### Step-by-Step Test

1. **Submit Request** (Supply Chain User)
   - Go to: http://localhost:4200/dev-hologramrequestlevel1
   - Fill form and submit
   - Check Daily Register: Should show status "APPLIED"

2. **Approve Request** (Officer In-Charge)
   - Go to: http://localhost:4200/dev-officer-in-charge
   - Click "Hologram Register" tab
   - Find request in "Request Register Entries"
   - Click green checkmark to approve
   - Check Daily Register: Should show status "UNDER_PROCESS" with countdown

3. **Complete Manufacturing** (Officer In-Charge)
   - Stay on Officer In-Charge page
   - Click "Manufacturing Register" tab
   - Find entry in "Pending Verification Entries"
   - Click "Verify & Complete"
   - Check Daily Register: Should show status "COMPLETED"

4. **View in Commissioner Dashboard**
   - Go to: http://localhost:4200/dev-commissioner-dashboard
   - Click "DAILY HOLOGRAM REGISTER" tab
   - See complete history with all statuses
   - Filter by status, distillery, date range, etc.

### Sample Data

Click "Load Sample Data" button to see:
- 1 APPLIED request (Teesta Valley Breweries)
- 3 UNDER_PROCESS requests (various distilleries)
- 2 COMPLETED requests (1 on time, 1 late)

---

## Filters Available

### Reference Number
- Search by reference number
- Example: "HRQ/2025/001"

### Distillery/Brewery
- Filter by specific distillery
- Options:
  - Sikkim Distilleries Ltd
  - Himalayan Distilleries Pvt Ltd
  - Royal Sikkim Brewery
  - Mountain View Distilleries
  - Eastern Himalaya Distillery
  - Gangtok Premium Spirits
  - Teesta Valley Breweries
  - Khangchendzonga Distillery

### Status
- All Status
- Applied
- Under Process
- Completed

### Type
- All Types
- LOCAL
- EXPORT
- DEFENCE

### Date Range
- Date From
- Date To

### Show Only Overdue
- Checkbox to filter only overdue entries

---

## Key Features

### Automatic Status Updates
✅ Status automatically changes based on workflow stage
✅ No manual status updates needed
✅ Real-time synchronization across components

### Time Tracking
✅ Automatic deadline calculation (5 PM on approval date)
✅ Real-time countdown display
✅ Overdue detection and alerts
✅ On-time completion tracking

### Commissioner Visibility
✅ Complete view of all requests
✅ Filter by any criteria
✅ Export functionality
✅ Historical data access

### Accountability
✅ Tracks submission date/time
✅ Tracks approval date/time
✅ Tracks completion date/time
✅ Shows which distillery submitted
✅ Complete audit trail

### Alerts & Notifications
✅ Overdue alert banner on dashboard
✅ Badge count on tab
✅ Color-coded status indicators
✅ Visual warnings for approaching deadlines

---

## Business Rules

### Deadline Rule
- **Deadline**: 5 PM on the day of approval
- **Calculation**: Approval date + 17:00:00
- **Applies to**: Only UNDER_PROCESS status
- **Overdue**: Any time after 5 PM while still UNDER_PROCESS

### Status Transitions
- **APPLIED → UNDER_PROCESS**: When officer approves
- **UNDER_PROCESS → COMPLETED**: When officer verifies manufacturing
- **No backwards transitions**: Status only moves forward

### Completion Timing
- **On Time**: Completed before or at 5 PM deadline
- **Late**: Completed after 5 PM deadline
- **Overdue**: Still under process after 5 PM deadline

---

## Integration Points

### Supply Chain User Interface
- Submits requests
- Creates entries in Daily Register
- Sets initial status to APPLIED

### Officer In-Charge Interface
- Approves requests
- Changes status to UNDER_PROCESS
- Sets deadline
- Completes manufacturing
- Changes status to COMPLETED

### Commissioner Dashboard
- Views all entries
- Monitors progress
- Receives overdue alerts
- Filters and exports data

---

## Future Enhancements

Potential improvements:
- Email notifications at each stage
- SMS alerts for overdue entries
- Configurable deadline times
- Escalation workflow
- Performance analytics
- Automated reports
- Mobile app integration
- Real-time dashboard updates
- Predictive analytics for delays

---

## Troubleshooting

### Request not showing in Daily Register
- **Check**: Is request saved in localStorage?
- **Solution**: Submit request again from hologram request form

### Status not updating to UNDER_PROCESS
- **Check**: Did officer approve the request?
- **Solution**: Go to Officer In-Charge → Hologram Register → Approve request

### Status not updating to COMPLETED
- **Check**: Did officer complete manufacturing verification?
- **Solution**: Go to Officer In-Charge → Manufacturing Register → Verify & Complete

### Overdue alert not showing
- **Check**: Is current time past 5 PM on approval date?
- **Wait**: System checks every 30 seconds
- **Refresh**: Click refresh button

---

## Summary

The Daily Hologram Record Register provides complete visibility into the hologram request workflow with automatic status tracking, time-based monitoring, and proactive alerts. The system ensures accountability, transparency, and timely processing of all hologram requests from submission to completion.
