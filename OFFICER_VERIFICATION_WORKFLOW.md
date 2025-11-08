# Officer In Charge - Hologram Entry Verification Workflow

## Overview
This document explains the workflow for Officer in Charge to verify and approve hologram entries submitted by Supply Chain users.

## Workflow Steps

### 1. Supply Chain User Submits Entry
**Location:** `http://localhost:4200/dev-hologram-daily-register`

1. Supply Chain user navigates to the Daily Hologram Register
2. User enters hologram usage data:
   - Issued From/To Serial numbers
   - Wastage From/To Serial numbers (optional)
   - Damage reason (if applicable)
3. User clicks **"Save Entry"** button
4. System shows confirmation modal with calculation verification
5. User clicks **"Confirm & Save"**
6. Entry is saved with status: **PENDING**
7. Entry is sent to Officer in Charge for verification

### 2. Officer In Charge Reviews Entry
**Location:** `http://localhost:4200/dev-hologram-manufacturing-register`

1. Officer navigates to the Manufacturing Register (Verification Page)
2. System displays all pending entries submitted by Supply Chain users
3. Officer can see:
   - Reference Number
   - Date
   - Brand Details
   - Hologram Quantity
   - Issued Quantity
   - Wastage Quantity
   - Left Over Quantity
   - Total Calculation
   - Submitted By (user name)
   - Submission timestamp

### 3. Officer Approves or Rejects Entry

#### Approval Process:
1. Officer clicks **"Approve"** button (green checkmark)
2. System shows approval modal with entry details
3. System verifies calculation matches hologram quantity
4. Officer clicks **"Approve Entry"**
5. Entry status changes to: **APPROVED**
6. Entry is added to approved hologram entries
7. Entry becomes visible in Daily Register as approved

#### Rejection Process:
1. Officer clicks **"Reject"** button (red X)
2. System shows rejection modal
3. Officer enters rejection reason (required)
4. Officer clicks **"Confirm Rejection"**
5. Entry status changes to: **REJECTED**
6. Rejection reason is saved for audit trail

## Features

### Summary Dashboard
- **Total Entries:** All entries for selected period
- **Pending Approval:** Entries waiting for officer review
- **Approved:** Entries approved by officer
- **Rejected:** Entries rejected by officer

### Filters
- **Date Filter:** Filter by specific date
- **Month Filter:** Filter by month
- **Year Filter:** Filter by year
- **Hologram Type:** LOCAL, EXPORT, or DEFENCE

### Auto-Refresh
- System automatically checks for new entries every 30 seconds
- Manual refresh button available for immediate updates

### Calculation Verification
- System automatically verifies:
  - Total = Issued + Wastage + Left Over
  - Total matches Hologram Quantity
- Visual indicators:
  - ✓ Green checkmark = Calculation matches
  - ✗ Red X = Calculation mismatch

## Data Flow

```
Supply Chain User (Daily Register)
    ↓
    Saves Entry
    ↓
localStorage: dailyRegisterEntries
    ↓
Officer In Charge (Manufacturing Register)
    ↓
    Reviews Entry
    ↓
    Approves/Rejects
    ↓
localStorage: approvedHologramEntries (if approved)
    ↓
Daily Register (shows approved entries)
```

## Access URLs

- **Supply Chain User (Entry):** `http://localhost:4200/dev-hologram-daily-register`
- **Officer In Charge (Verification):** `http://localhost:4200/dev-hologram-manufacturing-register`

## Status Flow

```
PENDING → APPROVED → Visible in Daily Register
   ↓
REJECTED → Audit Trail
```

## Technical Details

### LocalStorage Keys
- `dailyRegisterEntries` - All saved entries (pending, approved, rejected)
- `approvedHologramEntries` - Only approved entries for daily register

### Entry Status Values
- `PENDING` - Waiting for officer approval
- `APPROVED` - Approved by officer
- `REJECTED` - Rejected by officer

### Entry Metadata
Each entry includes:
- `id` - Unique identifier
- `date` - Entry date
- `hologramType` - LOCAL, EXPORT, or DEFENCE
- `referenceNo` - Reference number
- `brandDetails` - Brand information
- `issuedQuantity` - Issued hologram quantity
- `wastageQuantity` - Wastage quantity
- `leftOverQuantity` - Remaining quantity
- `savedBy` - User who saved the entry
- `savedAt` - Timestamp when saved
- `approvalStatus` - PENDING, APPROVED, or REJECTED
- `approvedBy` - Officer who approved (if approved)
- `approvedAt` - Approval timestamp (if approved)
- `rejectedBy` - Officer who rejected (if rejected)
- `rejectedAt` - Rejection timestamp (if rejected)
- `rejectionReason` - Reason for rejection (if rejected)

## Security & Audit Trail

- All entries are timestamped
- User information is recorded (who saved, who approved/rejected)
- Rejection reasons are mandatory and saved
- Complete audit trail maintained in localStorage

## Future Enhancements

1. Role-based access control
2. Email notifications to Supply Chain users on approval/rejection
3. Export functionality for audit reports
4. Advanced filtering and search
5. Bulk approval/rejection
6. Comments/notes on entries
7. History view of all actions
