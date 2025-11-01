import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HologramdetailsComponent } from '../HoloGram/hologramdetails/hologramdetails.component';

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

// Hologram interfaces - mirroring hologram monthly report
interface HologramUtilization {
  fromSerialNo: string;
  toSerialNo: string;
  quantity: number;
}

interface HologramWastage {
  fromSerialNo: string;
  toSerialNo: string;
  quantity: number;
}

interface HologramReportRow {
  id: string;
  month: string;
  year: string;
  hologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE';
  entryDate: string;
  openingStock: number;
  freshArrival: number;
  total: number;
  utilizations: HologramUtilization[];
  wastages: HologramWastage[];
  totalUtilized: number;
  totalWastage: number;
  closingBalance: number;
  isFixed: boolean;
  isFirstRowOfMonth: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  editedOnce?: boolean;
  submittedBy: string;
  submissionDate: string;
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
  imports: [CommonModule, FormsModule, HologramdetailsComponent],
  templateUrl: './officer-in-charge.component.html',
  styleUrl: './officer-in-charge.component.scss'
})
export class OfficerInChargeComponent implements OnInit {
  Math = Math;
  activeTab = 'applications';
  activeBrand: 'SDL' | 'JAGATJIT' = 'SDL';

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

  // Hologram data
  selectedHologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE' = 'LOCAL';
  selectedHologramMonth = 'jan';
  selectedHologramYear = '2025';
  hologramRows: HologramReportRow[] = [
    {
      id: 'HOL-001',
      month: 'jan',
      year: '2025',
      hologramType: 'LOCAL',
      entryDate: '2025-01-15',
      openingStock: 1000,
      freshArrival: 500,
      total: 1500,
      utilizations: [
        { fromSerialNo: 'L001', toSerialNo: 'L100', quantity: 100 },
        { fromSerialNo: 'L101', toSerialNo: 'L200', quantity: 100 }
      ],
      wastages: [{ fromSerialNo: 'L201', toSerialNo: 'L210', quantity: 10 }],
      totalUtilized: 200,
      totalWastage: 10,
      closingBalance: 1290,
      isFixed: false,
      isFirstRowOfMonth: true,
      status: 'PENDING',
      editedOnce: false,
      submittedBy: 'Supply Chain User',
      submissionDate: '2025-01-15'
    },
    {
      id: 'HOL-002',
      month: 'jan',
      year: '2025',
      hologramType: 'LOCAL',
      entryDate: '2025-01-16',
      openingStock: 1290,
      freshArrival: 300,
      total: 1590,
      utilizations: [{ fromSerialNo: 'L300', toSerialNo: 'L400', quantity: 150 }],
      wastages: [{ fromSerialNo: 'L401', toSerialNo: 'L405', quantity: 5 }],
      totalUtilized: 150,
      totalWastage: 5,
      closingBalance: 1435,
      isFixed: false,
      isFirstRowOfMonth: false,
      status: 'APPROVED',
      editedOnce: true,
      submittedBy: 'Supply Chain User',
      submissionDate: '2025-01-16'
    },
    {
      id: 'HOL-003',
      month: 'jan',
      year: '2025',
      hologramType: 'LOCAL',
      entryDate: '2025-01-17',
      openingStock: 1435,
      freshArrival: 250,
      total: 1685,
      utilizations: [
        { fromSerialNo: 'L500', toSerialNo: 'L600', quantity: 100 },
        { fromSerialNo: 'L601', toSerialNo: 'L650', quantity: 50 }
      ],
      wastages: [{ fromSerialNo: 'L651', toSerialNo: 'L655', quantity: 5 }],
      totalUtilized: 150,
      totalWastage: 5,
      closingBalance: 1530,
      isFixed: false,
      isFirstRowOfMonth: false,
      status: 'PENDING',
      editedOnce: false,
      submittedBy: 'Supply Chain Manager',
      submissionDate: '2025-01-17'
    },
    {
      id: 'HOL-004',
      month: 'jan',
      year: '2025',
      hologramType: 'EXPORT',
      entryDate: '2025-01-15',
      openingStock: 800,
      freshArrival: 400,
      total: 1200,
      utilizations: [{ fromSerialNo: 'E001', toSerialNo: 'E050', quantity: 50 }],
      wastages: [],
      totalUtilized: 50,
      totalWastage: 0,
      closingBalance: 1150,
      isFixed: false,
      isFirstRowOfMonth: true,
      status: 'PENDING',
      editedOnce: false,
      submittedBy: 'Supply Chain User',
      submissionDate: '2025-01-15'
    },
    {
      id: 'HOL-005',
      month: 'jan',
      year: '2025',
      hologramType: 'EXPORT',
      entryDate: '2025-01-16',
      openingStock: 1150,
      freshArrival: 200,
      total: 1350,
      utilizations: [{ fromSerialNo: 'E051', toSerialNo: 'E100', quantity: 50 }],
      wastages: [{ fromSerialNo: 'E101', toSerialNo: 'E103', quantity: 3 }],
      totalUtilized: 50,
      totalWastage: 3,
      closingBalance: 1297,
      isFixed: false,
      isFirstRowOfMonth: false,
      status: 'APPROVED',
      editedOnce: false,
      submittedBy: 'Export Manager',
      submissionDate: '2025-01-16'
    },
    {
      id: 'HOL-006',
      month: 'jan',
      year: '2025',
      hologramType: 'DEFENCE',
      entryDate: '2025-01-15',
      openingStock: 600,
      freshArrival: 200,
      total: 800,
      utilizations: [{ fromSerialNo: 'D001', toSerialNo: 'D025', quantity: 25 }],
      wastages: [{ fromSerialNo: 'D026', toSerialNo: 'D028', quantity: 3 }],
      totalUtilized: 25,
      totalWastage: 3,
      closingBalance: 772,
      isFixed: false,
      isFirstRowOfMonth: true,
      status: 'REJECTED',
      editedOnce: false,
      submittedBy: 'Supply Chain User',
      submissionDate: '2025-01-15'
    },
    {
      id: 'HOL-007',
      month: 'jan',
      year: '2025',
      hologramType: 'DEFENCE',
      entryDate: '2025-01-18',
      openingStock: 772,
      freshArrival: 100,
      total: 872,
      utilizations: [{ fromSerialNo: 'D100', toSerialNo: 'D120', quantity: 21 }],
      wastages: [{ fromSerialNo: 'D121', toSerialNo: 'D122', quantity: 2 }],
      totalUtilized: 21,
      totalWastage: 2,
      closingBalance: 849,
      isFixed: false,
      isFirstRowOfMonth: false,
      status: 'PENDING',
      editedOnce: false,
      submittedBy: 'Defence Coordinator',
      submissionDate: '2025-01-18'
    }
  ];

  filteredHologramRows: HologramReportRow[] = [];
  selectedHologramRow: HologramReportRow | null = null;

  ngOnInit() {
    this.filteredData = [...this.allData];
    this.updatePagination();
    this.applyBrandFilters();
    this.filterHologramRows();
  }

  getCurrentDateTime(): string {
    return new Date().toLocaleString();
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
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

  // Hologram management methods
  onHologramTypeChange(type: 'LOCAL' | 'EXPORT' | 'DEFENCE') {
    this.selectedHologramType = type;
    this.filterHologramRows();
  }

  onHologramMonthYearChange() {
    this.filterHologramRows();
  }

  getHologramCurrentDisplay(): string {
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const monthMap: { [key: string]: number } = {
      'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
      'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
    };
    const monthIndex = monthMap[this.selectedHologramMonth] || 1;
    return `${monthNames[monthIndex]} ${this.selectedHologramYear} - ${this.selectedHologramType}`;
  }

  getHologramPreviousMonthDisplay(): string {
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const monthMap: { [key: string]: number } = {
      'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
      'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
    };
    let monthIndex = monthMap[this.selectedHologramMonth] || 1;
    let year = parseInt(this.selectedHologramYear);

    monthIndex--;
    if (monthIndex === 0) {
      monthIndex = 12;
      year--;
    }

    return `${monthNames[monthIndex]} ${year}`;
  }

  getHologramPreviousMonthClosingBalance(): number {
    // In real app, this would fetch from database
    // For demo, return a sample value based on hologram type
    const balances = { 'LOCAL': 1000, 'EXPORT': 800, 'DEFENCE': 600 };
    return balances[this.selectedHologramType] || 0;
  }

  getHologramCount(status?: 'PENDING' | 'APPROVED' | 'REJECTED'): number {
    if (status) {
      return this.filteredHologramRows.filter(row => row.status === status).length;
    }
    return this.filteredHologramRows.length;
  }

  getHologramApprovalPercentage(): number {
    const total = this.getHologramCount();
    if (total === 0) return 0;
    const approved = this.getHologramCount('APPROVED');
    return Math.round((approved / total) * 100);
  }

  filterHologramRows() {
    this.filteredHologramRows = this.hologramRows.filter(row =>
      row.hologramType === this.selectedHologramType &&
      row.month === this.selectedHologramMonth &&
      row.year === this.selectedHologramYear
    );
  }

  getHologramStatusClass(status: 'PENDING' | 'APPROVED' | 'REJECTED'): string {
    switch (status) {
      case 'PENDING': return 'bg-warning text-dark';
      case 'APPROVED': return 'bg-success';
      case 'REJECTED': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  editHologramRow(row: HologramReportRow) {
    if (row.editedOnce) {
      alert('This row has already been edited once and cannot be edited again.');
      return;
    }
    if (row.status === 'APPROVED') {
      alert('Cannot edit an approved row.');
      return;
    }
    this.selectedHologramRow = {
      ...row,
      utilizations: row.utilizations.map(u => ({ ...u })),
      wastages: row.wastages.map(w => ({ ...w }))
    };
  }

  approveHologramRow(row: HologramReportRow) {
    if (row.status !== 'PENDING') return;
    row.status = 'APPROVED';

    // Log activity
    this.officerActivities.unshift({
      dateTime: new Date().toLocaleString(),
      action: 'APPROVED',
      referenceNo: row.id,
      amount: '0.00',
      status: 'APPROVED',
      comments: `Hologram row approved: ${row.hologramType} - ${row.entryDate}`
    });

    alert(`Hologram entry ${row.id} has been approved successfully!`);
  }

  rejectHologramRow(row: HologramReportRow) {
    if (row.status !== 'PENDING') return;
    const reason = prompt('Enter rejection reason:');
    if (reason === null || !reason.trim()) return;

    row.status = 'REJECTED';

    // Log activity
    this.officerActivities.unshift({
      dateTime: new Date().toLocaleString(),
      action: 'TERMINATED',
      referenceNo: row.id,
      amount: '0.00',
      status: 'TERMINATED',
      comments: `Hologram row rejected: ${row.hologramType} - ${row.entryDate}. Reason: ${reason}`
    });

    alert(`Hologram entry ${row.id} has been rejected.`);
  }

  saveHologramEdit() {
    if (!this.selectedHologramRow) return;

    const originalRow = this.hologramRows.find(r => r.id === this.selectedHologramRow!.id);
    if (originalRow) {
      // Update the row with edited data
      Object.assign(originalRow, {
        ...this.selectedHologramRow,
        editedOnce: true,
        utilizations: this.selectedHologramRow.utilizations.map(u => ({ ...u })),
        wastages: this.selectedHologramRow.wastages.map(w => ({ ...w }))
      });

      // Log activity
      this.officerActivities.unshift({
        dateTime: new Date().toLocaleString(),
        action: 'APPROVED',
        referenceNo: originalRow.id,
        amount: '0.00',
        status: 'APPROVED',
        comments: `Hologram row edited by officer: ${originalRow.hologramType} - ${originalRow.entryDate}`
      });

      alert(`Hologram row ${originalRow.id} has been updated successfully!`);
    }

    this.selectedHologramRow = null;
    this.filterHologramRows();
  }

  cancelHologramEdit() {
    this.selectedHologramRow = null;
  }

  onHologramFieldChange(field: keyof HologramReportRow, value: any) {
    if (!this.selectedHologramRow) return;

    (this.selectedHologramRow as any)[field] = value;

    // Recalculate totals when relevant fields change
    if (field === 'openingStock' || field === 'freshArrival') {
      this.selectedHologramRow.total =
        (this.selectedHologramRow.openingStock || 0) +
        (this.selectedHologramRow.freshArrival || 0);
    }

    // Recalculate closing balance
    this.selectedHologramRow.closingBalance =
      this.selectedHologramRow.total -
      this.selectedHologramRow.totalUtilized -
      this.selectedHologramRow.totalWastage;
  }

  addUtilizationToHologramRow(row: HologramReportRow) {
    row.utilizations.push({
      fromSerialNo: '',
      toSerialNo: '',
      quantity: 0
    });
  }

  removeUtilizationFromHologramRow(row: HologramReportRow, index: number) {
    row.utilizations.splice(index, 1);
    this.recalculateHologramTotals(row);
  }

  addWastageToHologramRow(row: HologramReportRow) {
    row.wastages.push({
      fromSerialNo: '',
      toSerialNo: '',
      quantity: 0
    });
  }

  removeWastageFromHologramRow(row: HologramReportRow, index: number) {
    row.wastages.splice(index, 1);
    this.recalculateHologramTotals(row);
  }

  recalculateHologramTotals(row: HologramReportRow) {
    row.totalUtilized = row.utilizations.reduce((sum, util) => sum + (util.quantity || 0), 0);
    row.totalWastage = row.wastages.reduce((sum, waste) => sum + (waste.quantity || 0), 0);
    row.closingBalance = row.total - row.totalUtilized - row.totalWastage;
  }

  onHologramSerialChange(row: HologramReportRow, type: 'utilization' | 'wastage', index: number) {
    if (type === 'utilization') {
      const util = row.utilizations[index];
      if (util.fromSerialNo && util.toSerialNo) {
        // Calculate quantity based on serial numbers (simplified logic)
        const fromNum = parseInt(util.fromSerialNo.replace(/\D/g, '')) || 0;
        const toNum = parseInt(util.toSerialNo.replace(/\D/g, '')) || 0;
        util.quantity = Math.max(0, toNum - fromNum + 1);
      }
    } else {
      const waste = row.wastages[index];
      if (waste.fromSerialNo && waste.toSerialNo) {
        // Calculate quantity based on serial numbers (simplified logic)
        const fromNum = parseInt(waste.fromSerialNo.replace(/\D/g, '')) || 0;
        const toNum = parseInt(waste.toSerialNo.replace(/\D/g, '')) || 0;
        waste.quantity = Math.max(0, toNum - fromNum + 1);
      }
    }
    this.recalculateHologramTotals(row);
  }

  calculateHologramGrandTotals() {
    const totals = {
      totalOpening: 0,
      totalFreshArrival: 0,
      totalTotal: 0,
      totalUtilized: 0,
      totalWastage: 0,
      totalClosing: 0
    };

    this.filteredHologramRows.forEach(row => {
      totals.totalOpening += row.openingStock || 0;
      totals.totalFreshArrival += row.freshArrival || 0;
      totals.totalTotal += row.total || 0;
      totals.totalUtilized += row.totalUtilized || 0;
      totals.totalWastage += row.totalWastage || 0;
      totals.totalClosing += row.closingBalance || 0;
    });

    return totals;
  }
}
