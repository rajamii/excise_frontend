import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

export interface HologramRecord {
  id: number;
  date: string;
  ourRefNo: string;
  cartoonNumber?: string;
  fromSerial: string;
  toSerial: string;
  numberOfHolograms: number;
  remarks?: string;
  status: 'PENDING_ARRIVAL' | 'ARRIVED' | 'APPROVED' | 'REJECTED' | 'PENDING_APPROVAL';
  approvedDate?: string;
  arrivedDate?: string;
  procurementType?: 'Local' | 'Export' | 'Defence'; // Add procurement type
  supplyChainData?: any;
}



@Component({
  selector: 'app-hologramdetails',
  imports: [CommonModule, FormsModule],
  templateUrl: './hologramdetails.component.html',
  styleUrl: './hologramdetails.component.scss'
})
export class HologramdetailsComponent implements OnInit {
  @Output() hologramRequestsClicked = new EventEmitter<void>();

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
  updateForm = {
    cartoonNumber: '',
    fromSerial: '',
    toSerial: '',
    numberOfHolograms: 0
  };
  serialRangeValidationError: string = '';



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

  ngOnInit() {
    this.loadHologramRecords();
    this.addTestDataForArrivalTesting();
  }

  loadHologramRecords() {
    // Load hologram requests from supply chain and officer approvals
    this.loadSupplyChainHologramRequests();
    this.applyFilters();
  }

  loadSupplyChainHologramRequests() {
    // Load hologram requests from supply chain (dev-hologram page)
    const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    const hologramApplications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');

    // Load approved entries from officer in-charge
    const approvedEntries = JSON.parse(localStorage.getItem('approvedHologramEntries') || '[]');

    // Convert supply chain hologram data to register format
    // CRITICAL FIX: Create separate records for each type (Local, Export, Defence) that has quantity > 0
    const supplyChainRecords: HologramRecord[] = [];
    
    [...hologramRequests, ...hologramApplications].forEach((item: any, index: number) => {
      const baseRefNo = item.refNo || item.referenceNo || `HRQ/${new Date().getFullYear()}/${String(index + 1).padStart(3, '0')}`;
      const baseDate = item.date || new Date().toISOString().split('T')[0];
      const companyName = item.companyName || 'Unknown Company';
      
      // Create separate record for LOCAL if quantity > 0
      if (item.localQtyLakh && item.localQtyLakh > 0) {
        supplyChainRecords.push({
          id: (1000 + index) * 10 + 1, // Unique ID for LOCAL
          date: baseDate,
          ourRefNo: baseRefNo,
          cartoonNumber: item.cartoonNumber || '',
          fromSerial: item.fromSerial || '',
          toSerial: item.toSerial || '',
          numberOfHolograms: item.localQtyLakh,
          remarks: `Supply chain hologram request - ${companyName} (Local)`,
          status: this.determineStatus(item),
          approvedDate: item.approvedDate,
          arrivedDate: item.arrivedDate,
          procurementType: 'Local',
          supplyChainData: {
            ...item,
            procurementType: 'Local',
            localQtyLakh: item.localQtyLakh,
            exportQtyLakh: 0,
            defenceQtyLakh: 0
          }
        });
      }
      
      // Create separate record for EXPORT if quantity > 0
      if (item.exportQtyLakh && item.exportQtyLakh > 0) {
        supplyChainRecords.push({
          id: (1000 + index) * 10 + 2, // Unique ID for EXPORT
          date: baseDate,
          ourRefNo: baseRefNo,
          cartoonNumber: item.cartoonNumber || '',
          fromSerial: item.fromSerial || '',
          toSerial: item.toSerial || '',
          numberOfHolograms: item.exportQtyLakh,
          remarks: `Supply chain hologram request - ${companyName} (Export)`,
          status: this.determineStatus(item),
          approvedDate: item.approvedDate,
          arrivedDate: item.arrivedDate,
          procurementType: 'Export',
          supplyChainData: {
            ...item,
            procurementType: 'Export',
            localQtyLakh: 0,
            exportQtyLakh: item.exportQtyLakh,
            defenceQtyLakh: 0
          }
        });
      }
      
      // Create separate record for DEFENCE if quantity > 0
      if (item.defenceQtyLakh && item.defenceQtyLakh > 0) {
        supplyChainRecords.push({
          id: (1000 + index) * 10 + 3, // Unique ID for DEFENCE
          date: baseDate,
          ourRefNo: baseRefNo,
          cartoonNumber: item.cartoonNumber || '',
          fromSerial: item.fromSerial || '',
          toSerial: item.toSerial || '',
          numberOfHolograms: item.defenceQtyLakh,
          remarks: `Supply chain hologram request - ${companyName} (Defence)`,
          status: this.determineStatus(item),
          approvedDate: item.approvedDate,
          arrivedDate: item.arrivedDate,
          procurementType: 'Defence',
          supplyChainData: {
            ...item,
            procurementType: 'Defence',
            localQtyLakh: 0,
            exportQtyLakh: 0,
            defenceQtyLakh: item.defenceQtyLakh
          }
        });
      }
    });

    // Convert officer approved entries
    const officerRecords = approvedEntries.map((entry: any) => ({
      id: entry.id,
      date: entry.date,
      ourRefNo: entry.ourRefNo,
      cartoonNumber: entry.cartoonNumber || '',
      fromSerial: entry.fromSerial || '',
      toSerial: entry.toSerial || '',
      numberOfHolograms: entry.numberOfHolograms,
      remarks: entry.remarks,
      status: entry.status,
      approvedDate: entry.approvedDate,
      arrivedDate: entry.arrivedDate
    }));

    // Combine and deduplicate records based on ourRefNo + procurementType
    const allRecords = [...supplyChainRecords, ...officerRecords];
    const uniqueRecordsMap = new Map();

    // Deduplicate by ourRefNo + procurementType, keeping the most recent/complete record
    allRecords.forEach(record => {
      const recordKey = this.getRecordKey(record);
      const existingRecord = uniqueRecordsMap.get(recordKey);

      if (!existingRecord) {
        // No existing record, add this one
        uniqueRecordsMap.set(recordKey, record);
      } else {
        // Record exists, keep the one with more complete data or higher status
        const shouldReplace = this.shouldReplaceRecord(existingRecord, record);
        if (shouldReplace) {
          uniqueRecordsMap.set(recordKey, record);
        }
      }
    });

    // Convert map back to array
    this.hologramRecords = Array.from(uniqueRecordsMap.values());

    // Add sample data if no records exist (ensure unique reference numbers)
    if (this.hologramRecords.length === 0) {
      const sampleRecords = [
        {
          id: 1,
          date: '2024-11-03',
          ourRefNo: 'HRQ/2024/001',
          cartoonNumber: '',
          fromSerial: '',
          toSerial: '',
          numberOfHolograms: 1000, // 1000 units - Ready for update
          remarks: 'Hologram request for Premium Whisky production - Approved by Commissioner',
          status: 'PENDING_ARRIVAL' as const,
          approvedDate: '2024-11-03',
          supplyChainData: {
            refNo: 'HRQ/2024/001',
            companyName: 'Sikkim Distilleries Ltd',
            localQtyLakh: 1000, // 1000 units (field name is misleading)
            exportQtyLakh: 0,
            defenceQtyLakh: 0,
            status: 'APPROVED'
          }
        },
        {
          id: 2,
          date: '2024-11-02',
          ourRefNo: 'HRQ/2024/002',
          cartoonNumber: '',
          fromSerial: '',
          toSerial: '',
          numberOfHolograms: 5000, // 5000 units - Ready for update
          remarks: 'Hologram request for Export Rum - Approved by Commissioner',
          status: 'PENDING_ARRIVAL' as const,
          approvedDate: '2024-11-02',
          supplyChainData: {
            refNo: 'HRQ/2024/002',
            companyName: 'Sikkim Distilleries Ltd',
            localQtyLakh: 0,
            exportQtyLakh: 5000, // 5000 units (field name is misleading)
            defenceQtyLakh: 0,
            status: 'APPROVED'
          }
        },
        {
          id: 3,
          date: '2024-11-01',
          ourRefNo: 'HRQ/2024/003',
          cartoonNumber: 'CTN001',
          fromSerial: 'HG001001',
          toSerial: 'HG002000',
          numberOfHolograms: 2000, // 2000 units - Already arrived
          remarks: 'Hologram request for Local Beer production - Completed',
          status: 'ARRIVED' as const,
          approvedDate: '2024-11-01',
          arrivedDate: '2024-11-01',
          supplyChainData: {
            refNo: 'HRQ/2024/003',
            companyName: 'Sikkim Distilleries Ltd',
            localQtyLakh: 2000, // 2000 units (field name is misleading)
            exportQtyLakh: 0,
            defenceQtyLakh: 0,
            status: 'APPROVED'
          }
        },
        {
          id: 4,
          date: '2024-10-30',
          ourRefNo: 'HRQ/2024/004',
          cartoonNumber: '',
          fromSerial: '',
          toSerial: '',
          numberOfHolograms: 1500, // 1500 units - Ready for update
          remarks: 'Hologram request for Defence supplies - Approved by Commissioner',
          status: 'PENDING_ARRIVAL' as const,
          approvedDate: '2024-10-30',
          supplyChainData: {
            refNo: 'HRQ/2024/004',
            companyName: 'Sikkim Distilleries Ltd',
            localQtyLakh: 0,
            exportQtyLakh: 0,
            defenceQtyLakh: 1500, // 1500 units (field name is misleading)
            status: 'APPROVED'
          }
        },
        {
          id: 5,
          date: '2024-10-28',
          ourRefNo: 'HRQ/2024/005',
          cartoonNumber: 'CTN002',
          fromSerial: 'HG003001',
          toSerial: 'HG003500',
          numberOfHolograms: 500, // 500 units - Already arrived
          remarks: 'Hologram request for Special Edition Vodka - Completed',
          status: 'ARRIVED' as const,
          approvedDate: '2024-10-28',
          arrivedDate: '2024-10-29',
          supplyChainData: {
            refNo: 'HRQ/2024/005',
            companyName: 'Sikkim Distilleries Ltd',
            localQtyLakh: 500, // 500 units (field name is misleading)
            exportQtyLakh: 0,
            defenceQtyLakh: 0,
            status: 'APPROVED'
          }
        },
        {
          id: 6,
          date: '2024-10-25',
          ourRefNo: 'HRQ/2024/006',
          cartoonNumber: '',
          fromSerial: '',
          toSerial: '',
          numberOfHolograms: 1000, // 1000 units - Waiting for approval
          remarks: 'Hologram request for Premium Gin production - Waiting for Commissioner Approval',
          status: 'PENDING_APPROVAL' as const,
          supplyChainData: {
            refNo: 'HRQ/2024/006',
            companyName: 'Sikkim Distilleries Ltd',
            localQtyLakh: 1000, // 1000 units (field name is misleading)
            exportQtyLakh: 0,
            defenceQtyLakh: 0,
            status: 'Submitted'
          }
        }
      ];

      // Apply deduplication to sample data as well
      const uniqueSampleMap = new Map();
      sampleRecords.forEach(record => {
        uniqueSampleMap.set(record.ourRefNo, record);
      });

      this.hologramRecords = Array.from(uniqueSampleMap.values());
    }
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

    const existingPriority = statusPriority[existing.status] || 0;
    const newPriority = statusPriority[newRecord.status] || 0;

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
    // 2. Payment slip has been uploaded by supply chain
    if (record.status !== 'PENDING_ARRIVAL') {
      return false;
    }
    
    // Check if payment slip has been uploaded for this record
    return this.isPaymentSlipUploaded(record);
  }
  
  // Check if payment slip has been uploaded for this hologram record
  private isPaymentSlipUploaded(record: HologramRecord): boolean {
    // Check in supply chain data if payment slip is uploaded
    if (record.supplyChainData) {
      // Check if paymentSlipUploaded flag is set
      if (record.supplyChainData.paymentSlipUploaded === true) {
        return true;
      }
    }
    
    // Also check in hologramApplications storage
    const applications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
    const matchingApp = applications.find((app: any) => 
      app.refNo === record.ourRefNo && 
      app.procurementType === record.procurementType
    );
    
    if (matchingApp && matchingApp.paymentSlipUploaded === true) {
      return true;
    }
    
    // Check in hologramRequests storage
    const requests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    const matchingReq = requests.find((req: any) => req.refNo === record.ourRefNo);
    
    if (matchingReq && matchingReq.paymentSlipUploaded === true) {
      return true;
    }
    
    return false;
  }

  updateArrivalDetails(record: HologramRecord) {
    this.selectedRecordForUpdate = record;
    this.updateForm = {
      cartoonNumber: record.cartoonNumber || '',
      fromSerial: record.fromSerial || '',
      toSerial: record.toSerial || '',
      numberOfHolograms: record.numberOfHolograms || 0
    };
    this.showUpdateModal = true;
  }

  calculateUpdateHologramCount() {
    // Clear previous error
    this.serialRangeValidationError = '';
    
    if (this.updateForm.fromSerial && this.updateForm.toSerial) {
      const fromNum = this.extractSerialNumber(this.updateForm.fromSerial);
      const toNum = this.extractSerialNumber(this.updateForm.toSerial);

      if (fromNum && toNum && toNum >= fromNum) {
        const calculatedCount = toNum - fromNum + 1;
        
        // DON'T update the numberOfHolograms field - keep it fixed to expected quantity
        // this.updateForm.numberOfHolograms = calculatedCount; // REMOVED
        
        // Validate against expected quantity
        if (this.selectedRecordForUpdate) {
          const expectedQuantity = this.selectedRecordForUpdate.numberOfHolograms;
          
          if (calculatedCount !== expectedQuantity) {
            // Show error message
            if (calculatedCount > expectedQuantity) {
              this.serialRangeValidationError = `❌ Range exceeded! Expected: ${expectedQuantity.toLocaleString()} holograms, but serial range gives: ${calculatedCount.toLocaleString()}. Please reduce the range.`;
            } else {
              this.serialRangeValidationError = `⚠️ Range too small! Expected: ${expectedQuantity.toLocaleString()} holograms, but serial range gives: ${calculatedCount.toLocaleString()}. Please increase the range.`;
            }
            
            console.error(this.serialRangeValidationError);
          } else {
            // Clear error if counts match
            this.serialRangeValidationError = '';
          }
        }
      } else if (fromNum && toNum && toNum < fromNum) {
        this.serialRangeValidationError = '❌ Invalid range! "To Serial Number" must be greater than or equal to "From Serial Number".';
      }
    }
  }

  extractSerialNumber(serial: string): number | null {
    const match = serial.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  }

  saveArrivalUpdate() {
    if (this.selectedRecordForUpdate && this.validateUpdateForm()) {
      // Update the record
      this.selectedRecordForUpdate.cartoonNumber = this.updateForm.cartoonNumber;
      this.selectedRecordForUpdate.fromSerial = this.updateForm.fromSerial;
      this.selectedRecordForUpdate.toSerial = this.updateForm.toSerial;
      this.selectedRecordForUpdate.numberOfHolograms = this.updateForm.numberOfHolograms;
      this.selectedRecordForUpdate.status = 'ARRIVED';
      this.selectedRecordForUpdate.arrivedDate = new Date().toISOString().split('T')[0];

      // Update in storage
      this.updateHologramRecordInStorage(this.selectedRecordForUpdate);

      // Add to hologram overview rolls data
      this.addToHologramOverviewRolls(this.selectedRecordForUpdate);

      this.closeUpdateModal();
      this.applyFilters();

      alert(`Hologram ${this.selectedRecordForUpdate.ourRefNo} marked as arrived successfully and added to Rolls & Available Hologram Data!`);
    }
  }

  // Add new method to save data to hologram overview rolls, available data, and serial numbers data
  addToHologramOverviewRolls(record: HologramRecord) {
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
    if (!this.updateForm.cartoonNumber.trim()) {
      alert('Please enter cartoon number');
      return false;
    }
    if (!this.updateForm.fromSerial.trim()) {
      alert('Please enter from serial number');
      return false;
    }
    if (!this.updateForm.toSerial.trim()) {
      alert('Please enter to serial number');
      return false;
    }
    if (this.updateForm.numberOfHolograms <= 0) {
      alert('Invalid hologram count');
      return false;
    }
    return true;
  }

  closeUpdateModal() {
    this.showUpdateModal = false;
    this.selectedRecordForUpdate = null;
    this.updateForm = {
      cartoonNumber: '',
      fromSerial: '',
      toSerial: '',
      numberOfHolograms: 0
    };
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
    this.hologramRequestsClicked.emit();
  }

  openHologramOverview(): void {
    // Navigate to hologram overview page in a new tab/window for better user experience
    window.open('/dev-hologram-overview', '_blank');
  }

  // Add test data for arrival testing
  addTestDataForArrivalTesting(): void {
    const testRecords: HologramRecord[] = [
      {
        id: 9001,
        date: '2024-11-04',
        ourRefNo: 'TEST/2024/001',
        cartoonNumber: '',
        fromSerial: '',
        toSerial: '',
        numberOfHolograms: 500,
        remarks: 'TEST: Hologram request for Local Whiskey - Payment Slip Uploaded, Ready for Arrival Update',
        status: 'PENDING_ARRIVAL',
        approvedDate: '2024-11-04',
        supplyChainData: {
          refNo: 'TEST/2024/001',
          companyName: 'Test Company Ltd',
          localQtyLakh: 1000,
          exportQtyLakh: 0,
          defenceQtyLakh: 0,
          status: 'APPROVED',
          paymentSlipUploaded: true, // Payment slip uploaded - button should be active
          paymentSlipUploadDate: '2024-11-04',
          paymentSlipFileName: 'payment_slip_TEST_2024_001.pdf'
        }
      },
      {
        id: 9002,
        date: '2024-11-04',
        ourRefNo: 'TEST/2024/002',
        cartoonNumber: '',
        fromSerial: '',
        toSerial: '',
        numberOfHolograms: 2500,
        remarks: 'TEST: Hologram request for Export Rum - Waiting for Payment Slip Upload',
        status: 'PENDING_ARRIVAL',
        approvedDate: '2024-11-04',
        supplyChainData: {
          refNo: 'TEST/2024/002',
          companyName: 'Test Company Ltd',
          localQtyLakh: 0,
          exportQtyLakh: 2500,
          defenceQtyLakh: 0,
          status: 'APPROVED',
          paymentSlipUploaded: false // Payment slip NOT uploaded - button should be disabled
        }
      },
      {
        id: 9003,
        date: '2024-11-04',
        ourRefNo: 'TEST/2024/003',
        cartoonNumber: '',
        fromSerial: '',
        toSerial: '',
        numberOfHolograms: 500,
        remarks: 'TEST: Hologram request for Defence Supplies - Payment Slip Uploaded, Ready for Arrival Update',
        status: 'PENDING_ARRIVAL',
        approvedDate: '2024-11-04',
        supplyChainData: {
          refNo: 'TEST/2024/003',
          companyName: 'Test Company Ltd',
          localQtyLakh: 0,
          exportQtyLakh: 0,
          defenceQtyLakh: 500,
          status: 'APPROVED',
          paymentSlipUploaded: true, // Payment slip uploaded - button should be active
          paymentSlipUploadDate: '2024-11-04',
          paymentSlipFileName: 'payment_slip_TEST_2024_003.pdf'
        }
      }
    ];

    // Add test records to the beginning of the array for visibility
    this.hologramRecords = [...testRecords, ...this.hologramRecords];
    this.applyFilters();
  }
  
  // Helper method for supply chain to mark payment slip as uploaded
  // This should be called from the supply chain interface after payment slip upload
  markPaymentSlipUploaded(refNo: string, procurementType: string, fileName: string): void {
    // Update in hologramApplications
    const applications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
    const appIndex = applications.findIndex((app: any) => 
      app.refNo === refNo && app.procurementType === procurementType
    );
    
    if (appIndex !== -1) {
      applications[appIndex].paymentSlipUploaded = true;
      applications[appIndex].paymentSlipUploadDate = new Date().toISOString().split('T')[0];
      applications[appIndex].paymentSlipFileName = fileName;
      localStorage.setItem('hologramApplications', JSON.stringify(applications));
    }
    
    // Update in hologramRequests
    const requests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    const reqIndex = requests.findIndex((req: any) => req.refNo === refNo);
    
    if (reqIndex !== -1) {
      requests[reqIndex].paymentSlipUploaded = true;
      requests[reqIndex].paymentSlipUploadDate = new Date().toISOString().split('T')[0];
      requests[reqIndex].paymentSlipFileName = fileName;
      localStorage.setItem('hologramRequests', JSON.stringify(requests));
    }
    
    // Reload data to reflect changes
    this.loadHologramRecords();
    
    console.log(`✅ Payment slip marked as uploaded for ${refNo} (${procurementType})`);
  }




}
