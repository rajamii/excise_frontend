# OIC Transit Permit Component

## Overview
This component provides a dashboard for Officer-In-Charge (OIC) to review and manage transit permit applications submitted by licensees. The component dynamically fetches data from the backend API and displays it in a user-friendly interface.

## Features

### 1. Dynamic Data Loading
- Fetches transit permit data from the backend API (`/transactional/supply_chain/transit-permits/`)
- Groups permits by bill number for better organization
- Filters permits to show only those that have been paid (status code: TRP_02, TRP_03, TRP_04)

### 2. Statistics Dashboard
- **Pending Applications**: Shows count of permits awaiting OIC approval (TRP_02)
- **Approved Applications**: Shows count of approved permits (TRP_03)
- **Rejected Applications**: Shows count of rejected permits (TRP_04)
- **Total Applications**: Shows total count of all permits

### 3. Filtering Capabilities
- **Reference Number**: Search by bill number
- **Status**: Filter by PENDING, APPROVED, or REJECTED
- **Date Range**: Filter by application date (From Date and To Date)
- **Clear Filters**: Reset all filters to default

### 4. Data Table
Displays the following columns:
- Serial Number
- Reference Number (Bill No)
- Application Date
- Licensee Name (Sole Distributor)
- Destination (Depot Address)
- Vehicle Number
- Depot Address
- Total Amount (with PAID badge)
- Brand Details (clickable button showing count)
- Status (with color-coded badges)
- Actions (View, Approve, Reject)

### 5. Brand Details Popup
- Shows detailed information about all brands in a transit permit
- Displays:
  - Brand Name
  - Size (ml)
  - Number of Cases
  - Bottle Type
  - Brand Owner
  - Liquor Type
  - Manufacturing Unit
- Statistics: Total Products, Total Cases
- Export functionality (coming soon)

### 6. Actions
- **View**: View detailed information (coming soon)
- **Approve**: Approve the transit permit (calls API with action='APPROVE')
- **Reject**: Reject the transit permit (calls API with action='REJECT')

## API Integration

### Service: `OicTransitPermitService`

#### Endpoints Used:
1. **GET** `/transactional/supply_chain/transit-permits/`
   - Fetches all transit permits
   - Optional query parameter: `bill_no` to filter by bill number

2. **POST** `/transactional/supply_chain/transit-permits/action/{id}/`
   - Performs action on a transit permit
   - Body: `{ "action": "APPROVE" | "REJECT" }`

### Data Models:

#### TransitPermitDetail
```typescript
{
  id: number;
  bill_no: string;
  sole_distributor_name: string;
  date: string;
  depot_address: string;
  brand: string;
  size_ml: number;
  cases: number;
  vehicle_number: string;
  licensee_id: string;
  bottle_type: string;
  brand_owner: string;
  liquor_type: string;
  total_amount: number;
  status: string;
  status_code: string;
  // ... other fields
}
```

#### GroupedTransitPermit
```typescript
{
  bill_no: string;
  sole_distributor_name: string;
  date: string;
  depot_address: string;
  vehicle_number: string;
  total_amount: number;
  total_cases: number;
  total_products: number;
  brands: TransitPermitDetail[];
  status: string;
  status_code: string;
  // ... other fields
}
```

## Status Codes

- **TRP_01**: Ready for Payment (not shown in OIC dashboard)
- **TRP_02**: Payment Successful and Forwarded to Officer-in-charge (PENDING)
- **TRP_03**: Transit Permit Successfully Approved (APPROVED)
- **TRP_04**: Cancelled by Officer In-Charge - Refund Initiated (REJECTED)

## Workflow

1. Licensee submits transit permit application
2. Licensee makes payment
3. Upon successful payment, status changes to TRP_02
4. Application appears in OIC dashboard
5. OIC reviews the application and brand details
6. OIC can:
   - Approve: Status changes to TRP_03
   - Reject: Status changes to TRP_04

## UI Features

### Animations
- Smooth dialog entry/exit animations
- Staggered fade-in for dialog content
- Hover effects on buttons and table rows
- Loading spinner during data fetch

### Responsive Design
- Mobile-friendly layout
- Adaptive statistics cards
- Horizontal scrolling for table on small screens
- Collapsible filters on mobile

### Visual Enhancements
- Color-coded status badges
- Gradient backgrounds
- Material Design components
- Professional typography
- Shadow effects for depth

## Dependencies

- Angular Material
- RxJS
- HttpClient
- Material Icons

## Usage

```typescript
import { OicTransitPermitComponent } from './path/to/component';

// In your routing module
{
  path: 'oic-transit-permit',
  component: OicTransitPermitComponent
}
```

## Future Enhancements

1. Export functionality (PDF/Excel)
2. Detailed view modal
3. Bulk approve/reject
4. Advanced filtering options
5. Pagination for large datasets
6. Real-time updates using WebSockets
7. Print functionality
8. Email notifications

## Notes

- No localStorage is used; all data is fetched from the backend
- All dummy data has been removed
- Component is fully dynamic and data-driven
- Proper error handling with user-friendly messages
- Loading states for better UX
