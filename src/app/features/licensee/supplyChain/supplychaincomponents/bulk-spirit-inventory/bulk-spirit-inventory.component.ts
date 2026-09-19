import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EnaRequisitionService } from '../../../../../core/services/ena-requisition.service';
import { BulkSpiritUsageService, BulkSpiritUsageRecord } from '../../../../../core/services/bulk-spirit-usage.service';

export interface TankerArrivalDetailItem {
  permit_no?: string;
  tanker_no?: string;
  bulk_liter?: number;
}

export interface ArrivalDetailsRow {
  id: number;
  requisitionId: number;
  referenceNo: string;
  distilleryName: string;
  arrivalDate: string;
  bulkSpiritType: string;
  tankerCount: number;
  requestedTotalQuantity: number;
  totalBulkLiter: number;
  editedByOic: boolean;
  approvalStatus: string;
  tankerDetails: TankerArrivalDetailItem[];
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewRemarks?: string;
}

export interface BLHistoryItem {
  id: string;
  entryType: 'ARRIVAL' | 'USAGE';
  entryTypeLabel: string;
  direction: 'IN' | 'OUT';
  date: string;
  dateTokens: { ymd: string; ym: string };
  referenceNo: string;
  bulkSpiritType: string;
  distilleryOrFactory: string;
  quantity: number;
  status: string;
  statusBadgeClass: string;
  purposeOrDetails: string;
  tankerCount?: number;
  tankerDetails?: TankerArrivalDetailItem[];
  submittedBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  remarks?: string;
  rawRecord?: any;
}

export interface MonthlySummaryRow {
  monthKey: string;
  monthLabel: string;
  entries: number;
  totalTankers: number;
  totalBulkLiter: number;
}

export interface LiveSpiritTypeStockItem {
  bulkSpiritType: string;
  totalArrivedBl: number;
  totalApprovedUsageBl: number;
  totalPendingUsageBl: number;
  availableBl: number;
  status: string;
}

export interface LiveInventorySummary {
  items: LiveSpiritTypeStockItem[];
  totalArrivedBl: number;
  totalUsedBl: number;
  totalPendingBl: number;
  totalAvailableBl: number;
}

@Component({
  selector: 'app-bulk-spirit-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './bulk-spirit-inventory.component.html',
  styleUrls: ['./bulk-spirit-inventory.component.scss']
})
export class BulkSpiritInventoryComponent implements OnInit {
  private router = inject(Router);
  private enaRequisitionService = inject(EnaRequisitionService);
  private bulkSpiritUsageService = inject(BulkSpiritUsageService);

  loading = false;
  errorMessage = '';

  // Active View Tab: 'live-inventory' | 'arrival-entries' | 'bl-history'
  activeView: 'live-inventory' | 'arrival-entries' | 'bl-history' = 'live-inventory';

  // 1. Live Inventory by Spirit Type
  liveInventory: LiveInventorySummary = {
    items: [],
    totalArrivedBl: 0,
    totalUsedBl: 0,
    totalPendingBl: 0,
    totalAvailableBl: 0
  };
  spiritSearchTerm = '';
  filteredSpiritItems: LiveSpiritTypeStockItem[] = [];

  // 2. Arrival Entries
  dateFilter = '';
  monthFilter = '';
  arrivalSearchTerm = '';
  allArrivalRows: ArrivalDetailsRow[] = [];
  filteredArrivalRows: ArrivalDetailsRow[] = [];
  pageSizeOptions = [5, 10, 25, 50];
  pageSize = 10;
  pageIndex = 0;

  // 3. Unified BL History (Ledger of all Inflow and Outflow)
  allHistoryRows: BLHistoryItem[] = [];
  filteredHistoryRows: BLHistoryItem[] = [];
  historySearchTerm = '';
  historyTypeFilter: 'ALL' | 'ARRIVAL' | 'USAGE' = 'ALL';
  historySpiritFilter = 'ALL';
  historyStatusFilter = 'ALL';
  historyDateFilter = '';
  historyMonthFilter = '';
  historyPageSize = 10;
  historyPageIndex = 0;
  historyPageSizeOptions = [5, 10, 25, 50, 100];

  // Distinct Spirit Types for dropdown filter
  distinctSpiritTypes: string[] = [];

  // Modal / Detail Inspection
  selectedHistoryItem: BLHistoryItem | null = null;
  selectedArrivalItem: ArrivalDetailsRow | null = null;

  ngOnInit(): void {
    // Keep date/month filters unconstrained by default so all records are visible immediately
    this.dateFilter = '';
    this.monthFilter = '';
    this.historyDateFilter = '';
    this.historyMonthFilter = '';
    this.loadData();
  }

  goBackToRequisition(): void {
    this.router.navigate(['/dashboard'], { queryParams: { section: 'requisition' } });
  }

  goToUsage(spiritType?: string): void {
    this.router.navigate(['/dashboard'], {
      queryParams: {
        section: 'bulk-spirit-usage',
        ...(spiritType ? { spiritType } : {})
      }
    });
  }

  setActiveView(view: 'live-inventory' | 'arrival-entries' | 'bl-history'): void {
    this.activeView = view;
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      summary: this.bulkSpiritUsageService.getInventorySummary().pipe(catchError(() => of(null))),
      arrivals: this.enaRequisitionService.getAllRequisitionArrivalDetails('ALL').pipe(catchError(() => of([]))),
      usages: this.bulkSpiritUsageService.getUsageRequests().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ summary, arrivals, usages }: any) => {
        // 1. Live Inventory by Type
        this.liveInventory = this.normalizeLiveInventory(summary);
        this.applySpiritFilter();

        // 2. Arrival Rows
        let rawArrivalsList: any[] = [];
        if (Array.isArray(arrivals)) {
          rawArrivalsList = arrivals;
        } else if (Array.isArray(arrivals?.data)) {
          rawArrivalsList = arrivals.data;
        } else if (Array.isArray(arrivals?.results)) {
          rawArrivalsList = arrivals.results;
        }
        this.allArrivalRows = rawArrivalsList.map((r: any) => this.mapArrivalRow(r));
        this.applyArrivalFilters();

        // 3. Usages List
        let rawUsagesList: any[] = [];
        if (Array.isArray(usages)) {
          rawUsagesList = usages;
        } else if (Array.isArray(usages?.data)) {
          rawUsagesList = usages.data;
        } else if (Array.isArray(usages?.results)) {
          rawUsagesList = usages.results;
        }
        const parsedUsages: BulkSpiritUsageRecord[] = rawUsagesList.map((u: any) => this.mapUsageRecord(u));

        // 4. Build Unified BL History Ledger
        this.buildHistoryLedger(this.allArrivalRows, parsedUsages);

        // 5. Populate distinct spirit types
        const typesSet = new Set<string>();
        this.liveInventory.items.forEach(i => { if (i.bulkSpiritType) typesSet.add(i.bulkSpiritType); });
        this.allArrivalRows.forEach(a => { if (a.bulkSpiritType) typesSet.add(a.bulkSpiritType); });
        parsedUsages.forEach(u => { if (u.bulk_spirit_type) typesSet.add(u.bulk_spirit_type); });
        this.distinctSpiritTypes = Array.from(typesSet).sort();

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to load Bulk Spirit inventory, arrival, and usage history.';
      }
    });
  }

  // Robust date token extractor that parses DD-MM-YYYY, YYYY-MM-DD, ISO timestamps, and date strings
  extractDateTokens(dateStr: string): { ymd: string; ym: string } {
    if (!dateStr) return { ymd: '', ym: '' };
    const raw = String(dateStr).trim();
    if (!raw) return { ymd: '', ym: '' };

    // 1. Match DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
    const dmyMatch = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return {
        ymd: `${year}-${month}-${day}`,
        ym: `${year}-${month}`
      };
    }

    // 2. Match YYYY-MM-DD or YYYY/MM/DD
    const ymdMatch = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, '0');
      const day = ymdMatch[3].padStart(2, '0');
      return {
        ymd: `${year}-${month}-${day}`,
        ym: `${year}-${month}`
      };
    }

    // 3. Fallback to JS Date parser
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return {
        ymd: `${year}-${month}-${day}`,
        ym: `${year}-${month}`
      };
    }

    return { ymd: '', ym: '' };
  }

  private normalizeLiveInventory(res: any): LiveInventorySummary {
    const rawList = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    const items: LiveSpiritTypeStockItem[] = rawList.map((item: any) => {
      const arrived = Number((item?.totalArrivedBl ?? item?.total_arrived_bl) || 0);
      const used = Number((item?.totalApprovedUsageBl ?? item?.total_approved_usage_bl) || 0);
      const pending = Number((item?.totalPendingUsageBl ?? item?.total_pending_usage_bl) || 0);
      const available = Number((item?.availableBl ?? item?.available_bl) || 0);

      let status = 'No Stock';
      if (available > 0) {
        status = 'In Stock';
      } else if (pending > 0) {
        status = 'Pending Approval';
      }

      return {
        bulkSpiritType: String(
          item?.bulkSpiritType ??
          item?.bulk_spirit_type ??
          item?.bulk_spirit_kind_type ??
          item?.bulkSpiritKindType ??
          item?.spirit_type ??
          item?.spiritType ??
          ''
        ).trim(),
        totalArrivedBl: arrived,
        totalApprovedUsageBl: used,
        totalPendingUsageBl: pending,
        availableBl: available,
        status
      };
    }).filter((i: LiveSpiritTypeStockItem) => Boolean(i.bulkSpiritType));

    items.sort((a, b) => {
      if (b.availableBl !== a.availableBl) {
        return b.availableBl - a.availableBl;
      }
      return a.bulkSpiritType.localeCompare(b.bulkSpiritType);
    });

    return {
      items,
      totalArrivedBl: Number((res?.totalArrivedBl ?? res?.total_arrived_bl) || 0),
      totalUsedBl: Number((res?.totalUsedBl ?? res?.total_used_bl) || 0),
      totalPendingBl: Number((res?.totalPendingBl ?? res?.total_pending_bl) || 0),
      totalAvailableBl: Number((res?.totalAvailableBl ?? res?.total_available_bl) || 0)
    };
  }

  applySpiritFilter(): void {
    const q = (this.spiritSearchTerm || '').trim().toLowerCase();
    if (!q) {
      this.filteredSpiritItems = [...this.liveInventory.items];
      return;
    }
    this.filteredSpiritItems = this.liveInventory.items.filter(item =>
      item.bulkSpiritType.toLowerCase().includes(q)
    );
  }

  private mapArrivalRow(r: any): ArrivalDetailsRow {
    const rawDetails = r?.tanker_details ?? r?.tankerDetails ?? r?.details ?? [];
    let tankerDetails: TankerArrivalDetailItem[] = [];
    if (Array.isArray(rawDetails)) {
      tankerDetails = rawDetails.map((item: any) => ({
        permit_no: String(item?.permit_no ?? item?.permitNo ?? '').trim() || undefined,
        tanker_no: String(item?.tanker_no ?? item?.tankerNo ?? '').trim(),
        bulk_liter: Number(item?.bulk_liter ?? item?.bulkLiter ?? 0) || 0
      }));
    } else if (typeof rawDetails === 'string') {
      try {
        const parsed = JSON.parse(rawDetails);
        if (Array.isArray(parsed)) {
          tankerDetails = parsed.map((item: any) => ({
            permit_no: String(item?.permit_no ?? item?.permitNo ?? '').trim() || undefined,
            tanker_no: String(item?.tanker_no ?? item?.tankerNo ?? '').trim(),
            bulk_liter: Number(item?.bulk_liter ?? item?.bulkLiter ?? 0) || 0
          }));
        }
      } catch {
        tankerDetails = [];
      }
    }

    const arrivalDate = String(
      r?.arrival_date ??
      r?.arrivalDate ??
      r?.submitted_at ??
      r?.submittedAt ??
      r?.updated_at ??
      r?.updatedAt ??
      r?.created_at ??
      r?.createdAt ??
      ''
    ).trim();

    const reqTotal = Number(
      r?.requisition_total_quantity ??
      r?.requisitionTotalQuantity ??
      r?.requested_total_quantity ??
      r?.requestedTotalQuantity ??
      r?.totalbl ??
      r?.total_bl ??
      r?.requisition?.totalbl ??
      0
    ) || 0;

    const totalBL = Number(
      r?.total_bulk_liter ??
      r?.totalBulkLiter ??
      r?.total_bl ??
      r?.totalbl ??
      0
    ) || 0;

    const tankerCount = Number(r?.tanker_count ?? r?.tankerCount ?? tankerDetails.length ?? 0) || 0;

    const refNo = String(
      r?.reference_no ??
      r?.referenceNo ??
      r?.our_ref_no ??
      r?.ourRefNo ??
      r?.ref_no ??
      '-'
    ).trim();

    const distillery = String(
      r?.distillery_name ??
      r?.distilleryName ??
      r?.distillery ??
      r?.lifted_from_distillery_name ??
      r?.requisition?.lifted_from_distillery_name ??
      '-'
    ).trim();

    const bulkSpiritType = String(
      r?.bulk_spirit_type ??
      r?.bulkSpiritType ??
      r?.bulk_spirit_kind_type ??
      r?.bulkSpiritKindType ??
      r?.requisition?.bulk_spirit_type ??
      'Extra Neutral Alcohol (ENA)'
    ).trim();

    return {
      id: Number(r?.id || 0),
      requisitionId: Number(r?.requisition_id ?? r?.requisitionId ?? r?.requisition ?? 0) || 0,
      referenceNo: refNo || '-',
      distilleryName: distillery || '-',
      arrivalDate: arrivalDate,
      bulkSpiritType: bulkSpiritType || 'Extra Neutral Alcohol (ENA)',
      tankerCount: tankerCount,
      requestedTotalQuantity: reqTotal > 0 ? reqTotal : totalBL,
      totalBulkLiter: totalBL,
      editedByOic: Boolean(r?.edited_by_oic ?? r?.editedByOic ?? false),
      approvalStatus: String(r?.approval_status ?? r?.approvalStatus ?? 'APPROVED').toUpperCase(),
      tankerDetails: tankerDetails,
      submittedAt: String(r?.submitted_at ?? r?.submittedAt ?? ''),
      reviewedAt: String(r?.reviewed_at ?? r?.reviewedAt ?? ''),
      reviewedBy: String(r?.reviewed_by ?? r?.reviewedBy ?? ''),
      reviewRemarks: String(r?.review_remarks ?? r?.reviewRemarks ?? '')
    };
  }

  private mapUsageRecord(r: any): BulkSpiritUsageRecord {
    return {
      id: Number(r?.id || 0),
      reference_no: String(r?.reference_no ?? r?.referenceNo ?? r?.ref_no ?? ''),
      licensee_id: String(r?.licensee_id ?? r?.licenseeId ?? ''),
      distillery_name: String(r?.distillery_name ?? r?.distilleryName ?? ''),
      applicant: Number(r?.applicant || 0),
      applicant_name: String(r?.applicant_name ?? r?.applicantName ?? ''),
      bulk_spirit_type: String(r?.bulk_spirit_type ?? r?.bulkSpiritType ?? ''),
      quantity: Number(r?.quantity || 0),
      purpose: String(r?.purpose || ''),
      remarks: String(r?.remarks || ''),
      status: String(r?.status || 'Pending'),
      status_code: String(r?.status_code ?? r?.statusCode ?? ''),
      rejection_reason: String(r?.rejection_reason ?? r?.rejectionReason ?? ''),
      workflow: Number(r?.workflow || 0),
      current_stage: Number((r?.current_stage ?? r?.currentStage) || 0),
      current_stage_name: String((r?.current_stage_name ?? r?.currentStageName) || ''),
      reviewed_by: String((r?.reviewed_by ?? r?.reviewedBy) || ''),
      reviewed_at: String((r?.reviewed_at ?? r?.reviewedAt) || ''),
      created_at: String((r?.created_at ?? r?.createdAt) || ''),
      updated_at: String((r?.updated_at ?? r?.updatedAt) || '')
    };
  }

  private buildHistoryLedger(arrivals: ArrivalDetailsRow[], usages: BulkSpiritUsageRecord[]): void {
    const historyList: BLHistoryItem[] = [];

    // 1. Add all Tanker Arrival records (Stock In / Credit)
    for (const arr of arrivals) {
      const tokens = this.extractDateTokens(arr.arrivalDate || arr.submittedAt || '');
      const rawDateStr = arr.arrivalDate || arr.submittedAt || '';
      const tankersStr = arr.tankerDetails && arr.tankerDetails.length > 0
        ? arr.tankerDetails.map(t => t.tanker_no).filter(Boolean).join(', ')
        : `${arr.tankerCount} Tanker(s)`;

      const isApproved = arr.approvalStatus === 'APPROVED';
      const isPending = arr.approvalStatus === 'PENDING';
      const isRejected = arr.approvalStatus === 'REJECTED';

      let statusBadgeClass = 'bg-secondary-subtle text-secondary border border-secondary-subtle';
      if (isApproved) {
        statusBadgeClass = 'bg-success-subtle text-success border border-success-subtle';
      } else if (isPending) {
        statusBadgeClass = 'bg-warning-subtle text-dark border border-warning-subtle';
      } else if (isRejected) {
        statusBadgeClass = 'bg-danger-subtle text-danger border border-danger-subtle';
      }

      historyList.push({
        id: `ARR-${arr.id}-${arr.referenceNo}`,
        entryType: 'ARRIVAL',
        entryTypeLabel: 'Tanker Arrival (Stock In)',
        direction: 'IN',
        date: rawDateStr,
        dateTokens: tokens,
        referenceNo: arr.referenceNo,
        bulkSpiritType: arr.bulkSpiritType || 'Extra Neutral Alcohol (ENA)',
        distilleryOrFactory: arr.distilleryName || 'Supplier Distillery',
        quantity: arr.totalBulkLiter,
        status: arr.approvalStatus,
        statusBadgeClass: statusBadgeClass,
        purposeOrDetails: `Tanker Receipt: ${tankersStr}`,
        tankerCount: arr.tankerCount,
        tankerDetails: arr.tankerDetails,
        submittedBy: 'Licensee Factory Gate',
        reviewedBy: arr.reviewedBy || (arr.editedByOic ? 'Officer in Charge (OIC)' : ''),
        reviewedAt: arr.reviewedAt,
        remarks: arr.reviewRemarks,
        rawRecord: arr
      });
    }

    // 2. Add all Bulk Spirit Usage records (Stock Out / Debit / In-flight)
    for (const use of usages) {
      const rawDateStr = use.created_at || use.updated_at || '';
      const tokens = this.extractDateTokens(rawDateStr);
      const st = (use.status || 'Pending').toLowerCase();

      const isApproved = st.includes('approv');
      const isPending = st.includes('pend');
      const isRejected = st.includes('reject');

      let statusBadgeClass = 'bg-secondary-subtle text-secondary border border-secondary-subtle';
      if (isApproved) {
        statusBadgeClass = 'bg-success-subtle text-success border border-success-subtle';
      } else if (isPending) {
        statusBadgeClass = 'bg-warning-subtle text-dark border border-warning-subtle';
      } else if (isRejected) {
        statusBadgeClass = 'bg-danger-subtle text-danger border border-danger-subtle';
      }

      const purposeStr = [use.purpose, use.remarks].filter(Boolean).join(' - ') || 'Factory Production Usage';

      historyList.push({
        id: `USE-${use.id}-${use.reference_no}`,
        entryType: 'USAGE',
        entryTypeLabel: 'Spirit Usage (Stock Out)',
        direction: 'OUT',
        date: rawDateStr,
        dateTokens: tokens,
        referenceNo: use.reference_no || `BSU-${use.id}`,
        bulkSpiritType: use.bulk_spirit_type || 'Extra Neutral Alcohol (ENA)',
        distilleryOrFactory: use.distillery_name || use.applicant_name || 'Licensee Unit',
        quantity: use.quantity,
        status: use.status,
        statusBadgeClass: statusBadgeClass,
        purposeOrDetails: purposeStr,
        submittedBy: use.applicant_name || 'Licensee Operator',
        reviewedBy: use.reviewed_by || '',
        reviewedAt: use.reviewed_at || '',
        remarks: use.rejection_reason || use.remarks,
        rawRecord: use
      });
    }

    // Sort chronologically descending (newest first)
    historyList.sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
        return timeB - timeA;
      }
      return b.id.localeCompare(a.id);
    });

    this.allHistoryRows = historyList;
    this.applyHistoryFilters();
  }

  applyArrivalFilters(): void {
    const term = (this.arrivalSearchTerm || '').trim().toLowerCase();

    this.filteredArrivalRows = this.allArrivalRows.filter(row => {
      if (term) {
        const matchesRef = (row.referenceNo || '').toLowerCase().includes(term);
        const matchesDist = (row.distilleryName || '').toLowerCase().includes(term);
        const matchesSpirit = (row.bulkSpiritType || '').toLowerCase().includes(term);
        const matchesTankers = (row.tankerDetails || []).some(t =>
          (t.tanker_no || '').toLowerCase().includes(term) ||
          (t.permit_no || '').toLowerCase().includes(term)
        );
        if (!matchesRef && !matchesDist && !matchesSpirit && !matchesTankers) return false;
      }

      const tokens = this.extractDateTokens(row.arrivalDate);

      if (this.dateFilter) {
        if (!tokens.ymd || tokens.ymd !== this.dateFilter) {
          return false;
        }
      }

      if (this.monthFilter) {
        if (!tokens.ym || tokens.ym !== this.monthFilter) {
          return false;
        }
      }

      return true;
    });
    this.pageIndex = 0;
  }

  clearArrivalFilters(): void {
    this.dateFilter = '';
    this.monthFilter = '';
    this.arrivalSearchTerm = '';
    this.applyArrivalFilters();
  }

  applyHistoryFilters(): void {
    const term = (this.historySearchTerm || '').trim().toLowerCase();

    this.filteredHistoryRows = this.allHistoryRows.filter(row => {
      // 1. Text Search
      if (term) {
        const matchesRef = (row.referenceNo || '').toLowerCase().includes(term);
        const matchesFactory = (row.distilleryOrFactory || '').toLowerCase().includes(term);
        const matchesSpirit = (row.bulkSpiritType || '').toLowerCase().includes(term);
        const matchesPurpose = (row.purposeOrDetails || '').toLowerCase().includes(term);
        const matchesStatus = (row.status || '').toLowerCase().includes(term);
        const matchesReviewer = (row.reviewedBy || '').toLowerCase().includes(term);
        const matchesSubmitter = (row.submittedBy || '').toLowerCase().includes(term);
        const matchesTankers = (row.tankerDetails || []).some(t =>
          (t.tanker_no || '').toLowerCase().includes(term) ||
          (t.permit_no || '').toLowerCase().includes(term)
        );
        if (!matchesRef && !matchesFactory && !matchesSpirit && !matchesPurpose && !matchesStatus && !matchesReviewer && !matchesSubmitter && !matchesTankers) {
          return false;
        }
      }

      // 2. Type Filter (ARRIVAL | USAGE)
      if (this.historyTypeFilter !== 'ALL' && row.entryType !== this.historyTypeFilter) {
        return false;
      }

      // 3. Spirit Filter
      if (this.historySpiritFilter !== 'ALL' && row.bulkSpiritType.toLowerCase() !== this.historySpiritFilter.toLowerCase()) {
        return false;
      }

      // 4. Status Filter
      if (this.historyStatusFilter !== 'ALL') {
        const st = (row.status || '').toLowerCase();
        if (this.historyStatusFilter === 'APPROVED' && !st.includes('approv')) return false;
        if (this.historyStatusFilter === 'PENDING' && !st.includes('pend')) return false;
        if (this.historyStatusFilter === 'REJECTED' && !st.includes('reject')) return false;
      }

      // 5. Date Filter
      if (this.historyDateFilter) {
        if (!row.dateTokens.ymd || row.dateTokens.ymd !== this.historyDateFilter) {
          return false;
        }
      }

      // 6. Month Filter
      if (this.historyMonthFilter) {
        if (!row.dateTokens.ym || row.dateTokens.ym !== this.historyMonthFilter) {
          return false;
        }
      }

      return true;
    });

    this.historyPageIndex = 0;
  }

  clearHistoryFilters(): void {
    this.historySearchTerm = '';
    this.historyTypeFilter = 'ALL';
    this.historySpiritFilter = 'ALL';
    this.historyStatusFilter = 'ALL';
    this.historyDateFilter = '';
    this.historyMonthFilter = '';
    this.applyHistoryFilters();
  }

  // History Aggregations
  getHistoryTotalInflow(): number {
    return this.filteredHistoryRows
      .filter(r => r.entryType === 'ARRIVAL' && (r.status || '').toUpperCase() === 'APPROVED')
      .reduce((acc, r) => acc + (r.quantity || 0), 0);
  }

  getHistoryTotalOutflow(): number {
    return this.filteredHistoryRows
      .filter(r => r.entryType === 'USAGE' && (r.status || '').toLowerCase().includes('approv'))
      .reduce((acc, r) => acc + (r.quantity || 0), 0);
  }

  getHistoryTotalPendingOutflow(): number {
    return this.filteredHistoryRows
      .filter(r => r.entryType === 'USAGE' && (r.status || '').toLowerCase().includes('pend'))
      .reduce((acc, r) => acc + (r.quantity || 0), 0);
  }

  // Arrival Aggregations
  getFilteredTotalBL(): number {
    return this.filteredArrivalRows.reduce((acc, r) => acc + (r.totalBulkLiter || 0), 0);
  }

  getFilteredTotalTankers(): number {
    return this.filteredArrivalRows.reduce((acc, r) => acc + (r.tankerCount || 0), 0);
  }

  getMonthlyRows(): MonthlySummaryRow[] {
    const map = new Map<string, { entries: number; tankers: number; totalBL: number }>();

    for (const row of this.filteredArrivalRows) {
      let monthKey = 'Unknown';
      const tokens = this.extractDateTokens(row.arrivalDate);
      if (tokens.ym) {
        monthKey = tokens.ym;
      }

      const cur = map.get(monthKey) || { entries: 0, tankers: 0, totalBL: 0 };
      cur.entries += 1;
      cur.tankers += row.tankerCount;
      cur.totalBL += row.totalBulkLiter;
      map.set(monthKey, cur);
    }

    const res: MonthlySummaryRow[] = [];
    map.forEach((val, key) => {
      let label = key;
      if (key !== 'Unknown') {
        const parts = key.split('-');
        if (parts.length === 2) {
          const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
          label = dateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        }
      }
      res.push({
        monthKey: key,
        monthLabel: label,
        entries: val.entries,
        totalTankers: val.tankers,
        totalBulkLiter: val.totalBL
      });
    });

    return res.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }

  // Arrival Pagination
  get pagedArrivalRows(): ArrivalDetailsRow[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredArrivalRows.slice(start, start + this.pageSize);
  }

  get totalArrivalPages(): number {
    return Math.max(1, Math.ceil(this.filteredArrivalRows.length / this.pageSize));
  }

  get pageStart(): number {
    return this.filteredArrivalRows.length === 0 ? 0 : this.pageIndex * this.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min((this.pageIndex + 1) * this.pageSize, this.filteredArrivalRows.length);
  }

  prevPage(): void {
    if (this.pageIndex > 0) this.pageIndex--;
  }

  nextPage(): void {
    if (this.pageIndex < this.totalArrivalPages - 1) this.pageIndex++;
  }

  // History Pagination
  get pagedHistoryRows(): BLHistoryItem[] {
    const start = this.historyPageIndex * this.historyPageSize;
    return this.filteredHistoryRows.slice(start, start + this.historyPageSize);
  }

  get totalHistoryPages(): number {
    return Math.max(1, Math.ceil(this.filteredHistoryRows.length / this.historyPageSize));
  }

  get historyPageStart(): number {
    return this.filteredHistoryRows.length === 0 ? 0 : this.historyPageIndex * this.historyPageSize + 1;
  }

  get historyPageEnd(): number {
    return Math.min((this.historyPageIndex + 1) * this.historyPageSize, this.filteredHistoryRows.length);
  }

  prevHistoryPage(): void {
    if (this.historyPageIndex > 0) this.historyPageIndex--;
  }

  nextHistoryPage(): void {
    if (this.historyPageIndex < this.totalHistoryPages - 1) this.historyPageIndex++;
  }

  // Modals & Details
  openHistoryDetailModal(item: BLHistoryItem): void {
    this.selectedHistoryItem = item;
  }

  closeHistoryDetailModal(): void {
    this.selectedHistoryItem = null;
  }

  openArrivalDetailModal(row: ArrivalDetailsRow): void {
    this.selectedArrivalItem = row;
  }

  closeArrivalDetailModal(): void {
    this.selectedArrivalItem = null;
  }

  getTankerDetailsLines(details?: TankerArrivalDetailItem[]): string[] {
    if (!Array.isArray(details) || details.length === 0) return ['No details recorded'];
    return details.map(d => {
      const p = d.permit_no ? `Permit #${d.permit_no}: ` : '';
      const t = d.tanker_no || '-';
      const bl = Number(d.bulk_liter || 0).toFixed(2);
      return `${p}${t} (${bl} BL)`;
    });
  }

  getAvailablePercentage(item: LiveSpiritTypeStockItem): number {
    if (!item.totalArrivedBl || item.totalArrivedBl <= 0) return 0;
    return Math.min(100, Math.round((item.availableBl / item.totalArrivedBl) * 100));
  }
}

