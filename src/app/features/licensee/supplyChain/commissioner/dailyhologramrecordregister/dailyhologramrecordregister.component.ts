import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface DailyRegisterEntry {
  id: string;
  slNo: number;
  referenceNo: string;
  submissionDate: string;
  usageDate: string;
  brandDetails: {
    brandName: string;
    alcoholPercent: string;
    sizeMl: number;
    liquorType: string;
  };
  type: 'LOCAL' | 'EXPORT' | 'DEFENCE';
  bottleSize: string;
  hologramQty: number;
  status: 'APPLIED' | 'UNDER_PROCESS' | 'COMPLETED';
  completedOnTime: boolean;
  submittedDate: string;
  submittedTime: string;
  approvalDate?: string;
  approvalTime?: string;
  completionDate?: string;
  completionTime?: string;
  deadline?: string; // 5 PM on approval date (only set when approved)
  isOverdue: boolean;
  overdueHours?: number;
  allocations?: any[];
  distilleryName?: string; // Added distillery/brewery name
}

interface FilterOptions {
  referenceNumber: string;
  status: string;
  type: string;
  dateFrom: string;
  dateTo: string;
  onlyOverdue: boolean;
  distillery: string; // Added distillery filter
}

@Component({
  selector: 'app-dailyhologramrecordregister',
  imports: [CommonModule, FormsModule],
  templateUrl: './dailyhologramrecordregister.component.html',
  styleUrl: './dailyhologramrecordregister.component.scss'
})
export class DailyhologramrecordregisterComponent implements OnInit {
  Math = Math;
  
  dailyRegisterEntries: DailyRegisterEntry[] = [];
  filteredEntries: DailyRegisterEntry[] = [];
  paginatedEntries: DailyRegisterEntry[] = [];

  filters: FilterOptions = {
    referenceNumber: '',
    status: '',
    type: '',
    dateFrom: '',
    dateTo: '',
    onlyOverdue: false,
    distillery: ''
  };

  // List of distilleries/breweries
  distilleries: string[] = [
    'Sikkim Distilleries Ltd',
    'Himalayan Distilleries Pvt Ltd',
    'Royal Sikkim Brewery',
    'Mountain View Distilleries',
    'Eastern Himalaya Distillery',
    'Gangtok Premium Spirits',
    'Teesta Valley Breweries',
    'Khangchendzonga Distillery'
  ];

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  // Selected entry for details modal
  selectedEntry: DailyRegisterEntry | null = null;

  // Overdue warnings
  overdueEntries: DailyRegisterEntry[] = [];

  ngOnInit() {
    // Initialize sample manufacturing register data if needed
    this.initializeSampleManufacturingData();
    
    this.loadDailyRegisterEntries();
    
    // Listen for storage changes to auto-refresh
    window.addEventListener('storage', (e) => {
      if (e.key === 'hologramRequests' || e.key === 'hologramManufacturingRegister') {
        this.loadDailyRegisterEntries();
      }
    });
    
    // Check for updates and overdue entries every 30 seconds
    setInterval(() => {
      this.loadDailyRegisterEntries();
      this.checkOverdueEntries();
    }, 30000);
  }

  private initializeSampleManufacturingData() {
    const manufacturingRegister = JSON.parse(localStorage.getItem('hologramManufacturingRegister') || '[]');
    
    // Only add sample data if manufacturing register is empty
    if (manufacturingRegister.length === 0) {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const sampleManufacturingData = [
        {
          referenceNo: 'HRQ/2025/001',
          status: 'COMPLETED',
          completionDate: threeDaysAgo.toISOString().split('T')[0] + 'T16:30:00',
          completionTime: '16:30:00'
        },
        {
          referenceNo: 'HRQ/2025/002',
          status: 'COMPLETED',
          completionDate: twoDaysAgo.toISOString().split('T')[0] + 'T18:45:00',
          completionTime: '18:45:00'
        },
        {
          referenceNo: 'HRQ/2025/003',
          status: 'COMPLETED',
          completionDate: yesterday.toISOString().split('T')[0] + 'T14:20:00',
          completionTime: '14:20:00'
        }
        // HRQ/2025/004 and later are still under process
      ];

      localStorage.setItem('hologramManufacturingRegister', JSON.stringify(sampleManufacturingData));
    }
  }

  loadDailyRegisterEntries() {
    console.log('Loading daily register entries...');
    
    // Load ALL requests from hologramRequests (not just approved)
    const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    
    console.log('Found hologram requests:', hologramRequests.length);
    
    // Add sample historical data if no real data exists
    const sampleData = this.getSampleHistoricalData();
    const allRequests = hologramRequests.length > 0 ? hologramRequests : sampleData;
    
    // Convert to daily register entries
    this.dailyRegisterEntries = allRequests.map((req: any, index: number) => {
      // Determine status based on request status
      let entryStatus: 'APPLIED' | 'UNDER_PROCESS' | 'COMPLETED' = 'APPLIED';
      let deadline: Date | null = null;
      let isOverdue = false;
      let overdueHours = 0;
      
      // Submission date and time
      const submissionDateTime = new Date(req.submissionDate || new Date());
      const submittedDateStr = submissionDateTime.toISOString().split('T')[0];
      const submittedTimeStr = req.submissionTime || submissionDateTime.toTimeString().split(' ')[0];
      
      // Approval date and time (if approved)
      let approvalDateStr: string | undefined;
      let approvalTimeStr: string | undefined;
      
      if (req.status === 'APPROVED') {
        // Check if completed in manufacturing register
        const isCompleted = this.checkIfCompleted(req.referenceNo || req.refNumber);
        
        if (isCompleted) {
          entryStatus = 'COMPLETED';
        } else {
          entryStatus = 'UNDER_PROCESS';
        }
        
        // Set approval date and deadline
        const approvalDateTime = new Date(req.approvalDate || new Date());
        approvalDateStr = approvalDateTime.toISOString().split('T')[0];
        approvalTimeStr = req.approvalTime || approvalDateTime.toTimeString().split(' ')[0];
        
        // Deadline is 5 PM (17:00) on the approval date
        deadline = new Date(approvalDateStr + 'T17:00:00');
        
        // Calculate if overdue (only for UNDER_PROCESS)
        if (entryStatus === 'UNDER_PROCESS') {
          const now = new Date();
          isOverdue = now > deadline;
          overdueHours = isOverdue ? Math.floor((now.getTime() - deadline.getTime()) / (1000 * 60 * 60)) : 0;
        }
      }
      
      // Check completion info
      const completionInfo = entryStatus === 'COMPLETED' ? this.getCompletionInfo(req.referenceNo || req.refNumber) : null;
      
      // Check if completed on time
      const completedOnTime = entryStatus === 'COMPLETED' && completionInfo && deadline
        ? new Date(completionInfo.completionDate + 'T' + completionInfo.completionTime) <= deadline
        : false;
      
      const entry: DailyRegisterEntry = {
        id: req.id || `DR${Date.now() + index}`,
        slNo: index + 1,
        referenceNo: req.referenceNo || req.refNumber,
        submissionDate: req.submissionDate || submittedDateStr,
        usageDate: req.usageDate || submittedDateStr,
        brandDetails: {
          brandName: this.getBrandLabel(req.brandName) || req.brandName || 'Unknown Brand',
          alcoholPercent: '42.8%',
          sizeMl: this.getBottleSizeNumber(req.bottleSize) || 750,
          liquorType: this.getLiquorType(req.brandName) || 'Whisky'
        },
        type: req.hologramType || req.type || 'LOCAL',
        bottleSize: req.bottleSize || '750ml',
        hologramQty: req.approvedQuantity || req.totalHolograms || 0,
        status: entryStatus,
        completedOnTime: completedOnTime,
        submittedDate: submittedDateStr,
        submittedTime: submittedTimeStr,
        approvalDate: approvalDateStr,
        approvalTime: approvalTimeStr,
        completionDate: completionInfo?.completionDate,
        completionTime: completionInfo?.completionTime,
        deadline: deadline?.toISOString(),
        isOverdue: isOverdue,
        overdueHours: overdueHours,
        allocations: req.allocations,
        distilleryName: req.distilleryName || req.companyName || 'Sikkim Distilleries Ltd'
      };
      
      return entry;
    });
    
    console.log('Daily register entries:', this.dailyRegisterEntries);
    
    // Check for overdue entries
    this.checkOverdueEntries();
    
    this.applyFilters();
  }

  checkIfCompleted(referenceNo: string): boolean {
    // Check if the request has been completed in the manufacturing register
    const manufacturingRegister = JSON.parse(localStorage.getItem('hologramManufacturingRegister') || '[]');
    const completedEntry = manufacturingRegister.find((entry: any) => 
      entry.referenceNo === referenceNo && entry.status === 'COMPLETED'
    );
    return !!completedEntry;
  }

  getCompletionInfo(referenceNo: string): { completionDate: string; completionTime: string } | null {
    const manufacturingRegister = JSON.parse(localStorage.getItem('hologramManufacturingRegister') || '[]');
    const completedEntry = manufacturingRegister.find((entry: any) => 
      entry.referenceNo === referenceNo && entry.status === 'COMPLETED'
    );
    
    if (completedEntry && completedEntry.completionDate) {
      const completionDateTime = new Date(completedEntry.completionDate);
      return {
        completionDate: completionDateTime.toISOString().split('T')[0],
        completionTime: completedEntry.completionTime || completionDateTime.toTimeString().split(' ')[0]
      };
    }
    
    return null;
  }

  checkOverdueEntries() {
    this.overdueEntries = this.dailyRegisterEntries.filter(entry => entry.isOverdue);
    
    if (this.overdueEntries.length > 0) {
      console.warn('OVERDUE ENTRIES DETECTED:', this.overdueEntries.length);
      
      // Store overdue warnings for commissioner dashboard
      localStorage.setItem('overdueHologramEntries', JSON.stringify(this.overdueEntries));
      
      // Trigger event for dashboard to pick up
      window.dispatchEvent(new CustomEvent('overdueHologramAlert', { 
        detail: { count: this.overdueEntries.length, entries: this.overdueEntries }
      }));
    } else {
      localStorage.removeItem('overdueHologramEntries');
    }
  }

  private getBrandLabel(brandValue: string): string {
    if (!brandValue) return 'Unknown Brand';
    
    const brandMap: { [key: string]: string } = {
      'sikkim-supreme': 'Sikkim Supreme Whisky',
      'himalayan-gold': 'Himalayan Gold Rum',
      'royal-sikkim': 'Royal Sikkim Brandy',
      'mountain-dew': 'Mountain Dew Vodka',
      'gangtok-special': 'Gangtok Special Whisky',
      'teesta-valley': 'Teesta Valley Rum',
      'khangchendzonga': 'Khangchendzonga Premium',
      'yuksom-heritage': 'Yuksom Heritage Whisky'
    };
    
    return brandMap[brandValue] || brandValue;
  }

  private getBottleSizeNumber(bottleSize: string): number {
    const sizeMap: { [key: string]: number } = {
      '180ml': 180,
      '375ml': 375,
      '750ml': 750,
      '1000ml': 1000
    };
    return sizeMap[bottleSize] || 750;
  }

  private getLiquorType(brandValue: string): string {
    if (brandValue?.includes('whisky') || brandValue?.includes('whiskey')) return 'Whisky';
    if (brandValue?.includes('rum')) return 'Rum';
    if (brandValue?.includes('brandy')) return 'Brandy';
    if (brandValue?.includes('vodka')) return 'Vodka';
    return 'Whisky';
  }

  private getSampleHistoricalData(): any[] {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    return [
      {
        id: 'SAMPLE001',
        referenceNo: 'HRQ/2025/001',
        refNumber: 'HRQ/2025/001',
        submissionDate: threeDaysAgo.toISOString().split('T')[0],
        usageDate: threeDaysAgo.toISOString().split('T')[0],
        brandName: 'Sikkim Supreme Whisky',
        bottleSize: '750ml',
        totalHolograms: 5000,
        hologramType: 'LOCAL',
        type: 'LOCAL',
        status: 'APPROVED',
        submissionTime: '09:00:00',
        approvalDate: threeDaysAgo.toISOString().split('T')[0],
        approvalTime: '10:30:00',
        approvedQuantity: 5000,
        distilleryName: 'Sikkim Distilleries Ltd',
        allocations: [
          { cartoonNumber: 'CTN001', fromSerial: 'LOC000001', toSerial: 'LOC005000', quantity: 5000 }
        ]
      },
      {
        id: 'SAMPLE002',
        referenceNo: 'HRQ/2025/002',
        refNumber: 'HRQ/2025/002',
        submissionDate: twoDaysAgo.toISOString().split('T')[0],
        usageDate: twoDaysAgo.toISOString().split('T')[0],
        brandName: 'Himalayan Gold Rum',
        bottleSize: '750ml',
        totalHolograms: 3000,
        hologramType: 'EXPORT',
        type: 'EXPORT',
        status: 'APPROVED',
        submissionTime: '10:00:00',
        approvalDate: twoDaysAgo.toISOString().split('T')[0],
        approvalTime: '11:15:00',
        approvedQuantity: 3000,
        distilleryName: 'Himalayan Distilleries Pvt Ltd',
        allocations: [
          { cartoonNumber: 'CTN002', fromSerial: 'EXP000001', toSerial: 'EXP003000', quantity: 3000 }
        ]
      },
      {
        id: 'SAMPLE003',
        referenceNo: 'HRQ/2025/003',
        refNumber: 'HRQ/2025/003',
        submissionDate: yesterday.toISOString().split('T')[0],
        usageDate: yesterday.toISOString().split('T')[0],
        brandName: 'Royal Sikkim Brandy',
        bottleSize: '375ml',
        totalHolograms: 2500,
        hologramType: 'LOCAL',
        type: 'LOCAL',
        status: 'APPROVED',
        submissionTime: '08:30:00',
        approvalDate: yesterday.toISOString().split('T')[0],
        approvalTime: '09:45:00',
        approvedQuantity: 2500,
        distilleryName: 'Royal Sikkim Brewery',
        allocations: [
          { cartoonNumber: 'CTN003', fromSerial: 'LOC005001', toSerial: 'LOC007500', quantity: 2500 }
        ]
      },
      {
        id: 'SAMPLE004',
        referenceNo: 'HRQ/2025/004',
        refNumber: 'HRQ/2025/004',
        submissionDate: yesterday.toISOString().split('T')[0],
        usageDate: yesterday.toISOString().split('T')[0],
        brandName: 'Mountain Dew Vodka',
        bottleSize: '750ml',
        totalHolograms: 4000,
        hologramType: 'DEFENCE',
        type: 'DEFENCE',
        status: 'APPROVED',
        submissionTime: '13:00:00',
        approvalDate: yesterday.toISOString().split('T')[0],
        approvalTime: '14:20:00',
        approvedQuantity: 4000,
        distilleryName: 'Mountain View Distilleries',
        allocations: [
          { cartoonNumber: 'CTN004', fromSerial: 'DEF000001', toSerial: 'DEF004000', quantity: 4000 }
        ]
      },
      {
        id: 'SAMPLE005',
        referenceNo: 'HRQ/2025/005',
        refNumber: 'HRQ/2025/005',
        submissionDate: today.toISOString().split('T')[0],
        usageDate: today.toISOString().split('T')[0],
        brandName: 'Gangtok Special Whisky',
        bottleSize: '750ml',
        totalHolograms: 6000,
        hologramType: 'LOCAL',
        type: 'LOCAL',
        status: 'APPROVED',
        submissionTime: '07:00:00',
        approvalDate: today.toISOString().split('T')[0],
        approvalTime: '08:00:00',
        approvedQuantity: 6000,
        distilleryName: 'Gangtok Premium Spirits',
        allocations: [
          { cartoonNumber: 'CTN005', fromSerial: 'LOC007501', toSerial: 'LOC013500', quantity: 6000 }
        ]
      },
      {
        id: 'SAMPLE006',
        referenceNo: 'HRQ/2025/006',
        refNumber: 'HRQ/2025/006',
        submissionDate: today.toISOString().split('T')[0],
        usageDate: today.toISOString().split('T')[0],
        brandName: 'Teesta Valley Rum',
        bottleSize: '1000ml',
        totalHolograms: 3500,
        hologramType: 'EXPORT',
        type: 'EXPORT',
        status: 'PENDING',
        submissionTime: '12:00:00',
        approvedQuantity: 3500,
        distilleryName: 'Teesta Valley Breweries',
        allocations: [
          { cartoonNumber: 'CTN006', fromSerial: 'EXP003001', toSerial: 'EXP006500', quantity: 3500 }
        ]
      }
    ];
  }

  applyFilters() {
    this.filteredEntries = this.dailyRegisterEntries.filter(entry => {
      const matchesReference = !this.filters.referenceNumber ||
        entry.referenceNo.toLowerCase().includes(this.filters.referenceNumber.toLowerCase());

      const matchesStatus = !this.filters.status || entry.status === this.filters.status;
      const matchesType = !this.filters.type || entry.type === this.filters.type;

      const matchesDateFrom = !this.filters.dateFrom ||
        (entry.approvalDate ? new Date(entry.approvalDate) >= new Date(this.filters.dateFrom) : 
         new Date(entry.submittedDate) >= new Date(this.filters.dateFrom));

      const matchesDateTo = !this.filters.dateTo ||
        (entry.approvalDate ? new Date(entry.approvalDate) <= new Date(this.filters.dateTo) :
         new Date(entry.submittedDate) <= new Date(this.filters.dateTo));

      const matchesOverdue = !this.filters.onlyOverdue || entry.isOverdue;

      const matchesDistillery = !this.filters.distillery || 
        entry.distilleryName === this.filters.distillery;

      return matchesReference && matchesStatus && matchesType && 
             matchesDateFrom && matchesDateTo && matchesOverdue && matchesDistillery;
    });

    this.currentPage = 1;
    this.updatePagination();
  }

  clearFilters() {
    this.filters = {
      referenceNumber: '',
      status: '',
      type: '',
      dateFrom: '',
      dateTo: '',
      onlyOverdue: false,
      distillery: ''
    };
    this.applyFilters();
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredEntries.length / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedEntries = this.filteredEntries.slice(startIndex, endIndex);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'APPLIED': return 'bg-info text-white';
      case 'UNDER_PROCESS': return 'bg-warning text-dark';
      case 'COMPLETED': return 'bg-success text-white';
      default: return 'bg-secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'APPLIED': return 'bi bi-file-earmark-text';
      case 'UNDER_PROCESS': return 'bi bi-hourglass-split';
      case 'COMPLETED': return 'bi bi-check-circle-fill';
      default: return 'bi bi-question-circle';
    }
  }

  getTypeClass(type: string): string {
    switch (type) {
      case 'LOCAL': return 'bg-success text-white';
      case 'EXPORT': return 'bg-primary text-white';
      case 'DEFENCE': return 'bg-warning text-dark';
      default: return 'bg-secondary text-white';
    }
  }

  viewEntryDetails(entry: DailyRegisterEntry) {
    this.selectedEntry = entry;
  }

  closeDetailsModal() {
    this.selectedEntry = null;
  }

  getEntryCount(status?: string): number {
    if (status) {
      return this.filteredEntries.filter(entry => entry.status === status).length;
    }
    return this.filteredEntries.length;
  }

  getTotalHolograms(): number {
    return this.filteredEntries.reduce((total, entry) => total + entry.hologramQty, 0);
  }

  getOverdueCount(): number {
    return this.overdueEntries.length;
  }

  getCompletedOnTimeCount(): number {
    return this.filteredEntries.filter(entry => entry.status === 'COMPLETED' && entry.completedOnTime).length;
  }

  getCompletedLateCount(): number {
    return this.filteredEntries.filter(entry => entry.status === 'COMPLETED' && !entry.completedOnTime).length;
  }

  exportData() {
    console.log('Exporting daily register data:', this.filteredEntries);
    alert('Export functionality will be implemented with backend integration');
  }

  refreshData() {
    this.loadDailyRegisterEntries();
    alert('Daily register refreshed successfully!');
  }

  loadSampleData() {
    // Clear existing data
    localStorage.removeItem('hologramRequests');
    localStorage.removeItem('hologramManufacturingRegister');
    
    // Initialize sample data
    this.initializeSampleManufacturingData();
    
    // Reload entries
    this.loadDailyRegisterEntries();
    
    alert('Sample historical data loaded successfully! You can now see 6 sample entries with different statuses.');
  }

  clearAllData() {
    if (confirm('Are you sure you want to clear all register data? This will remove all entries.')) {
      localStorage.removeItem('hologramRequests');
      localStorage.removeItem('hologramManufacturingRegister');
      localStorage.removeItem('overdueHologramEntries');
      
      this.dailyRegisterEntries = [];
      this.filteredEntries = [];
      this.paginatedEntries = [];
      this.overdueEntries = [];
      
      alert('All register data cleared successfully!');
    }
  }

  getTimeRemaining(entry: DailyRegisterEntry): string {
    if (entry.status === 'APPLIED') {
      return 'Awaiting Approval';
    }
    
    if (entry.status === 'COMPLETED') {
      return 'Completed';
    }

    if (!entry.deadline) {
      return 'No deadline set';
    }

    const now = new Date();
    const deadline = new Date(entry.deadline);
    const diffMs = deadline.getTime() - now.getTime();

    if (diffMs < 0) {
      const hoursOverdue = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
      const minutesOverdue = Math.floor((Math.abs(diffMs) % (1000 * 60 * 60)) / (1000 * 60));
      return `Overdue by ${hoursOverdue}h ${minutesOverdue}m`;
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m remaining`;
  }

  getTimeRemainingClass(entry: DailyRegisterEntry): string {
    if (entry.status === 'APPLIED') {
      return 'text-info';
    }
    
    if (entry.status === 'COMPLETED') {
      return 'text-success';
    }

    if (!entry.deadline) {
      return 'text-muted';
    }

    const now = new Date();
    const deadline = new Date(entry.deadline);
    const diffMs = deadline.getTime() - now.getTime();

    if (diffMs < 0) {
      return 'text-danger fw-bold';
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (hours < 2) {
      return 'text-danger';
    } else if (hours < 4) {
      return 'text-warning';
    }
    
    return 'text-success';
  }
}
