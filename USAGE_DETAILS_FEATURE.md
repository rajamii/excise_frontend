# Usage Details Feature Implementation

## Overview
A comprehensive Usage Details modal has been implemented in the Hologram Overview component. This modal provides detailed insights into hologram usage, including issued holograms and wastage/damaged records.

## Features Implemented

### 1. **Usage Details Button**
- Located in the "Serial Numbers Data" tab
- Active "View" button in the "Usage Details" column
- Only enabled when usage history exists for the roll

### 2. **Modal Components**

#### **Roll Information Card**
- Roll Number (with monospace font)
- Hologram Type (with color-coded badge)
- Received Date (formatted as dd-MMM-yyyy)
- Current Status (with status badge)
- Serial Range (from-to display)
- Total Count

#### **Summary Statistics Cards**
- **Available**: Shows available count with percentage bar
- **Used in Production**: Shows used count with percentage bar
- **Damaged/Wastage**: Shows damaged count with percentage bar
- **Utilization Rate**: Calculated percentage of used vs total

#### **Issued Holograms Details Table**
Displays all issued hologram entries with:
- Date Issued (with day of week)
- Reference Number (badge display)
- Brand Name
- Serial Range (monospace, styled box)
- Quantity (with "units" label)
- Officer Name (with icon)
- Status Badge
- **Total Issued** summary row

#### **Wastage & Damaged Details Table**
Displays all wastage/damaged entries with:
- Date Reported (with day of week)
- Serial Range (styled with red background)
- Quantity (with "units" label)
- Damage Reason (detailed description)
- Reported By (officer name)
- **Total Wastage** summary row

### 3. **Data Sources**
The modal pulls data from:
- `hologramDailyEntries` (localStorage)
- `dailyRegisterEntries` (localStorage)
- Filters for approved entries only
- Matches by cartoon number and hologram type

### 4. **Smart Features**

#### **Empty States**
- Shows friendly message when no issued records exist
- Shows success message when no wastage records exist
- Includes relevant icons and descriptions

#### **Responsive Design**
- Fully responsive for mobile, tablet, and desktop
- Scrollable content area with custom scrollbar
- Adaptive table layouts
- Touch-friendly buttons

#### **Visual Enhancements**
- Gradient header with purple theme
- Color-coded statistics cards
- Hover effects on tables and cards
- Progress bars showing percentages
- Icon-rich interface
- Smooth animations

### 5. **Action Buttons**
- **Close**: Closes the modal
- **Export Report**: Placeholder for export functionality
- **Print**: Placeholder for print functionality

## Technical Implementation

### TypeScript Methods
```typescript
viewUsageDetails(roll: SerialRollData): void
closeUsageDetailsModal(): void
getUsageDetailsData(): object | null
```

### Data Processing
- Processes both `issuedEntries` arrays and single entry formats
- Processes both `wastageEntries` arrays and single entry formats
- Sorts entries by date (newest first)
- Calculates totals automatically
- Handles missing data gracefully

### Styling
- Custom SCSS with gradient backgrounds
- Responsive breakpoints for all screen sizes
- Print-friendly styles
- Smooth transitions and animations
- Custom scrollbar styling

## Usage

1. Navigate to the "Serial Numbers Data" tab
2. Find a roll with usage history
3. Click the "View" button in the "Usage Details" column
4. Modal opens showing comprehensive usage information
5. Review issued and wastage details
6. Close modal or export/print as needed

## Additional Intelligence Added

Beyond the requested features, the implementation includes:

1. **Utilization Rate Card**: Shows efficiency percentage
2. **Day of Week Display**: Shows which day transactions occurred
3. **Progress Bars**: Visual representation of usage percentages
4. **Color Coding**: Different colors for different statuses
5. **Hover Effects**: Interactive feedback on all elements
6. **Empty State Messages**: User-friendly messages when no data exists
7. **Responsive Tables**: Horizontal scroll on mobile devices
8. **Icon System**: Consistent iconography throughout
9. **Badge System**: Visual categorization of data
10. **Animation Effects**: Smooth modal appearance and interactions

## Future Enhancements

Potential additions for future versions:
- Export to PDF/Excel functionality
- Print-optimized layout
- Date range filtering within modal
- Search/filter within issued/wastage tables
- Charts/graphs for visual analytics
- Comparison with other rolls
- Historical trend analysis
