import { Component, OnInit, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HologramDataService } from '../../services/hologram-data.service';

export interface HologramRecord {
  id: number;
  date: string;
  ourRefNo: string;
  cartoonNumber?: string;
  fromSerial: string;
  toSerial: string;
  numberOfHolograms: number;
  remarks?: string;
  status: 'PENDING_ARRIVAL' | 'ARRIVED' | 'APPROVED' | 'REJECTED' | 'PENDING_APPROVAL' | 'Cartoon Assigned' | 'Completed' | string;
  approvedDate?: string;
  arrivedDate?: string;
  procurementType?: 'Local' | 'Export' | 'Defence'; // Add procurement type
  supplyChainData?: any;
  carton_details?: any[]; // Raw backend data
}



@Component({
  selector: 'app-hologramdetails',
  imports: [CommonModule, FormsModule],
  templateUrl: './hologramdetails.component.html',
  styleUrl: './hologramdetails.component.scss'
})
export class HologramdetailsComponent implements OnInit {
  @Output() hologramRequestsClicked = new EventEmitter<void>();
  @Output() hologramOverviewClicked = new EventEmitter<void>();

  hologramRecords: HologramRecord[] = [];
  filteredRecords: HologramRecord[] = [];

  // Officer information
  currentOfficer = {
    name: 'Rajesh Kumar',
    distilleryName: 'Sikkim Distilleries Ltd',
    phone: '+91 98765 43210',
    email: 'rajesh.kumar@sikkimdistilleries.com',
    officerId: 'OFF001'
  };

  // Filter properties
  selectedDate: string = '';
  selectedMonth: string = '';
  selectedYear: string = '';
  selectedStatus: string = '';
  searchText: string = '';



  // Update arrival properties
  showUpdateModal: boolean = false;
  selectedRecordForUpdate: HologramRecord | null = null;

  // Roll Details Modal properties
  showRollDetailsModal: boolean = false;
  selectedRecordForRollDetails: HologramRecord | null = null;

  // Saved cartons list
  savedCartons: Array<{
    cartoonNumber: string;
    baseCartoonNumber?: string; // Original carton number without suffix
    fromSerial: string;
    toSerial: string;
    numberOfHolograms: number;
    type?: string;  // Hologram type (LOCAL, EXPORT, DEFENCE)
  }> = [];

  // Current carton being entered
  currentCarton: {
    cartoonNumber: string;
    fromSerial: string;
    toSerial: string;
    numberOfHolograms: number;
    type: string;  // Hologram type (LOCAL, EXPORT, DEFENCE)
  } = {
      cartoonNumber: '',
      fromSerial: '',
      toSerial: '',
      numberOfHolograms: 0,
      type: ''
    };

  serialRangeValidationError: string = '';
  totalCalculatedHolograms: number = 0;



  // Date filter options
  months = [
    { value: '', label: 'All Months' },
    { value: '01', label: 'January' }, { value: '02', label: 'February' }, { value: '03', label: 'March' },
    { value: '04', label: 'April' }, { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' }, { value: '09', label: 'September' },
    { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' }
  ];

  years = Array.from({ length: 10 }, (_, i) => {
    const year = (new Date().getFullYear() - 5 + i).toString();
    return { value: year, label: year };
  });

  constructor(private router: Router) {
    // Don't set default month/year filters to show all data including test data
    this.selectedMonth = '';
    this.selectedYear = '';
  }

  private hologramService = inject(HologramDataService);

  ngOnInit() {
    this.loadHologramRecords();
  }

  loadHologramRecords() {
    this.hologramService.getProcurements().subscribe({
      next: (procurements) => {
        // Backend now provides role/workflow-filtered records.
        // Keep all returned procurements to avoid frontend stage hardcoding.
        const relevantRecords = procurements;

        this.hologramRecords = relevantRecords.map(p => {
          // Ensure we capture carton details regardless of naming variation
          const rawDetails = (p as any).carton_details || (p as any).cartoon_details || (p as any).cartonDetails || [];
          if (rawDetails.length > 0) {
            console.log(`Debug Mapping [${p.refNo}]: Found details. Length=${rawDetails.length}`, rawDetails);
          } else {
            console.log(`Debug Mapping [${p.refNo}]: No details found. Keys:`, Object.keys(p));
          }

          // Determine internal status based on backend status
          let internalStatus: 'PENDING_ARRIVAL' | 'ARRIVED' = 'PENDING_ARRIVAL';
          if ((rawDetails && rawDetails.length > 0) || p.status === 'Cartoon Assigned' || p.status === 'ARRIVED') {
            internalStatus = 'ARRIVED';
          }

          // Map procurement type from quantities (heuristic if not explicit)
          let pType: 'Local' | 'Export' | 'Defence' = 'Local';
          if (Number(p.exportQty) > 0) pType = 'Export';
          else if (Number(p.defenceQty) > 0) pType = 'Defence';

          // Flatten carton details if present
          // Backend might send `carton_details` as a list of assigned cartons.
          // For the main table, we show summary or specific fields.
          // If status is ARRIVED, we might want to show details.

          return {
            id: p.id!,
            date: p.date!,
            ourRefNo: p.refNo!,
            cartoonNumber: rawDetails[0]?.cartoonNumber || rawDetails[0]?.cartoon_number || '', // Handle both camelCase and snake_case keys
            fromSerial: rawDetails[0]?.fromSerial || rawDetails[0]?.from_serial || '',
            toSerial: rawDetails[0]?.toSerial || rawDetails[0]?.to_serial || '',
            // Use original procurement quantities instead of calculated available quantities
            // This ensures we show the actual procured amount (1000) not the available amount (999)
            numberOfHolograms: (Number(p.localQty) + Number(p.exportQty) + Number(p.defenceQty)),
            remarks: p.remarks || `Hologram procurement (${pType})`,
            status: internalStatus,
            approvedDate: p.date,
            arrivedDate: (p as any).updated_at,
            procurementType: pType,
            carton_details: rawDetails,
            supplyChainData: {
              ...p,
              paymentCompleted: true
            }
          };
        });

        this.applyFilters();
        console.log('Loaded hologram records from backend:', this.hologramRecords);
      },
      error: (err) => {
        console.error('Error loading holograms:', err);
      }
    });
  }

  calculateTotalHolograms(item: any): number {
    // Check if this is supply chain data (has lakh fields) or direct entry
    if (item.localQtyLakh !== undefined || item.exportQtyLakh !== undefined || item.defenceQtyLakh !== undefined) {
      // Supply chain data - treat all values as units (not lakhs)
      // The field names are misleading - they actually contain unit values
      const local = item.localQtyLakh || 0;
      const export_ = item.exportQtyLakh || 0;
      const defence = item.defenceQtyLakh || 0;
      const total = local + export_ + defence;

      // Return the total as-is (already in units)
      return total;
    } else if (item.totalHolograms !== undefined) {
      // Direct entry - already in units
      return item.totalHolograms;
    } else if (item.numberOfHolograms !== undefined) {
      // Direct entry - already in units
      return item.numberOfHolograms;
    } else {
      // Fallback - assume it's already in units
      return 0;
    }
  }

  determineStatus(item: any): 'PENDING_ARRIVAL' | 'ARRIVED' | 'APPROVED' | 'REJECTED' | 'PENDING_APPROVAL' {
    // Check if hologram has physically arrived
    if (item.arrivedDate) return 'ARRIVED';

    // Check if approved by commissioner and ready for arrival
    if (item.status === 'APPROVED' || item.approvedDate) return 'PENDING_ARRIVAL';

    // Check if rejected
    if (item.status === 'REJECTED') return 'REJECTED';

    // Check if submitted but not yet approved
    if (item.status === 'Submitted') return 'PENDING_APPROVAL';

    // Default status for new requests
    return 'PENDING_APPROVAL';
  }



  // Check if record is from completed workflow
  isFromCompletedWorkflow(record: HologramRecord): boolean {
    return record.supplyChainData && (record.status === 'PENDING_ARRIVAL' || record.status === 'ARRIVED');
  }

  // Determine which record to keep when deduplicating
  shouldReplaceRecord(existing: HologramRecord, newRecord: HologramRecord): boolean {
    // Priority order: ARRIVED > PENDING_ARRIVAL > PENDING_APPROVAL
    const statusPriority = {
      'ARRIVED': 3,
      'PENDING_ARRIVAL': 2,
      'PENDING_APPROVAL': 1,
      'APPROVED': 1,
      'REJECTED': 0
    };

    const existingPriority = (statusPriority as any)[existing.status] || 0;
    const newPriority = (statusPriority as any)[newRecord.status] || 0;

    // Keep the record with higher status priority
    if (newPriority > existingPriority) {
      return true;
    }

    // If same priority, keep the one with more complete data
    if (newPriority === existingPriority) {
      const existingComplete = (existing.cartoonNumber || '') + (existing.fromSerial || '') + (existing.toSerial || '');
      const newComplete = (newRecord.cartoonNumber || '') + (newRecord.fromSerial || '') + (newRecord.toSerial || '');

      return newComplete.length > existingComplete.length;
    }

    return false;
  }

  // Create unique key for deduplication that includes type
  getRecordKey(record: HologramRecord): string {
    return `${record.ourRefNo}_${record.procurementType || 'Unknown'}`;
  }

  applyFilters() {
    this.filteredRecords = this.hologramRecords.filter(record => {
      const recordDate = new Date(record.date);

      // Specific date filter
      const dateMatch = !this.selectedDate || record.date === this.selectedDate;

      // Month filter
      const monthMatch = !this.selectedMonth ||
        (recordDate.getMonth() + 1).toString().padStart(2, '0') === this.selectedMonth;

      // Year filter
      const yearMatch = !this.selectedYear ||
        recordDate.getFullYear().toString() === this.selectedYear;

      // Status filter
      const statusMatch = !this.selectedStatus || record.status === this.selectedStatus;

      // Search filter
      const searchMatch = !this.searchText ||
        record.fromSerial.toLowerCase().includes(this.searchText.toLowerCase()) ||
        record.toSerial.toLowerCase().includes(this.searchText.toLowerCase()) ||
        (record.remarks && record.remarks.toLowerCase().includes(this.searchText.toLowerCase()));

      return dateMatch && monthMatch && yearMatch && statusMatch && searchMatch;
    });
  }

  clearFilters() {
    this.selectedDate = '';
    this.selectedMonth = '';
    this.selectedYear = '';
    this.selectedStatus = '';
    this.searchText = '';
    this.applyFilters();
  }



  getCurrentDateTime(): string {
    return new Date().toLocaleString();
  }

  getTotalHolograms(): number {
    return this.filteredRecords.reduce((total, record) => total + record.numberOfHolograms, 0);
  }







  // Update arrival methods
  canUpdateRecord(record: HologramRecord): boolean {
    // Button should only be active if:
    // 1. Status is PENDING_ARRIVAL (approved by commissioner)
    // 2. Payment has been COMPLETED (not just slip uploaded)
    // 3. Status is NOT 'ARRIVED', 'Cartoon Assigned' or 'Completed' (already processed)
    //    UNLESS data is missing (cartonNumber is empty/null/-)

    const status = record.status;
    if (status === 'ARRIVED' || status === 'Cartoon Assigned' || status === 'Completed') {
      const hasDetails = record.carton_details && record.carton_details.length > 0;
      console.log(`Debug Button [${record.ourRefNo}]: Status=${status}, HasDetails=${hasDetails}, Len=${record.carton_details?.length}`);

      // Fix for missing data: If arrived but NO carton details are present in the list
      // stricter check than just cartoonNumber string
      if (!hasDetails) {
        return true;
      }
      return false;
    }

    if (status !== 'PENDING_ARRIVAL') {
      return false;
    }

    // Check if payment has been completed for this record
    return this.isPaymentCompleted(record);
  }

  // Check if payment has been COMPLETED for this hologram record
  // This is different from paymentSlipUploaded - payment must be actually made
  private isPaymentCompleted(record: HologramRecord): boolean {
    // console.log(`🔍 Checking payment completion for ${record.ourRefNo} (${record.procurementType})`);

    // Check in supply chain data if payment is completed
    if (record.supplyChainData) {
      // console.log(`  - supplyChainData.paymentCompleted:`, record.supplyChainData.paymentCompleted);
      // Check if paymentCompleted flag is set
      if (record.supplyChainData.paymentCompleted === true) {
        // console.log(`  ✅ Payment completed (from supplyChainData)`);
        return true;
      }
    }

    // Check local storage if available (browser only)
    if (typeof localStorage !== 'undefined') {
      // Also check in hologramApplications storage
      const applications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
      const matchingApp = applications.find((app: any) =>
        app.refNo === record.ourRefNo &&
        app.procurementType === record.procurementType
      );

      // console.log(`  - hologramApplications match:`, matchingApp ? 'found' : 'not found');

      // ONLY check paymentCompleted flag (not paymentSlipUploaded)
      if (matchingApp && matchingApp.paymentCompleted === true) {
        // console.log(`  ✅ Payment completed (from hologramApplications)`);
        return true;
      }

      // Check in hologramRequests storage
      const requests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
      const matchingReq = requests.find((req: any) => req.refNo === record.ourRefNo);

      // console.log(`  - hologramRequests match:`, matchingReq ? 'found' : 'not found');

      // ONLY check paymentCompleted flag (not paymentSlipUploaded)
      if (matchingReq && matchingReq.paymentCompleted === true) {
        // console.log(`  ✅ Payment completed (from hologramRequests)`);
        return true;
      }
    }

    // console.log(`  ❌ Payment NOT completed - button should be DISABLED`);
    return false;
  }

  // Track locked carton number and suffix counter
  lockedCartonNumber: string = '';
  cartonSuffixCounter: number = 0;

  // Unlock carton number for editing
  unlockCartonNumber(): void {
    if (this.savedCartons.length > 0) {
      const confirmUnlock = confirm(
        `⚠️ Warning: Unlocking will remove all ${this.savedCartons.length} saved roll(s).\n\n` +
        `This action cannot be undone. Do you want to continue?`
      );
      
      if (!confirmUnlock) {
        return;
      }
      
      // Clear all saved cartons
      this.savedCartons = [];
      this.calculateTotalFromSavedCartons();
    }
    
    // Unlock the carton
    this.lockedCartonNumber = '';
    this.cartonSuffixCounter = 0;
    this.currentCarton.cartoonNumber = '';
    
    alert('✅ Carton number unlocked! You can now enter a new carton number.');
  }

  updateArrivalDetails(record: HologramRecord) {
    this.selectedRecordForUpdate = record;
    // Reset saved cartons and current carton
    this.savedCartons = [];
    this.currentCarton = {
      cartoonNumber: '',
      fromSerial: '',
      toSerial: '',
      numberOfHolograms: 0,
      type: ''
    };
    this.totalCalculatedHolograms = 0;
    this.serialRangeValidationError = '';
    // Reset locked carton state
    this.lockedCartonNumber = '';
    this.cartonSuffixCounter = 0;
    this.showUpdateModal = true;
  }

  // Calculate hologram count for current carton being entered
  calculateCurrentCartonCount() {
    this.serialRangeValidationError = '';

    if (this.currentCarton.fromSerial && this.currentCarton.toSerial) {
      const fromNum = this.extractSerialNumber(this.currentCarton.fromSerial);
      const toNum = this.extractSerialNumber(this.currentCarton.toSerial);

      if (fromNum && toNum && toNum >= fromNum) {
        this.currentCarton.numberOfHolograms = toNum - fromNum + 1;

        // Real-time validation: Check if this would exceed the expected quantity
        if (this.selectedRecordForUpdate) {
          const expectedQuantity = this.selectedRecordForUpdate.numberOfHolograms;
          const newTotal = this.totalCalculatedHolograms + this.currentCarton.numberOfHolograms;

          if (newTotal > expectedQuantity) {
            const remaining = expectedQuantity - this.totalCalculatedHolograms;
            this.serialRangeValidationError = `❌ This carton has ${this.currentCarton.numberOfHolograms.toLocaleString()} holograms, but only ${remaining.toLocaleString()} remaining! Total would be ${newTotal.toLocaleString()} which exceeds expected ${expectedQuantity.toLocaleString()}.`;
          }
        }
      } else if (fromNum && toNum && toNum < fromNum) {
        this.currentCarton.numberOfHolograms = 0;
        this.serialRangeValidationError = '❌ Invalid range! "To Serial Number" must be greater than or equal to "From Serial Number".';
      } else {
        this.currentCarton.numberOfHolograms = 0;
      }
    } else {
      this.currentCarton.numberOfHolograms = 0;
    }

    this.validateCurrentCartonRealtime();
  }

  onCartonInputChange(): void {
    this.validateCurrentCartonRealtime();
  }

  onSerialInputChange(): void {
    this.calculateCurrentCartonCount();
  }

  private validateCurrentCartonRealtime(): void {
    if (this.isArrivalQuantityCompleted()) {
      this.serialRangeValidationError = '';
      return;
    }

    const fromSerial = (this.currentCarton.fromSerial || '').trim();
    const toSerial = (this.currentCarton.toSerial || '').trim();

    if (this.lockedCartonNumber) {
      if (!fromSerial || !toSerial) {
        if (this.serialRangeValidationError.toLowerCase().includes('serial range is already entered')) {
          this.serialRangeValidationError = '';
        }
        return;
      }

      const duplicateCheck = this.findDuplicateCartonOrRange(this.lockedCartonNumber, fromSerial, toSerial);
      if (duplicateCheck && duplicateCheck.toLowerCase().includes('serial range')) {
        this.serialRangeValidationError = duplicateCheck;
      } else if (this.serialRangeValidationError.toLowerCase().includes('serial range is already entered')) {
        this.serialRangeValidationError = '';
      }
      return;
    }

    const cartonText = (this.currentCarton.cartoonNumber || '').trim();
    if (!cartonText) {
      if (this.serialRangeValidationError.toLowerCase().includes('carton number already exists')) {
        this.serialRangeValidationError = '';
      }
      return;
    }

    const duplicateCheck = this.findDuplicateCartonOrRange(cartonText, fromSerial, toSerial);

    if (duplicateCheck && duplicateCheck.toLowerCase().includes('carton number')) {
      this.serialRangeValidationError = duplicateCheck;
      return;
    }

    if (this.serialRangeValidationError.toLowerCase().includes('carton number already exists')) {
      this.serialRangeValidationError = '';
    }
  }

  // Helper to get suffix letter (a, b, c, ... z, aa, ab, etc.)
  getSuffixLetter(index: number): string {
    let suffix = '';
    let num = index;
    while (num >= 0) {
      suffix = String.fromCharCode(97 + (num % 26)) + suffix;
      num = Math.floor(num / 26) - 1;
    }
    return suffix;
  }

  // Save current carton to the list
  saveCurrentCarton() {
    // First entry: validate carton number
    if (!this.lockedCartonNumber && !this.currentCarton.cartoonNumber.trim()) {
      alert('Please enter carton number');
      return;
    }
    
    if (!this.currentCarton.fromSerial.trim()) {
      alert('Please enter from serial number');
      return;
    }
    if (!this.currentCarton.toSerial.trim()) {
      alert('Please enter to serial number');
      return;
    }
    if (this.currentCarton.numberOfHolograms <= 0) {
      alert('Invalid hologram count. Please check serial numbers.');
      return;
    }

    const candidateBaseCarton = (this.lockedCartonNumber || this.currentCarton.cartoonNumber || '').trim();
    const candidateFrom = (this.currentCarton.fromSerial || '').trim();
    const candidateTo = (this.currentCarton.toSerial || '').trim();
    const duplicateCheck = this.findDuplicateCartonOrRange(candidateBaseCarton, candidateFrom, candidateTo);
    if (duplicateCheck) {
      this.serialRangeValidationError = duplicateCheck;
      alert(duplicateCheck);
      return;
    }

    // Check if adding this carton would exceed expected quantity
    if (this.selectedRecordForUpdate) {
      const expectedQuantity = this.selectedRecordForUpdate.numberOfHolograms;
      const newTotal = this.totalCalculatedHolograms + this.currentCarton.numberOfHolograms;

      if (newTotal > expectedQuantity) {
        alert(`Cannot add this carton. Total would be ${newTotal.toLocaleString()} which exceeds expected ${expectedQuantity.toLocaleString()} holograms.`);
        return;
      }
    }

    // Lock carton number on first save
    if (!this.lockedCartonNumber) {
      this.lockedCartonNumber = this.currentCarton.cartoonNumber.trim();
      this.cartonSuffixCounter = 0;
    }

    // Generate suffix for this roll
    const suffix = this.getSuffixLetter(this.cartonSuffixCounter);
    const displayCartoonNumber = `${this.lockedCartonNumber}(${suffix})`;

    // Add to saved cartons (include type and display name with suffix)
    this.savedCartons.push({
      cartoonNumber: displayCartoonNumber, // Display name with suffix
      baseCartoonNumber: this.lockedCartonNumber, // Original base name
      fromSerial: this.currentCarton.fromSerial,
      toSerial: this.currentCarton.toSerial,
      numberOfHolograms: this.currentCarton.numberOfHolograms,
      type: this.currentCarton.type || this.getDefaultHologramType()
    });

    // Increment suffix counter for next roll
    this.cartonSuffixCounter++;

    // Update total
    this.calculateTotalFromSavedCartons();

    // Reset only serial numbers for next entry (keep carton locked)
    this.currentCarton = {
      cartoonNumber: this.lockedCartonNumber, // Keep locked carton number
      fromSerial: '',
      toSerial: '',
      numberOfHolograms: 0,
      type: this.currentCarton.type || '' // Keep type if selected
    };

    // Show success message with suffix
    alert(`Roll ${displayCartoonNumber} saved successfully! Total: ${this.totalCalculatedHolograms.toLocaleString()} / ${this.selectedRecordForUpdate?.numberOfHolograms.toLocaleString()}`);
  }

  // Remove a saved carton
  removeSavedCarton(index: number) {
    this.savedCartons.splice(index, 1);
    
    // If all cartons removed, unlock the carton number
    if (this.savedCartons.length === 0) {
      this.lockedCartonNumber = '';
      this.cartonSuffixCounter = 0;
      this.currentCarton.cartoonNumber = '';
    } else {
      // Recalculate suffixes for remaining cartons
      this.savedCartons.forEach((carton, idx) => {
        const suffix = this.getSuffixLetter(idx);
        carton.cartoonNumber = `${carton.baseCartoonNumber || this.lockedCartonNumber}(${suffix})`;
      });
      this.cartonSuffixCounter = this.savedCartons.length;
    }
    
    this.calculateTotalFromSavedCartons();
  }

  // Calculate total from saved cartons
  calculateTotalFromSavedCartons() {
    this.totalCalculatedHolograms = this.savedCartons.reduce((total, carton) => {
      return total + (carton.numberOfHolograms || 0);
    }, 0);

    if (this.isArrivalQuantityCompleted()) {
      this.serialRangeValidationError = '';
    }

    // Update validation error for final confirmation
    this.updateFinalValidation();
  }

  // Update validation for final confirmation
  updateFinalValidation() {
    // Don't show validation errors while user is still entering cartons
    // Validation will only happen when they click "Confirm Arrival"
    this.serialRangeValidationError = '';
  }

  // Check if can save current carton
  canSaveCurrentCarton(): boolean {
    if (this.isArrivalQuantityCompleted()) {
      return false;
    }

    const types = this.getAvailableHologramTypes();
    // Only require type selection if multiple types are available
    const typeValid = types.length <= 1 || this.currentCarton.type.trim() !== '';

    return this.currentCarton.cartoonNumber.trim() !== '' &&
      this.currentCarton.fromSerial.trim() !== '' &&
      this.currentCarton.toSerial.trim() !== '' &&
      this.currentCarton.numberOfHolograms > 0 &&
      typeValid &&
      this.serialRangeValidationError === ''; // Don't allow save if there's a validation error
  }

  private isArrivalQuantityCompleted(): boolean {
    if (!this.selectedRecordForUpdate) {
      return false;
    }
    return this.totalCalculatedHolograms >= this.selectedRecordForUpdate.numberOfHolograms;
  }

  extractSerialNumber(serial: string): number | null {
    const match = serial.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  }

  saveArrivalUpdate() {
    if (this.selectedRecordForUpdate && this.validateUpdateForm()) {
      // Capture the current timestamp when officer saves the arrival
      const currentTimestamp = new Date().toISOString();
      
      // Prepare payload for backend
      // We need to send 'carton_details' which seems to be what we want to save
      // The backend expects 'carton_details' JSON.
      // IMPORTANT: Include type for each carton to support multi-type procurements

      const cartonDetails = this.savedCartons.map(carton => ({
        cartoonNumber: carton.cartoonNumber,
        fromSerial: carton.fromSerial,
        toSerial: carton.toSerial,
        type: carton.type || this.getDefaultHologramType(),  // Include type for backend
        arrivedDate: currentTimestamp, // Capture when officer saved this carton
        processedBy: this.currentOfficer.name, // Track which officer processed this
        processedAt: currentTimestamp // When it was processed
      }));

      // We use 'assign_cartons' action as per views.py update or 'carton_assigned'
      const action = 'assign_cartons';
      const remarks = `Cartons Assigned: ${this.savedCartons.length} cartons. Processed by ${this.currentOfficer.name} on ${new Date(currentTimestamp).toLocaleDateString('en-GB')}.`;

      this.hologramService.performAction('procurement', this.selectedRecordForUpdate.id, action, remarks, { 
        carton_details: cartonDetails,
        arrival_processed_date: currentTimestamp, // Overall processing timestamp
        processed_by_officer: this.currentOfficer.name
      })
        .subscribe({
          next: (res) => {
            alert(`Hologram ${this.selectedRecordForUpdate?.ourRefNo} marked as arrived successfully with ${this.savedCartons.length} carton(s)!`);
            this.closeUpdateModal();
            this.loadHologramRecords(); // Refresh from backend
            
            // Notify monthly statement component to refresh after a short delay
            // This ensures backend has finished processing the request
            setTimeout(() => {
              this.hologramService.notifyArrivalUpdate();
            }, 500);
          },
          error: (err) => {
            console.error('Error assigning cartons:', err);
            const backendMessage =
              err?.error?.detail ||
              err?.error?.message ||
              (typeof err?.error === 'string' ? err.error : '');
            alert(backendMessage || 'Failed to save carton details. Please try again.');
          }
        });
    }
  }
  addToHologramOverviewRolls(record: HologramRecord) {
    if (typeof localStorage === 'undefined') return;

    // Get existing data from localStorage
    const existingRolls = JSON.parse(localStorage.getItem('hologramOverviewRolls') || '[]');
    const existingAvailable = JSON.parse(localStorage.getItem('hologramOverviewAvailable') || '[]');
    const existingSerialData = JSON.parse(localStorage.getItem('hologramOverviewSerialData') || '[]');

    // Determine hologram type based on supply chain data or default to LOCAL
    let hologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE' = 'LOCAL';
    if (record.supplyChainData) {
      if (record.supplyChainData.exportQtyLakh > 0 || record.remarks?.toLowerCase().includes('export')) {
        hologramType = 'EXPORT';
      } else if (record.supplyChainData.defenceQtyLakh > 0 || record.remarks?.toLowerCase().includes('defence')) {
        hologramType = 'DEFENCE';
      }
    }

    const uniqueId = Date.now(); // Use timestamp as unique ID

    // CRITICAL: Load allocated ranges from allocation data
    const allocationData = JSON.parse(
      localStorage.getItem(`hologramAllocation_${record.ourRefNo}`) || '{}'
    );

    console.log('📦 Loading allocation data for', record.ourRefNo, ':', allocationData);

    // Find allocated ranges for this cartoon
    const cartoonAllocation = allocationData.allocatedCartoons?.find(
      (c: any) => c.cartoonNumber === record.cartoonNumber
    );

    let allocatedRanges = cartoonAllocation?.allocatedRanges || [];

    console.log('🎯 Found allocated ranges for', record.cartoonNumber, ':', allocatedRanges);

    // If no allocated ranges found, create from fromSerial/toSerial (backward compatibility)
    if (allocatedRanges.length === 0) {
      allocatedRanges = [{
        fromSerial: record.fromSerial,
        toSerial: record.toSerial,
        count: record.numberOfHolograms
      }];
      console.log('⚠️ No allocated ranges found, using fromSerial/toSerial:', allocatedRanges);
    }

    // Create new roll entry for Rolls tab
    const newRoll = {
      id: uniqueId,
      cartoonNumber: record.cartoonNumber,
      type: hologramType,
      fromSerial: allocatedRanges[0].fromSerial,  // First range start
      toSerial: allocatedRanges[allocatedRanges.length - 1].toSerial,  // Last range end
      allocatedRanges: allocatedRanges,  // CRITICAL: Store all allocated ranges
      totalCount: record.numberOfHolograms,
      availableCount: record.numberOfHolograms, // All available initially
      usedCount: 0, // None used initially
      damagedCount: 0, // None damaged initially
      status: 'AVAILABLE', // Fresh data is available
      receivedDate: record.arrivedDate || new Date().toISOString().split('T')[0],
      isNew: true, // Flag to highlight as new
      newUntil: Date.now() + (24 * 60 * 60 * 1000) // Mark as new for 24 hours
    };

    console.log('✅ Created roll with allocated ranges:', newRoll);

    // Create new available entry for Available Hologram Data tab
    const newAvailable = {
      id: uniqueId,
      cartoonNumber: record.cartoonNumber,
      type: hologramType,
      availableRange: `${record.fromSerial} - ${record.toSerial}`,
      availableCount: record.numberOfHolograms,
      nextSerial: record.fromSerial, // First serial is the next available
      percentage: 100, // 100% available initially
      status: 'AVAILABLE',
      isNew: true, // Flag to highlight as new
      newUntil: Date.now() + (24 * 60 * 60 * 1000) // Mark as new for 24 hours
    };

    // Create new serial data entry for Serial Numbers Data tab
    const newSerialData = {
      id: uniqueId,
      rollNumber: record.cartoonNumber,
      hologramType: hologramType,
      fromSerial: allocatedRanges[0].fromSerial,  // First range start
      toSerial: allocatedRanges[allocatedRanges.length - 1].toSerial,  // Last range end
      allocatedRanges: allocatedRanges,  // CRITICAL: Store all allocated ranges
      totalCount: record.numberOfHolograms,
      availableCount: record.numberOfHolograms, // All available initially
      usedCount: 0, // None used initially
      damagedCount: 0, // None damaged initially
      status: 'AVAILABLE',
      receivedDate: record.arrivedDate || new Date().toISOString().split('T')[0],
      usageHistory: [], // Empty usage history initially
      isNew: true, // Flag to highlight as new
      newUntil: Date.now() + (24 * 60 * 60 * 1000) // Mark as new for 24 hours
    };

    // Add to existing data
    existingRolls.push(newRoll);
    existingAvailable.push(newAvailable);
    existingSerialData.push(newSerialData);

    // Save back to localStorage
    localStorage.setItem('hologramOverviewRolls', JSON.stringify(existingRolls));
    localStorage.setItem('hologramOverviewAvailable', JSON.stringify(existingAvailable));
    localStorage.setItem('hologramOverviewSerialData', JSON.stringify(existingSerialData));
  }

  validateUpdateForm(): boolean {
    // Check if at least one carton exists
    if (this.savedCartons.length === 0) {
      alert('Please add at least one carton');
      return false;
    }

    // Check if total matches expected quantity
    if (this.selectedRecordForUpdate && this.totalCalculatedHolograms !== this.selectedRecordForUpdate.numberOfHolograms) {
      alert(`Total holograms (${this.totalCalculatedHolograms.toLocaleString()}) must match expected quantity (${this.selectedRecordForUpdate.numberOfHolograms.toLocaleString()})`);
      return false;
    }

    // Final duplicate guard before submit (covers any missed entry-level checks)
    for (const carton of this.savedCartons) {
      const msg = this.findDuplicateCartonOrRange(
        carton.baseCartoonNumber || carton.cartoonNumber,
        carton.fromSerial,
        carton.toSerial,
        true
      );
      if (msg) {
        this.serialRangeValidationError = msg;
        alert(msg);
        return false;
      }
    }

    return true;
  }

  private normalizeCartonKey(value: string): string {
    const text = String(value || '').trim().toLowerCase();
    if (!text) {
      return '';
    }
    const clean = this.getCleanCartoonNumber(text).replace(/\([a-z]+\)$/i, '').trim();
    return clean.replace(/\s+/g, '');
  }

  private normalizeSerialKey(value: string): string {
    const text = String(value || '').trim();
    if (!text) {
      return '';
    }
    const match = text.match(/\d+/);
    if (match) {
      return String(parseInt(match[0], 10));
    }
    return text.toLowerCase();
  }

  private findDuplicateCartonOrRange(baseCarton: string, fromSerial: string, toSerial: string, skipSavedCartonCheck: boolean = false): string | null {
    const selectedId = this.selectedRecordForUpdate?.id;
    const targetCartonKey = this.normalizeCartonKey(baseCarton);
    const targetFrom = this.normalizeSerialKey(fromSerial);
    const targetTo = this.normalizeSerialKey(toSerial);

    // Check payload-level duplicates inside current modal list
    if (!skipSavedCartonCheck) {
      for (const saved of this.savedCartons) {
        const savedCartonKey = this.normalizeCartonKey(saved.baseCartoonNumber || saved.cartoonNumber || '');
        const savedFrom = this.normalizeSerialKey(saved.fromSerial || '');
        const savedTo = this.normalizeSerialKey(saved.toSerial || '');
        if (savedCartonKey && targetCartonKey && savedCartonKey === targetCartonKey && !this.lockedCartonNumber) {
          return 'Carton number already exists. Please use a different carton number.';
        }
        if (savedFrom && savedTo && targetFrom && targetTo && savedFrom === targetFrom && savedTo === targetTo) {
          return 'This serial range is already entered before. Please use another range.';
        }
      }
    }

    // Check previously saved records in the same OIC dashboard context (same unit scope)
    for (const record of this.hologramRecords || []) {
      if (!record || record.id === selectedId) {
        continue;
      }
      const details = Array.isArray(record.carton_details) ? record.carton_details : [];
      if (details.length > 0) {
        for (const detail of details) {
          const existingCarton = this.normalizeCartonKey(
            detail?.baseCartoonNumber || detail?.cartoonNumber || detail?.cartoon_number || detail?.carton_number || ''
          );
          const existingFrom = this.normalizeSerialKey(detail?.fromSerial || detail?.from_serial || '');
          const existingTo = this.normalizeSerialKey(detail?.toSerial || detail?.to_serial || '');
          if (existingCarton && targetCartonKey && existingCarton === targetCartonKey && !this.lockedCartonNumber) {
            return 'Carton number already exists for this OIC/Distillery context. Try another carton number.';
          }
          if (existingFrom && existingTo && targetFrom && targetTo && existingFrom === targetFrom && existingTo === targetTo) {
            return 'This serial range is already entered before. Please use another range.';
          }
        }
      } else {
        const existingCarton = this.normalizeCartonKey(record.cartoonNumber || '');
        const existingFrom = this.normalizeSerialKey(record.fromSerial || '');
        const existingTo = this.normalizeSerialKey(record.toSerial || '');
        if (existingCarton && targetCartonKey && existingCarton === targetCartonKey && !this.lockedCartonNumber) {
          return 'Carton number already exists for this OIC/Distillery context. Try another carton number.';
        }
        if (existingFrom && existingTo && targetFrom && targetTo && existingFrom === targetFrom && existingTo === targetTo) {
          return 'This serial range is already entered before. Please use another range.';
        }
      }
    }

    return null;
  }

  closeUpdateModal() {
    this.showUpdateModal = false;
    this.selectedRecordForUpdate = null;
    this.savedCartons = [];
    // Reset locked carton state
    this.lockedCartonNumber = '';
    this.cartonSuffixCounter = 0;
    this.currentCarton = {
      cartoonNumber: '',
      fromSerial: '',
      toSerial: '',
      numberOfHolograms: 0,
      type: ''
    };
    this.totalCalculatedHolograms = 0;
    this.serialRangeValidationError = '';
  }

  // Get available hologram types from the selected record for multi-type procurements
  getAvailableHologramTypes(): string[] {
    const types: string[] = [];

    if (!this.selectedRecordForUpdate) {
      return types;
    }

    // Check supplyChainData for quantities (this contains the original procurement data)
    const data = this.selectedRecordForUpdate.supplyChainData;
    if (data) {
      // Check all possible field name variations
      const localQty = Number(data.localQty || data.localQtyLakh || data.local_qty || 0);
      const exportQty = Number(data.exportQty || data.exportQtyLakh || data.export_qty || 0);
      const defenceQty = Number(data.defenceQty || data.defenceQtyLakh || data.defence_qty || 0);

      if (localQty > 0) {
        types.push('LOCAL');
      }
      if (exportQty > 0) {
        types.push('EXPORT');
      }
      if (defenceQty > 0) {
        types.push('DEFENCE');
      }
    }

    // If nothing found, return single type based on procurementType
    if (types.length === 0 && this.selectedRecordForUpdate.procurementType) {
      types.push(this.selectedRecordForUpdate.procurementType.toUpperCase());
    }

    // Final fallback to LOCAL
    return types.length > 0 ? types : ['LOCAL'];
  }

  // Get default hologram type for single-type procurements
  getDefaultHologramType(): string {
    const types = this.getAvailableHologramTypes();
    return types.length > 0 ? types[0] : 'LOCAL';
  }

  // Status related methods
  getStatusCount(status: string): number {
    return this.filteredRecords.filter(record => record.status === status).length;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING_ARRIVAL':
        return 'bg-warning text-dark';
      case 'ARRIVED':
        return 'bg-success';
      case 'APPROVED':
        return 'bg-info';
      case 'REJECTED':
        return 'bg-danger';
      case 'PENDING_APPROVAL':
        return 'bg-secondary';
      default:
        return 'bg-secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'PENDING_ARRIVAL':
        return 'bi bi-clock';
      case 'ARRIVED':
        return 'bi bi-check-circle';
      case 'APPROVED':
        return 'bi bi-check-circle-fill';
      case 'REJECTED':
        return 'bi bi-x-circle';
      case 'PENDING_APPROVAL':
        return 'bi bi-hourglass-split';
      default:
        return 'bi bi-question-circle';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING_ARRIVAL':
        return 'Pending Arrival';
      case 'ARRIVED':
        return 'Arrived';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'PENDING_APPROVAL':
        return 'Pending Approval';
      default:
        return 'Unknown';
    }
  }

  // Hologram type related methods
  getHologramType(record: HologramRecord): string {
    // First check if procurementType is directly set
    if (record.procurementType) {
      return record.procurementType.toUpperCase();
    }

    // Check supply chain data for procurementType
    if (record.supplyChainData?.procurementType) {
      return record.supplyChainData.procurementType.toUpperCase();
    }

    // Fallback: Check supply chain data for quantities
    if (record.supplyChainData) {
      // Check which type has quantity > 0
      if (record.supplyChainData.exportQtyLakh > 0) {
        return 'EXPORT';
      } else if (record.supplyChainData.defenceQtyLakh > 0) {
        return 'DEFENCE';
      } else if (record.supplyChainData.localQtyLakh > 0) {
        return 'LOCAL';
      }
    }

    // Check remarks for type indicators
    if (record.remarks) {
      const remarks = record.remarks.toLowerCase();
      if (remarks.includes('export')) {
        return 'EXPORT';
      } else if (remarks.includes('defence') || remarks.includes('defense')) {
        return 'DEFENCE';
      } else if (remarks.includes('local')) {
        return 'LOCAL';
      }
    }

    // Default to LOCAL if no specific type found
    return 'LOCAL';
  }

  getHologramTypeClass(type: string): string {
    switch (type) {
      case 'LOCAL':
        return 'bg-success text-white';
      case 'EXPORT':
        return 'bg-dark text-white';
      case 'DEFENCE':
        return 'bg-warning text-dark';
      default:
        return 'bg-secondary text-white';
    }
  }

  // Returns array of all hologram types present in the record
  getHologramTypes(record: HologramRecord): string[] {
    const types: string[] = [];

    // Check supply chain data for quantities
    if (record.supplyChainData) {
      const localQty = record.supplyChainData.localQtyLakh || record.supplyChainData.localQty || 0;
      const exportQty = record.supplyChainData.exportQtyLakh || record.supplyChainData.exportQty || 0;
      const defenceQty = record.supplyChainData.defenceQtyLakh || record.supplyChainData.defenceQty || 0;

      if (Number(localQty) > 0) {
        types.push('LOCAL');
      }
      if (Number(exportQty) > 0) {
        types.push('EXPORT');
      }
      if (Number(defenceQty) > 0) {
        types.push('DEFENCE');
      }
    }

    // Fallback to procurementType if no quantities found
    if (types.length === 0 && record.procurementType) {
      types.push(record.procurementType.toUpperCase());
    }

    // Default to LOCAL if nothing found
    return types.length > 0 ? types : ['LOCAL'];
  }







  updateHologramRecordInStorage(updatedRecord: HologramRecord) {
    // Update the record in localStorage
    const approvedEntries = JSON.parse(localStorage.getItem('approvedHologramEntries') || '[]');
    const index = approvedEntries.findIndex((entry: any) => entry.id === updatedRecord.id);

    if (index !== -1) {
      approvedEntries[index] = {
        ...approvedEntries[index],
        cartoonNumber: updatedRecord.cartoonNumber,
        fromSerial: updatedRecord.fromSerial,
        toSerial: updatedRecord.toSerial,
        numberOfHolograms: updatedRecord.numberOfHolograms,
        status: updatedRecord.status,
        arrivedDate: updatedRecord.arrivedDate
      };
      localStorage.setItem('approvedHologramEntries', JSON.stringify(approvedEntries));
    }

    // Also update supply chain data if it exists
    if (updatedRecord.supplyChainData) {
      const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
      const requestIndex = hologramRequests.findIndex((req: any) => req.refNo === updatedRecord.ourRefNo);

      if (requestIndex !== -1) {
        hologramRequests[requestIndex] = {
          ...hologramRequests[requestIndex],
          cartoonNumber: updatedRecord.cartoonNumber,
          fromSerial: updatedRecord.fromSerial,
          toSerial: updatedRecord.toSerial,
          status: updatedRecord.status,
          arrivedDate: updatedRecord.arrivedDate
        };
        localStorage.setItem('hologramRequests', JSON.stringify(hologramRequests));
      }
    }
  }

  // Refresh data method
  refreshData() {
    this.loadHologramRecords();
  }

  // Force deduplication of existing records
  deduplicateRecords() {
    const uniqueRecordsMap = new Map();

    this.hologramRecords.forEach(record => {
      const existingRecord = uniqueRecordsMap.get(record.ourRefNo);

      if (!existingRecord) {
        uniqueRecordsMap.set(record.ourRefNo, record);
      } else {
        const shouldReplace = this.shouldReplaceRecord(existingRecord, record);
        if (shouldReplace) {
          uniqueRecordsMap.set(record.ourRefNo, record);
        }
      }
    });

    this.hologramRecords = Array.from(uniqueRecordsMap.values());
    this.applyFilters();
  }

  // Get summary counts for new status system
  getPendingArrivals(): number {
    return this.filteredRecords.filter(record => record.status === 'PENDING_ARRIVAL').length;
  }

  getArrivedCount(): number {
    return this.filteredRecords.filter(record => record.status === 'ARRIVED').length;
  }

  openHologramRequests(): void {
    this.router.navigate(['/dev-hologram-request-list']);
  }

  openHologramOverview(): void {
    this.router.navigate(['/dev-hologram-overview']);
  }

  // Add test data for arrival testing - Simple 30 holograms for easy testing
  addTestDataForArrivalTesting(): void {
    const applications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
    const testExists = applications.some((app: any) => app.refNo === 'YB/TEST/2025');

    // Only create if doesn't exist
    if (testExists) {
      return;
    }

    // Create ONE simple test record with 30 holograms for easy testing
    const testRecord = {
      refNo: 'YB/TEST/2025',
      date: new Date().toISOString().split('T')[0],
      companyName: 'Test Distillery Ltd',
      localQtyLakh: 1000, // 10000 pieces (easy for testing)
      exportQtyLakh: 0,
      defenceQtyLakh: 0,
      procurementType: 'Local',
      status: 'Payment Completed',
      paymentSlipUploaded: true,
      paymentCompleted: true,
      submittedDate: new Date().toISOString().split('T')[0],
      approvedDate: new Date().toISOString().split('T')[0],
      paymentDate: new Date().toISOString().split('T')[0]
    };

    applications.push(testRecord);
    localStorage.setItem('hologramApplications', JSON.stringify(applications));

    console.log('✅ Test record created: YB/TEST/2025 (30 holograms, Payment Completed)');
  }


  // Helper method for supply chain to mark payment as completed
  // This should be called from the supply chain interface after actual payment is made
  markPaymentCompleted(refNo: string, procurementType: string): void {
    // Update in hologramApplications
    const applications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
    const appIndex = applications.findIndex((app: any) =>
      app.refNo === refNo && app.procurementType === procurementType
    );

    if (appIndex !== -1) {
      applications[appIndex].paymentCompleted = true;
      applications[appIndex].paymentDate = new Date().toISOString().split('T')[0];
      localStorage.setItem('hologramApplications', JSON.stringify(applications));
    }

    // Update in hologramRequests
    const requests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    const reqIndex = requests.findIndex((req: any) => req.refNo === refNo);

    if (reqIndex !== -1) {
      requests[reqIndex].paymentCompleted = true;
      requests[reqIndex].paymentDate = new Date().toISOString().split('T')[0];
      localStorage.setItem('hologramRequests', JSON.stringify(requests));
    }

    // Reload data to reflect changes
    this.loadHologramRecords();

    console.log(`✅ Payment marked as completed for ${refNo} (${procurementType})`);
  }

  // Roll Details Methods
  hasRollDetails(record: HologramRecord): boolean {
    // Check if record has carton details with data
    const details = record.carton_details || [];
    return Array.isArray(details) && details.length > 0;
  }

  viewRollDetails(record: HologramRecord): void {
    this.selectedRecordForRollDetails = record;
    this.showRollDetailsModal = true;
  }

  closeRollDetailsModal(): void {
    this.showRollDetailsModal = false;
    this.selectedRecordForRollDetails = null;
  }

  getRollDetailsForRecord(record: HologramRecord): any[] {
    if (!record) return [];
    
    // Get roll details from carton_details property
    const details = record.carton_details || [];
    
    // Ensure it's an array and normalize the data structure
    if (!Array.isArray(details)) return [];
    
    return details.map((detail: any) => ({
      cartoonNumber: detail.cartoonNumber || detail.cartoon_number || detail.carton_number || 'N/A',
      fromSerial: detail.fromSerial || detail.from_serial || 'N/A',
      toSerial: detail.toSerial || detail.to_serial || 'N/A',
      quantity: this.calculateQuantityFromSerials(detail.fromSerial || detail.from_serial, detail.toSerial || detail.to_serial),
      type: detail.type || this.getHologramType(record)
    }));
  }

  getTotalRollDetailsQuantity(record: HologramRecord): number {
    const details = this.getRollDetailsForRecord(record);
    return details.reduce((total, detail) => total + (detail.quantity || 0), 0);
  }

  private calculateQuantityFromSerials(fromSerial: string, toSerial: string): number {
    if (!fromSerial || !toSerial) return 0;
    
    const fromNum = this.extractSerialNumber(fromSerial);
    const toNum = this.extractSerialNumber(toSerial);
    
    if (fromNum && toNum && toNum >= fromNum) {
      return toNum - fromNum + 1;
    }
    
    return 0;
  }

  // Modern styling methods for the new design
  getModernStatusClass(status: string): string {
    switch (status) {
      case 'ARRIVED':
        return 'status-arrived';
      case 'PENDING_ARRIVAL':
        return 'status-pending';
      case 'APPROVED':
        return 'status-approved';
      case 'REJECTED':
        return 'status-rejected';
      default:
        return 'status-default';
    }
  }

  getModernTypeClass(type: string): string {
    switch (type) {
      case 'LOCAL':
        return 'type-local';
      case 'EXPORT':
        return 'type-export';
      case 'DEFENCE':
        return 'type-defence';
      default:
        return 'type-default';
    }
  }

  // Get the actual date when officer saved the arrival details
  getActualArrivalDate(roll: any, record: HologramRecord): string {
    // First check if there's a specific arrival date for this roll/carton
    if (roll.arrivedDate) {
      return new Date(roll.arrivedDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }

    // Check if there's a general arrival date for the record (when officer saved)
    if (record.arrivedDate) {
      return new Date(record.arrivedDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }

    // Check for updated_at timestamp (when the record was last updated by officer)
    if (record.supplyChainData?.updated_at) {
      return new Date(record.supplyChainData.updated_at).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }

    // Check for any timestamp indicating when the arrival was processed
    if (record.supplyChainData?.arrival_processed_date) {
      return new Date(record.supplyChainData.arrival_processed_date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }

    // If no specific date found, return pending
    return 'Pending';
  }

  // Clean cartoon number by removing prefixes and keeping only the user-entered part
  getCleanCartoonNumber(cartoonNumber: string): string {
    if (!cartoonNumber) return '';
    
    // Remove common prefixes like "YB/6/BREW/2024/", "HRQ/", etc.
    // Keep only the last part after the final slash or the whole string if no slashes
    const parts = cartoonNumber.split('/');
    return parts[parts.length - 1] || cartoonNumber;
  }

  // Get the overall serial range from carton details (first to last)
  getOverallSerialRange(record: HologramRecord): { fromSerial: string, toSerial: string } {
    if (!record.carton_details || record.carton_details.length === 0) {
      return { fromSerial: record.fromSerial || '', toSerial: record.toSerial || '' };
    }

    let allSerials: number[] = [];
    
    // Collect all serial numbers from all carton details
    for (const carton of record.carton_details) {
      try {
        const fromSerial = carton.fromSerial || carton.from_serial;
        const toSerial = carton.toSerial || carton.to_serial;
        
        const fromNum = parseInt(fromSerial);
        const toNum = parseInt(toSerial);
        
        if (!isNaN(fromNum) && !isNaN(toNum)) {
          // Add the range to our collection
          for (let i = fromNum; i <= toNum; i++) {
            allSerials.push(i);
          }
        }
      } catch (e) {
        // Skip invalid serial numbers
        continue;
      }
    }

    if (allSerials.length === 0) {
      return { fromSerial: record.fromSerial || '', toSerial: record.toSerial || '' };
    }

    // Sort and get min/max
    allSerials.sort((a, b) => a - b);
    const minSerial = allSerials[0];
    const maxSerial = allSerials[allSerials.length - 1];

    return {
      fromSerial: minSerial.toString(),
      toSerial: maxSerial.toString()
    };
  }

  // Get unique cartoon numbers from carton details (cleaned)
  getUniqueCartoonNumbers(record: HologramRecord): string[] {
    if (!record.carton_details || record.carton_details.length === 0) {
      return record.cartoonNumber ? [this.getCleanCartoonNumber(record.cartoonNumber)] : [];
    }
    
    const uniqueNumbers = new Set<string>();
    record.carton_details.forEach(carton => {
      const cartoonNumber = carton.cartoonNumber || carton.cartoon_number || carton.carton_number;
      if (cartoonNumber) {
        const cleanNumber = this.getCleanCartoonNumber(cartoonNumber);
        if (cleanNumber) {
          uniqueNumbers.add(cleanNumber);
        }
      }
    });
    
    return Array.from(uniqueNumbers).sort();
  }




}


