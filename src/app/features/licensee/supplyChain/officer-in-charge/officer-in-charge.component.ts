import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HologramdetailsComponent } from '../HoloGram/hologramdetails/hologramdetails.component';
import { OfficerinchargehologramreqComponent } from '../HoloGram/officerinchargehologramreq/officerinchargehologramreq.component';
import { HologramMonthlyReportComponent } from '../registers/hologram-monthly-report/hologram-monthly-report.component';
import { BrandwarehouseComponent } from '../registers/brandwarehouse/brandwarehouse.component';
import { OicdailyhologramregisterComponent } from '../registers/oicdailyhologramregister/oicdailyhologramregister.component';
import { OicTransitPermitComponent } from '../supplychaincomponents/oic-transit-permit/oic-transit-permit.component';

interface TransitPermitRecord {
  referenceNo: string;
  submissionDate: string;
  distilleryName: string;
  paymentStatus: string;
  amount: string;
  status: string;
  applicationDetails?: any;
}

interface FilterOptions {
  referenceNumber: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

interface OfficerInfo {
  name: string;
  distilleryName: string;
  phone: string;
  email: string;
  officerId: string;
}

interface OfficerActivity {
  dateTime: string;
  action: string;
  referenceNo: string;
  amount: string;
  status: string;
  comments: string;
}

// Mirror distillery brands register structure
type BrandStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface BrandRow {
  id: string;
  brandName: string;
  liquorType?: string; // SDL only
  alcoholPercent: string;
  sizeMl: number;
  producedDate: string; // ISO yyyy-mm-dd
  qtyInHandLocal: number;
  qtyInHandExport: number;
  qtyProducedLocal: number;
  qtyProducedExport: number;
  qtyIssuedLocal: number;
  qtyIssuedExport: number;
  closingLocal: number;
  closingExport: number;
  status: BrandStatus;
  editing?: boolean;
  changes?: Partial<Record<keyof BrandRow, boolean>>;
}

@Component({
  selector: 'app-officer-in-charge',
  standalone: true,
  imports: [CommonModule, FormsModule, HologramdetailsComponent, OfficerinchargehologramreqComponent, OicdailyhologramregisterComponent, HologramMonthlyReportComponent, BrandwarehouseComponent, OicTransitPermitComponent],
  templateUrl: './officer-in-charge.component.html',
  styleUrl: './officer-in-charge.component.scss'
})
export class OfficerInChargeComponent implements OnInit {
  Math = Math;
  activeTab = 'applications';
  activeBrand: 'SDL' | 'JAGATJIT' = 'SDL';
  showHologramRequests = false;

  // Current officer information - in real app, this would come from authentication
  currentOfficer: OfficerInfo = {
    name: 'Rajesh Kumar',
    distilleryName: 'Sikkim Distilleries Ltd',
    phone: '+91 98765 43210',
    email: 'rajesh.kumar@sikkimdistilleries.com',
    officerId: 'OFF001'
  };

  // Sample officer activities for the register
  officerActivities: OfficerActivity[] = [
    {
      dateTime: '2024-01-15 14:30:25',
      action: 'APPROVED',
      referenceNo: 'TP003/2024',
      amount: '18000.00',
      status: 'APPROVED',
      comments: 'Application approved after document verification'
    },
    {
      dateTime: '2024-01-12 16:45:10',
      action: 'TERMINATED',
      referenceNo: 'TP004/2024',
      amount: '9500.00',
      status: 'TERMINATED',
      comments: 'Incomplete documentation provided'
    },
    {
      dateTime: '2024-01-10 11:20:15',
      action: 'APPROVED',
      referenceNo: 'TP006/2024',
      amount: '13500.00',
      status: 'APPROVED',
      comments: 'All requirements met'
    },
    {
      dateTime: '2024-01-08 09:15:30',
      action: 'TERMINATED',
      referenceNo: 'TP008/2024',
      amount: '14200.00',
      status: 'TERMINATED',
      comments: 'Payment verification failed'
    },
    {
      dateTime: '2024-01-06 13:45:20',
      action: 'APPROVED',
      referenceNo: 'TP010/2024',
      amount: '11200.00',
      status: 'APPROVED',
      comments: 'Application processed successfully'
    }
  ];

  // Month/Year/Date filters to mirror distillery page
  months = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' }, { value: '03', label: 'March' },
    { value: '04', label: 'April' }, { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' }, { value: '09', label: 'September' },
    { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' }
  ];
  years = Array.from({ length: 7 }, (_, i) => (2022 + i).toString());
  selectedMonth = (('0' + (new Date().getMonth() + 1)).slice(-2));
  selectedYear = new Date().getFullYear().toString();
  selectedDate = '';
  todayIso = new Date().toISOString().substring(0, 10);

  // Distillery-provided brand rows (sample). In real app fetch per distillery and brand.
  baseRowsSDL: BrandRow[] = [
    {
      id: 'SDL-1', brandName: 'SDL Premium Whisky', liquorType: 'Whisky', alcoholPercent: '42.8%', sizeMl: 750,
      producedDate: '2025-10-13', qtyInHandLocal: 10, qtyInHandExport: 5, qtyProducedLocal: 30, qtyProducedExport: 10,
      qtyIssuedLocal: 20, qtyIssuedExport: 5, closingLocal: 20, closingExport: 10, status: 'PENDING'
    },
    {
      id: 'SDL-2', brandName: 'SDL Reserve Brandy', liquorType: 'Brandy', alcoholPercent: '42.8%', sizeMl: 750,
      producedDate: '2025-10-12', qtyInHandLocal: 12, qtyInHandExport: 3, qtyProducedLocal: 20, qtyProducedExport: 8,
      qtyIssuedLocal: 10, qtyIssuedExport: 4, closingLocal: 22, closingExport: 7, status: 'APPROVED'
    },
    {
      id: 'SDL-3', brandName: 'SDL Classic Rum', liquorType: 'Rum', alcoholPercent: '40%', sizeMl: 375,
      producedDate: '2025-10-11', qtyInHandLocal: 6, qtyInHandExport: 2, qtyProducedLocal: 18, qtyProducedExport: 6,
      qtyIssuedLocal: 8, qtyIssuedExport: 3, closingLocal: 16, closingExport: 5, status: 'PENDING'
    },
    {
      id: 'SDL-4', brandName: 'SDL Mountain Vodka', liquorType: 'Vodka', alcoholPercent: '40%', sizeMl: 180,
      producedDate: '2025-10-10', qtyInHandLocal: 8, qtyInHandExport: 1, qtyProducedLocal: 25, qtyProducedExport: 4,
      qtyIssuedLocal: 12, qtyIssuedExport: 2, closingLocal: 21, closingExport: 3, status: 'REJECTED'
    },
    {
      id: 'SDL-5', brandName: 'SDL Heritage Whisky', liquorType: 'Whisky', alcoholPercent: '42.8%', sizeMl: 750,
      producedDate: '2025-10-09', qtyInHandLocal: 15, qtyInHandExport: 5, qtyProducedLocal: 35, qtyProducedExport: 12,
      qtyIssuedLocal: 20, qtyIssuedExport: 6, closingLocal: 30, closingExport: 11, status: 'PENDING'
    },
    {
      id: 'SDL-6', brandName: 'SDL Pride Gin', liquorType: 'Gin', alcoholPercent: '40%', sizeMl: 750,
      producedDate: '2025-10-08', qtyInHandLocal: 5, qtyInHandExport: 2, qtyProducedLocal: 15, qtyProducedExport: 5,
      qtyIssuedLocal: 7, qtyIssuedExport: 1, closingLocal: 13, closingExport: 6, status: 'APPROVED'
    }
  ];

  baseRowsJAGATJIT: BrandRow[] = [
    {
      id: 'JAG-1', brandName: 'Jagatjit Classic', alcoholPercent: '40%', sizeMl: 750,
      producedDate: '2025-10-11', qtyInHandLocal: 8, qtyInHandExport: 2, qtyProducedLocal: 15, qtyProducedExport: 5,
      qtyIssuedLocal: 10, qtyIssuedExport: 2, closingLocal: 13, closingExport: 5, status: 'PENDING'
    },
    {
      id: 'JAG-2', brandName: 'Jagatjit Reserve', alcoholPercent: '42.8%', sizeMl: 750,
      producedDate: '2025-10-10', qtyInHandLocal: 9, qtyInHandExport: 1, qtyProducedLocal: 20, qtyProducedExport: 6,
      qtyIssuedLocal: 11, qtyIssuedExport: 2, closingLocal: 18, closingExport: 5, status: 'APPROVED'
    },
    {
      id: 'JAG-3', brandName: 'Jagatjit Silver Vodka', alcoholPercent: '40%', sizeMl: 375,
      producedDate: '2025-10-09', qtyInHandLocal: 4, qtyInHandExport: 1, qtyProducedLocal: 12, qtyProducedExport: 3,
      qtyIssuedLocal: 5, qtyIssuedExport: 2, closingLocal: 11, closingExport: 2, status: 'PENDING'
    }
  ];

  get currentBaseRows(): BrandRow[] {
    return this.activeBrand === 'SDL' ? this.baseRowsSDL : this.baseRowsJAGATJIT;
  }

  brandRows: BrandRow[] = [];

  // Brands filters and editing helpers
  brandFilters = {
    search: '',
    status: '' as '' | BrandStatus
  };

  private originalBrandById: Record<string, BrandRow> = {};

  // Sample data for development - only applications for current officer's distillery
  allData: TransitPermitRecord[] = [
    {
      referenceNo: 'TP001/2024',
      submissionDate: '2024-01-15',
      distilleryName: 'Sikkim Distilleries Ltd',
      paymentStatus: 'PAID',
      amount: '15000.00',
      status: 'PENDING_APPROVAL'
    },
    {
      referenceNo: 'TP002/2024',
      submissionDate: '2024-01-14',
      distilleryName: 'Sikkim Distilleries Ltd',
      paymentStatus: 'PAID',
      amount: '12000.00',
      status: 'PENDING_APPROVAL'
    },
    {
      referenceNo: 'TP003/2024',
      submissionDate: '2024-01-13',
      distilleryName: 'Sikkim Distilleries Ltd',
      paymentStatus: 'PAID',
      amount: '18000.00',
      status: 'APPROVED'
    },
    {
      referenceNo: 'TP004/2024',
      submissionDate: '2024-01-12',
      distilleryName: 'Sikkim Distilleries Ltd',
      paymentStatus: 'PAID',
      amount: '9500.00',
      status: 'TERMINATED'
    },
    {
      referenceNo: 'TP005/2024',
      submissionDate: '2024-01-11',
      distilleryName: 'Sikkim Distilleries Ltd',
      paymentStatus: 'PAID',
      amount: '22000.00',
      status: 'PENDING_APPROVAL'
    },
    {
      referenceNo: 'TP006/2024',
      submissionDate: '2024-01-10',
      distilleryName: 'Sikkim Distilleries Ltd',
      paymentStatus: 'PAID',
      amount: '13500.00',
      status: 'APPROVED'
    },
    {
      referenceNo: 'TP007/2024',
      submissionDate: '2024-01-09',
      distilleryName: 'Sikkim Distilleries Ltd',
      paymentStatus: 'PAID',
      amount: '16800.00',
      status: 'PENDING_APPROVAL'
    },
    {
      referenceNo: 'TP008/2024',
      submissionDate: '2024-01-08',
      distilleryName: 'Sikkim Distilleries Ltd',
      paymentStatus: 'PAID',
      amount: '14200.00',
      status: 'TERMINATED'
    },
    {
      referenceNo: 'TP009/2024',
      submissionDate: '2024-01-07',
      distilleryName: 'Sikkim Distilleries Ltd',
      paymentStatus: 'PAID',
      amount: '19800.00',
      status: 'PENDING_APPROVAL'
    },
    {
      referenceNo: 'TP010/2024',
      submissionDate: '2024-01-06',
      distilleryName: 'Sikkim Distilleries Ltd',
      paymentStatus: 'PAID',
      amount: '11200.00',
      status: 'APPROVED'
    }
  ];

  filteredData: TransitPermitRecord[] = [];
  paginatedData: TransitPermitRecord[] = [];

  filters: FilterOptions = {
    referenceNumber: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  };

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  // Modal data
  selectedRecord: TransitPermitRecord | null = null;
  approvalComments = '';
  terminationReason = '';

  // Hologram data - removed, will be added later

  ngOnInit() {
    this.filteredData = [...this.allData];
    this.updatePagination();
    this.applyBrandFilters();
  }

  currentDateTime: string = new Date().toLocaleString();

  setActiveTab(tab: string) {
    this.activeTab = tab;
    // Reset hologram requests view when switching tabs
    if (tab !== 'hologram-register') {
      this.showHologramRequests = false;
    }
  }

  openHologramRequests() {
    this.showHologramRequests = true;
  }

  closeHologramRequests() {
    this.showHologramRequests = false;
  }

  // Brands helpers
  getBrandStatusClass(status: BrandStatus): string {
    switch (status) {
      case 'PENDING': return 'bg-warning text-dark';
      case 'APPROVED': return 'bg-success';
      case 'REJECTED': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  getBrandCount(status: BrandStatus): number {
    return this.currentBaseRows.filter(b => b.status === status).length;
  }

  onBrandDateChange(value: string) {
    this.selectedDate = value;
    this.applyBrandFilters();
  }

  setBrand(brand: 'SDL' | 'JAGATJIT') {
    if (this.activeBrand === brand) return;
    this.activeBrand = brand;
    this.applyBrandFilters();
  }

  applyBrandFilters() {
    const byMonthYear = (d: string) => {
      if (!d) return false;
      const m = d.substring(5, 7);
      const y = d.substring(0, 4);
      if (this.selectedDate) return d === this.selectedDate;
      const monthOk = this.selectedMonth ? m === this.selectedMonth : true;
      const yearOk = this.selectedYear ? y === this.selectedYear : true;
      return monthOk && yearOk;
    };

    const searchLc = this.brandFilters.search.toLowerCase();

    this.brandRows = this.currentBaseRows.filter(r => {
      const matchDate = byMonthYear(r.producedDate);
      const matchSearch = !searchLc || [r.brandName, r.liquorType || '', String(r.sizeMl), r.alcoholPercent]
        .some(v => v.toLowerCase().includes(searchLc));
      const matchStatus = !this.brandFilters.status || r.status === this.brandFilters.status;
      return matchDate && matchSearch && matchStatus;
    }).map(r => ({ ...r }));
  }

  startEditBrand(brand: BrandRow) {
    if (brand.editing) return;
    brand.editing = true;
    brand.changes = {};
    // deep copy original editable fields
    this.originalBrandById[brand.id] = { ...brand, editing: false, changes: {} } as BrandRow;
  }

  cancelEditBrand(brand: BrandRow) {
    const orig = this.originalBrandById[brand.id];
    if (orig) {
      brand.brandName = orig.brandName;
      brand.liquorType = orig.liquorType;
      brand.alcoholPercent = orig.alcoholPercent;
      brand.sizeMl = orig.sizeMl;
      brand.qtyInHandLocal = orig.qtyInHandLocal;
      brand.qtyInHandExport = orig.qtyInHandExport;
      brand.qtyProducedLocal = orig.qtyProducedLocal;
      brand.qtyProducedExport = orig.qtyProducedExport;
      brand.qtyIssuedLocal = orig.qtyIssuedLocal;
      brand.qtyIssuedExport = orig.qtyIssuedExport;
      brand.closingLocal = orig.closingLocal;
      brand.closingExport = orig.closingExport;
    }
    brand.editing = false;
    brand.changes = {};
  }

  saveEditBrand(brand: BrandRow) {
    // Log activity summarizing edited fields
    const editedFields = Object.keys(brand.changes || {}).filter(k => (brand.changes as any)[k]);
    if (editedFields.length > 0) {
      this.officerActivities.unshift({
        dateTime: new Date().toLocaleString(),
        action: 'APPROVED',
        referenceNo: brand.id,
        amount: '0.00',
        status: 'APPROVED',
        comments: `Edited fields: ${editedFields.join(', ')}`
      });
    }
    brand.editing = false;
  }

  onBrandFieldChange(brand: BrandRow, field: keyof BrandRow, value: string | number) {
    // limit to editable fields
    const editable: (keyof BrandRow)[] = ['brandName', 'liquorType', 'alcoholPercent', 'sizeMl', 'qtyInHandLocal', 'qtyInHandExport', 'qtyProducedLocal', 'qtyProducedExport', 'qtyIssuedLocal', 'qtyIssuedExport'];
    if (!editable.includes(field)) return;
    const orig = this.originalBrandById[brand.id];
    (brand as any)[field] = value;
    if (!brand.changes) brand.changes = {};
    const changed = orig ? (orig as any)[field] !== value : true;
    (brand.changes as any)[field] = changed;
    // recalc closings for qty changes
    if (['qtyInHandLocal', 'qtyProducedLocal', 'qtyIssuedLocal'].includes(field as string)) {
      brand.closingLocal = (Number(brand.qtyInHandLocal) || 0) + (Number(brand.qtyProducedLocal) || 0) - (Number(brand.qtyIssuedLocal) || 0);
    }
    if (['qtyInHandExport', 'qtyProducedExport', 'qtyIssuedExport'].includes(field as string)) {
      brand.closingExport = (Number(brand.qtyInHandExport) || 0) + (Number(brand.qtyProducedExport) || 0) - (Number(brand.qtyIssuedExport) || 0);
    }
  }

  viewBrand(brand: BrandRow) {
    alert(`Viewing brand: ${brand.brandName} (${brand.liquorType || '-'}) - ${brand.sizeMl}ml`);
  }

  approveBrand(brand: BrandRow) {
    if (brand.status !== 'PENDING') return;
    brand.status = 'APPROVED';
    // Log activity
    this.officerActivities.unshift({
      dateTime: new Date().toLocaleString(),
      action: 'APPROVED',
      referenceNo: brand.id,
      amount: '0.00',
      status: 'APPROVED',
      comments: `Brand approved: ${brand.brandName}`
    });
  }

  rejectBrand(brand: BrandRow) {
    if (brand.status !== 'PENDING') return;
    const reason = prompt('Enter rejection reason:');
    if (reason === null || !reason.trim()) return;
    brand.status = 'REJECTED';
    // Log activity
    this.officerActivities.unshift({
      dateTime: new Date().toLocaleString(),
      action: 'TERMINATED',
      referenceNo: brand.id,
      amount: '0.00',
      status: 'TERMINATED',
      comments: `Brand rejected: ${brand.brandName}. Reason: ${reason}`
    });
  }

  applyFilters() {
    this.filteredData = this.allData.filter(record => {
      const matchesReference = !this.filters.referenceNumber ||
        record.referenceNo.toLowerCase().includes(this.filters.referenceNumber.toLowerCase());

      const matchesStatus = !this.filters.status ||
        record.status === this.filters.status;

      const matchesDateFrom = !this.filters.dateFrom ||
        new Date(record.submissionDate) >= new Date(this.filters.dateFrom);

      const matchesDateTo = !this.filters.dateTo ||
        new Date(record.submissionDate) <= new Date(this.filters.dateTo);

      return matchesReference && matchesStatus &&
        matchesDateFrom && matchesDateTo;
    });

    this.currentPage = 1;
    this.updatePagination();
  }

  clearFilters() {
    this.filters = {
      referenceNumber: '',
      status: '',
      dateFrom: '',
      dateTo: ''
    };
    this.filteredData = [...this.allData];
    this.currentPage = 1;
    this.updatePagination();
  }

  exportData() {
    // In a real application, this would export the filtered data
    console.log('Exporting data:', this.filteredData);
    alert('Export functionality will be implemented with backend integration');
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredData.length / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedData = this.filteredData.slice(startIndex, endIndex);
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

  getPaymentStatusClass(status: string): string {
    switch (status) {
      case 'PAID': return 'bg-success';
      case 'PENDING': return 'bg-warning';
      case 'FAILED': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  getPaymentStatusIcon(status: string): string {
    switch (status) {
      case 'PAID': return 'bi bi-check-circle';
      case 'PENDING': return 'bi bi-clock';
      case 'FAILED': return 'bi bi-x-circle';
      default: return 'bi bi-question-circle';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING_APPROVAL': return 'bg-warning text-dark';
      case 'APPROVED': return 'bg-success';
      case 'TERMINATED': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'PENDING_APPROVAL': return 'bi bi-clock';
      case 'APPROVED': return 'bi bi-check-circle';
      case 'TERMINATED': return 'bi bi-x-circle';
      default: return 'bi bi-question-circle';
    }
  }

  getActivityClass(action: string): string {
    switch (action) {
      case 'APPROVED': return 'bg-success';
      case 'TERMINATED': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  getActivityIcon(action: string): string {
    switch (action) {
      case 'APPROVED': return 'bi bi-check-circle';
      case 'TERMINATED': return 'bi bi-x-circle';
      default: return 'bi bi-question-circle';
    }
  }

  viewDetails(record: TransitPermitRecord) {
    console.log('Viewing details for:', record);
    // Navigate to transit view level 2 component
    window.open(`/dev-supply-chain-transit-view-level2?ref=${record.referenceNo}`, '_blank');
  }

  approveApplication(record: TransitPermitRecord) {
    this.selectedRecord = record;
    this.approvalComments = '';
    // In a real application, you would open the modal here
    // For now, we'll show an alert
    const comments = prompt('Enter approval comments (optional):');
    if (comments !== null) {
      this.approvalComments = comments;
      this.confirmApproval();
    }
  }

  terminateApplication(record: TransitPermitRecord) {
    this.selectedRecord = record;
    this.terminationReason = '';
    // In a real application, you would open the modal here
    // For now, we'll show an alert
    const reason = prompt('Enter termination reason (required):');
    if (reason && reason.trim()) {
      this.terminationReason = reason;
      this.confirmTermination();
    }
  }

  confirmApproval() {
    if (this.selectedRecord) {
      // Update the record status
      const recordIndex = this.allData.findIndex(r => r.referenceNo === this.selectedRecord!.referenceNo);
      if (recordIndex !== -1) {
        this.allData[recordIndex].status = 'APPROVED';
        this.applyFilters();
      }

      // Add activity to register
      const newActivity: OfficerActivity = {
        dateTime: new Date().toLocaleString(),
        action: 'APPROVED',
        referenceNo: this.selectedRecord.referenceNo,
        amount: this.selectedRecord.amount,
        status: 'APPROVED',
        comments: this.approvalComments || 'Application approved'
      };
      this.officerActivities.unshift(newActivity);

      console.log('Application approved:', this.selectedRecord.referenceNo);
      console.log('Comments:', this.approvalComments);
      alert(`Application ${this.selectedRecord.referenceNo} has been approved!`);

      this.selectedRecord = null;
      this.approvalComments = '';
    }
  }

  confirmTermination() {
    if (this.selectedRecord && this.terminationReason.trim()) {
      // Update the record status
      const recordIndex = this.allData.findIndex(r => r.referenceNo === this.selectedRecord!.referenceNo);
      if (recordIndex !== -1) {
        this.allData[recordIndex].status = 'TERMINATED';
        this.applyFilters();
      }

      // Add activity to register
      const newActivity: OfficerActivity = {
        dateTime: new Date().toLocaleString(),
        action: 'TERMINATED',
        referenceNo: this.selectedRecord.referenceNo,
        amount: this.selectedRecord.amount,
        status: 'TERMINATED',
        comments: this.terminationReason
      };
      this.officerActivities.unshift(newActivity);

      console.log('Application terminated:', this.selectedRecord.referenceNo);
      console.log('Reason:', this.terminationReason);
      console.log('Amount to be refunded:', this.selectedRecord.amount);
      alert(`Application ${this.selectedRecord.referenceNo} has been terminated. Amount ₹${this.selectedRecord.amount} will be credited to distillery wallet.`);

      this.selectedRecord = null;
      this.terminationReason = '';
    }
  }

  // Hologram management methods - removed, will be added later
}
