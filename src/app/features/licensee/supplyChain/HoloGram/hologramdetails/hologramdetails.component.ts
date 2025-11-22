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
  
  // Saved cartons list
  savedCartons: Array<{
    cartoonNumber: string;
    fromSerial: string;
    toSerial: string;
    numberOfHolograms: number;
  }> = [];
  
  // Current carton being entered
  currentCarton = {
    cartoonNumber: '',
    fromSerial: '',
    toSerial: '',
    numberOfHolograms: 0
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

    // FILTER: Only include YB (Hologram Procurement) entries, exclude HRQ (Hologram Request) entries
    // This component shows PROCUREMENT register, not REQUEST register
    console.log('📋 Total hologramRequests before filter:', hologramRequests.length);
    console.log('📋 Total hologramApplications before filter:', hologramApplications.length);
    
    const filteredRequests = hologramRequests.filter((item: any) => {
      const refNo = item.refNo || item.referenceNo || '';
      const isYB = refNo.startsWith('YB/');
      
      if (!isYB && refNo) {
        console.log(`🚫 Filtering out hologramRequest: ${refNo} (not YB - not procurement)`);
      }
      
      return isYB;
    });
    
    const filteredApplications = hologramApplications.filter((item: any) => {
      const refNo = item.refNo || item.referenceNo || '';
      const isYB = refNo.startsWith('YB/');
      
      if (!isYB && refNo) {
        console.log(`🚫 Filtering out hologramApplication: ${refNo} (not YB - not procurement)`);
      }
      
      return isYB;
    });
    
    console.log('✅ Filtered hologramRequests (YB only):', filteredRequests.length);
    console.log('✅ Filtered hologramApplications (YB only):', filteredApplications.length);

    // Convert supply chain hologram data to register format
    // CRITICAL FIX: Create separate records for each type (Local, Export, Defence) that has quantity > 0
    const supplyChainRecords: HologramRecord[] = [];
    
    // USE FILTERED ARRAYS - NOT THE ORIGINAL ONES!
    [...filteredRequests, ...filteredApplications].forEach((item: any, index: number) => {
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
            defenceQtyLakh: 0,
            // Ensure payment flags exist (default to false if not set)
            paymentSlipUploaded: item.paymentSlipUploaded === true,
            paymentCompleted: item.paymentCompleted === true
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
            defenceQtyLakh: 0,
            // Ensure payment flags exist (default to false if not set)
            paymentSlipUploaded: item.paymentSlipUploaded === true,
            paymentCompleted: item.paymentCompleted === true
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
            defenceQtyLakh: item.defenceQtyLakh,
            // Ensure payment flags exist (default to false if not set)
            paymentSlipUploaded: item.paymentSlipUploaded === true,
            paymentCompleted: item.paymentCompleted === true
          }
        });
      }
    });

    // Convert officer approved entries - FILTER to only include YB (procurement) entries
    const officerRecords = approvedEntries
      .filter((entry: any) => {
        const refNo = entry.ourRefNo || '';
        const isYB = refNo.startsWith('YB/');
        
        if (!isYB && refNo) {
          console.log(`🚫 Filtering out officer entry: ${refNo} (not YB - not procurement)`);
        }
        
        return isYB;
      })
      .map((entry: any) => ({
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
    
    // FINAL FILTER: Ensure no HRQ (request) entries slip through
    // Only keep YB (procurement) entries - this is the PROCUREMENT register
    const beforeFinalFilter = this.hologramRecords.length;
    this.hologramRecords = this.hologramRecords.filter(record => {
      const refNo = record.ourRefNo || '';
      const isYB = refNo.startsWith('YB/');
      
      if (!isYB) {
        console.log(`🚫 FINAL FILTER: Removing non-YB entry: ${refNo} (not procurement)`);
      }
      
      return isYB;
    });
    
    console.log(`✅ Final records count: ${this.hologramRecords.length} (filtered out ${beforeFinalFilter - this.hologramRecords.length} non-YB entries)`);

    // Add sample data if no records exist (ensure unique reference numbers)
    // Sample data for PROCUREMENT register (YB/ prefix)
    if (this.hologramRecords.length === 0) {
      const sampleRecords = [
        {
          id: 1,
          date: '2024-11-03',
          ourRefNo: 'YB/1/BREW/25',
          cartoonNumber: '',
          fromSerial: '',
          toSerial: '',
          numberOfHolograms: 1000, // 1000 units - Ready for update
          remarks: 'Hologram procurement for Premium Whisky production - Approved by Commissioner - PAYMENT COMPLETED ✅',
          status: 'PENDING_ARRIVAL' as const,
          approvedDate: '2024-11-03',
          supplyChainData: {
            refNo: 'YB/1/BREW/25',
            companyName: 'Yuksom Breweries Ltd.',
            localQtyLakh: 1000, // 1000 units (field name is misleading)
            exportQtyLakh: 0,
            defenceQtyLakh: 0,
            status: 'APPROVED',
            paymentSlipUploaded: true,  // Payment slip uploaded
            paymentCompleted: true      // ✅ PAYMENT COMPLETED - Button will be ENABLED
          }
        },
        {
          id: 2,
          date: '2024-11-02',
          ourRefNo: 'YB/2/BREW/25',
          cartoonNumber: '',
          fromSerial: '',
          toSerial: '',
          numberOfHolograms: 5000, // 5000 units - Ready for update
          remarks: 'Hologram procurement for Export Rum - Approved by Commissioner',
          status: 'PENDING_ARRIVAL' as const,
          approvedDate: '2024-11-02',
          supplyChainData: {
            refNo: 'YB/2/BREW/25',
            companyName: 'Yuksom Breweries Ltd.',
            localQtyLakh: 0,
            exportQtyLakh: 5000, // 5000 units (field name is misleading)
            defenceQtyLakh: 0,
            status: 'APPROVED'
          }
        },
        {
          id: 3,
          date: '2024-11-01',
          ourRefNo: 'YB/3/BREW/25',
          cartoonNumber: 'CTN001',
          fromSerial: 'HG001001',
          toSerial: 'HG002000',
          numberOfHolograms: 2000, // 2000 units - Already arrived
          remarks: 'Hologram procurement for Local Beer production - Completed',
          status: 'ARRIVED' as const,
          approvedDate: '2024-11-01',
          arrivedDate: '2024-11-01',
          supplyChainData: {
            refNo: 'YB/3/BREW/25',
            companyName: 'Yuksom Breweries Ltd.',
            localQtyLakh: 2000, // 2000 units (field name is misleading)
            exportQtyLakh: 0,
            defenceQtyLakh: 0,
            status: 'APPROVED'
          }
        },
        {
          id: 4,
          date: '2024-10-30',
          ourRefNo: 'YB/4/BREW/25',
          cartoonNumber: '',
          fromSerial: '',
          toSerial: '',
          numberOfHolograms: 1500, // 1500 units - Ready for update
          remarks: 'Hologram procurement for Defence supplies - Approved by Commissioner',
          status: 'PENDING_ARRIVAL' as const,
          approvedDate: '2024-10-30',
          supplyChainData: {
            refNo: 'YB/4/BREW/25',
            companyName: 'Yuksom Breweries Ltd.',
            localQtyLakh: 0,
            exportQtyLakh: 0,
            defenceQtyLakh: 1500, // 1500 units (field name is misleading)
            status: 'APPROVED'
          }
        },
        {
          id: 5,
          date: '2024-10-28',
          ourRefNo: 'YB/5/BREW/25',
          cartoonNumber: 'CTN002',
          fromSerial: 'HG003001',
          toSerial: 'HG003500',
          numberOfHolograms: 500, // 500 units - Already arrived
          remarks: 'Hologram procurement for Special Edition Vodka - Completed',
          status: 'ARRIVED' as const,
          approvedDate: '2024-10-28',
          arrivedDate: '2024-10-29',
          supplyChainData: {
            refNo: 'YB/5/BREW/25',
            companyName: 'Yuksom Breweries Ltd.',
            localQtyLakh: 500, // 500 units (field name is misleading)
            exportQtyLakh: 0,
            defenceQtyLakh: 0,
            status: 'APPROVED'
          }
        },
        {
          id: 6,
          date: '2024-10-25',
          ourRefNo: 'YB/6/BREW/25',
          cartoonNumber: '',
          fromSerial: '',
          toSerial: '',
          numberOfHolograms: 1000, // 1000 units - Waiting for approval
          remarks: 'Hologram procurement for Premium Gin production - Waiting for Commissioner Approval',
          status: 'PENDING_APPROVAL' as const,
          supplyChainData: {
            refNo: 'YB/6/BREW/25',
            companyName: 'Yuksom Breweries Ltd.',
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
    // 2. Payment has been COMPLETED (not just slip uploaded)
    if (record.status !== 'PENDING_ARRIVAL') {
      return false;
    }
    
    // Check if payment has been completed for this record
    return this.isPaymentCompleted(record);
  }
  
  // Check if payment has been COMPLETED for this hologram record
  // This is different from paymentSlipUploaded - payment must be actually made
  private isPaymentCompleted(record: HologramRecord): boolean {
    console.log(`🔍 Checking payment completion for ${record.ourRefNo} (${record.procurementType})`);
    
    // Check in supply chain data if payment is completed
    if (record.supplyChainData) {
      console.log(`  - supplyChainData.paymentCompleted:`, record.supplyChainData.paymentCompleted);
      // Check if paymentCompleted flag is set
      if (record.supplyChainData.paymentCompleted === true) {
        console.log(`  ✅ Payment completed (from supplyChainData)`);
        return true;
      }
    }
    
    // Also check in hologramApplications storage
    const applications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
    const matchingApp = applications.find((app: any) => 
      app.refNo === record.ourRefNo && 
      app.procurementType === record.procurementType
    );
    
    console.log(`  - hologramApplications match:`, matchingApp ? 'found' : 'not found');
    if (matchingApp) {
      console.log(`    - paymentSlipUploaded:`, matchingApp.paymentSlipUploaded);
      console.log(`    - paymentCompleted:`, matchingApp.paymentCompleted);
    }
    
    // ONLY check paymentCompleted flag (not paymentSlipUploaded)
    if (matchingApp && matchingApp.paymentCompleted === true) {
      console.log(`  ✅ Payment completed (from hologramApplications)`);
      return true;
    }
    
    // Check in hologramRequests storage
    const requests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    const matchingReq = requests.find((req: any) => req.refNo === record.ourRefNo);
    
    console.log(`  - hologramRequests match:`, matchingReq ? 'found' : 'not found');
    if (matchingReq) {
      console.log(`    - paymentSlipUploaded:`, matchingReq.paymentSlipUploaded);
      console.log(`    - paymentCompleted:`, matchingReq.paymentCompleted);
    }
    
    // ONLY check paymentCompleted flag (not paymentSlipUploaded)
    if (matchingReq && matchingReq.paymentCompleted === true) {
      console.log(`  ✅ Payment completed (from hologramRequests)`);
      return true;
    }
    
    console.log(`  ❌ Payment NOT completed - button should be DISABLED`);
    return false;
  }

  updateArrivalDetails(record: HologramRecord) {
    this.selectedRecordForUpdate = record;
    // Reset saved cartons and current carton
    this.savedCartons = [];
    this.currentCarton = {
      cartoonNumber: '',
      fromSerial: '',
      toSerial: '',
      numberOfHolograms: 0
    };
    this.totalCalculatedHolograms = 0;
    this.serialRangeValidationError = '';
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
  }

  // Save current carton to the list
  saveCurrentCarton() {
    // Validate current carton
    if (!this.currentCarton.cartoonNumber.trim()) {
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

    // Check if adding this carton would exceed expected quantity
    if (this.selectedRecordForUpdate) {
      const expectedQuantity = this.selectedRecordForUpdate.numberOfHolograms;
      const newTotal = this.totalCalculatedHolograms + this.currentCarton.numberOfHolograms;
      
      if (newTotal > expectedQuantity) {
        alert(`Cannot add this carton. Total would be ${newTotal.toLocaleString()} which exceeds expected ${expectedQuantity.toLocaleString()} holograms.`);
        return;
      }
    }

    // Add to saved cartons
    this.savedCartons.push({
      cartoonNumber: this.currentCarton.cartoonNumber,
      fromSerial: this.currentCarton.fromSerial,
      toSerial: this.currentCarton.toSerial,
      numberOfHolograms: this.currentCarton.numberOfHolograms
    });

    // Update total
    this.calculateTotalFromSavedCartons();

    // Reset current carton for next entry
    this.currentCarton = {
      cartoonNumber: '',
      fromSerial: '',
      toSerial: '',
      numberOfHolograms: 0
    };

    // Show success message
    alert(`Carton saved successfully! Total: ${this.totalCalculatedHolograms.toLocaleString()} / ${this.selectedRecordForUpdate?.numberOfHolograms.toLocaleString()}`);
  }

  // Remove a saved carton
  removeSavedCarton(index: number) {
    this.savedCartons.splice(index, 1);
    this.calculateTotalFromSavedCartons();
  }

  // Calculate total from saved cartons
  calculateTotalFromSavedCartons() {
    this.totalCalculatedHolograms = this.savedCartons.reduce((total, carton) => {
      return total + (carton.numberOfHolograms || 0);
    }, 0);

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
    return this.currentCarton.cartoonNumber.trim() !== '' &&
           this.currentCarton.fromSerial.trim() !== '' &&
           this.currentCarton.toSerial.trim() !== '' &&
           this.currentCarton.numberOfHolograms > 0 &&
           this.serialRangeValidationError === ''; // Don't allow save if there's a validation error
  }

  extractSerialNumber(serial: string): number | null {
    const match = serial.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  }

  saveArrivalUpdate() {
    if (this.selectedRecordForUpdate && this.validateUpdateForm()) {
      // Store allocation data for this reference number
      const allocationData = {
        refNo: this.selectedRecordForUpdate.ourRefNo,
        expectedQuantity: this.selectedRecordForUpdate.numberOfHolograms,
        allocatedCartoons: this.savedCartons.map(carton => ({
          cartoonNumber: carton.cartoonNumber,
          allocatedRanges: [{
            fromSerial: carton.fromSerial,
            toSerial: carton.toSerial,
            count: carton.numberOfHolograms
          }]
        })),
        totalAllocated: this.totalCalculatedHolograms,
        allocationDate: new Date().toISOString()
      };
      
      localStorage.setItem(
        `hologramAllocation_${this.selectedRecordForUpdate.ourRefNo}`,
        JSON.stringify(allocationData)
      );

      // Process each carton separately
      this.savedCartons.forEach((carton, index) => {
        // Create a copy of the record for each carton
        const cartonRecord = {
          ...this.selectedRecordForUpdate!,
          id: this.selectedRecordForUpdate!.id + index * 0.1, // Unique ID for each carton
          cartoonNumber: carton.cartoonNumber,
          fromSerial: carton.fromSerial,
          toSerial: carton.toSerial,
          numberOfHolograms: carton.numberOfHolograms,
          status: 'ARRIVED' as const,
          arrivedDate: new Date().toISOString().split('T')[0]
        };

        // Add each carton to hologram overview rolls data
        this.addToHologramOverviewRolls(cartonRecord);
      });

      // Update the main record status
      this.selectedRecordForUpdate.status = 'ARRIVED';
      this.selectedRecordForUpdate.arrivedDate = new Date().toISOString().split('T')[0];
      this.selectedRecordForUpdate.cartoonNumber = this.savedCartons.map(c => c.cartoonNumber).join(', ');
      this.selectedRecordForUpdate.fromSerial = this.savedCartons[0].fromSerial;
      this.selectedRecordForUpdate.toSerial = this.savedCartons[this.savedCartons.length - 1].toSerial;

      // Update in storage
      this.updateHologramRecordInStorage(this.selectedRecordForUpdate);

      this.closeUpdateModal();
      this.applyFilters();

      alert(`Hologram ${this.selectedRecordForUpdate.ourRefNo} marked as arrived successfully with ${this.savedCartons.length} carton(s) and added to Rolls & Available Hologram Data!`);
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

    return true;
  }

  closeUpdateModal() {
    this.showUpdateModal = false;
    this.selectedRecordForUpdate = null;
    this.savedCartons = [];
    this.currentCarton = {
      cartoonNumber: '',
      fromSerial: '',
      toSerial: '',
      numberOfHolograms: 0
    };
    this.totalCalculatedHolograms = 0;
    this.serialRangeValidationError = '';
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




}
