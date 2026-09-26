import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { RoleService } from '../../../../../core/services/role.service';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { SidebarPendingBadgeService } from '../../../../../shared/services/sidebar-pending-badge.service';

interface RenewalCounts {
  applied: number;
  pending: number;
  objection: number;
  approved: number;
  rejected: number;
  awaitingPayment?: number;
}

interface RenewalItem {
  id: string;
  applicationId: string;
  applicantName: string;
  oldLicenseId: string;
  licenseCategoryName: string;
  licenseSubCategoryName: string;
  submittedOn: string;
  currentStage: string;
  currentStageRaw: string;
  statusGroup: 'applied' | 'pending' | 'objection' | 'approved' | 'rejected' | 'awaiting-payment';
  canView: boolean;
  canPayLicenseFee?: boolean;
  rawRow?: any;
}

interface GroupedRenewalResponse {
  applied: any[];
  pending: any[];
  objection: any[];
  approved: any[];
  rejected: any[];
}

@Component({
  selector: 'app-license-renewal-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './license-renewal-dashboard.component.html',
  styleUrls: ['./license-renewal-dashboard.component.scss']
})
export class LicenseRenewalDashboardComponent implements OnInit {
  private router = inject(Router);
  private roleService = inject(RoleService);
  private licenseApplicationService = inject(LicenseApplicationService);
  private sidebarPendingBadgeService = inject(SidebarPendingBadgeService);

  isLoading = false;
  error: string | null = null;

  counts: RenewalCounts = { applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0, awaitingPayment: 0 };
  allRows: RenewalItem[] = [];
  filteredRows: RenewalItem[] = [];

  pageSizeOptions: number[] = [5, 10, 15];
  pageSize = 5;
  pageIndex = 0;
  searchFilter = '';
  activeSummaryFilter: RenewalItem['statusGroup'] | '' = '';

  ngOnInit(): void {
    this.loadData();
    this.sidebarPendingBadgeService.refreshNeeded$.subscribe(() => {
      this.loadData();
    });
  }

  isLicenseeUser(): boolean {
    return this.roleService.isLicenseeRole();
  }

  loadData(): void {
    this.isLoading = true;
    this.error = null;
    this.activeSummaryFilter = '';
    this.searchFilter = '';

    forkJoin({
      counts: this.licenseApplicationService.getLicenseRenewalDashboardCounts().pipe(
        catchError(() => of({ applied: 0, pending: 0, objection: 0, approved: 0, rejected: 0 }))
      ),
      grouped: this.licenseApplicationService.getLicenseRenewalApplicationsByStatus().pipe(
        catchError(() => of({ applied: [], pending: [], objection: [], approved: [], rejected: [] }))
      )
    }).subscribe({
      next: ({ counts, grouped }) => {
        this.allRows = this.flattenGroupedData(grouped);
        
        const approvedCount = this.allRows.filter(r => r.statusGroup === 'approved').length;
        const pendingCount = this.allRows.filter(r => r.statusGroup === 'pending').length;
        const objectionCount = this.allRows.filter(r => r.statusGroup === 'objection').length;
        const rejectedCount = this.allRows.filter(r => r.statusGroup === 'rejected').length;
        const awaitingPaymentCount = this.allRows.filter(r => r.statusGroup === 'awaiting-payment').length;

        this.counts = {
          applied: this.allRows.filter(r => r.statusGroup === 'applied').length,
          pending: pendingCount + awaitingPaymentCount,
          objection: objectionCount,
          approved: approvedCount,
          rejected: rejectedCount,
          awaitingPayment: awaitingPaymentCount
        };

        if (this.activeSummaryFilter === '') {
          if (pendingCount + awaitingPaymentCount > 0) this.activeSummaryFilter = 'pending';
          else if (objectionCount > 0) this.activeSummaryFilter = 'objection';
        }
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load license renewal applications.';
        this.isLoading = false;
      }
    });
  }

  onSummaryCardClick(group: RenewalItem['statusGroup'] | 'all'): void {
    this.activeSummaryFilter = group === 'all' ? '' : group;
    this.pageIndex = 0;
    this.applyFilters();
  }

  viewApplication(row: RenewalItem): void {
    const id = row.id || row.applicationId;
    this.router.navigate(['/supply-chain-view'], {
      queryParams: {
        id,
        ref: row.applicationId,
        type: 'license-renewal',
        source: this.getDetailViewSource()
      }
    });
  }

  applyFilters(): void {
    if (this.activeSummaryFilter) {
      const activeCount = this.counts[this.activeSummaryFilter as keyof RenewalCounts] ?? 0;
      if (activeCount === 0) {
        this.activeSummaryFilter = '';
      }
    }
    const q = this.searchFilter.trim().toLowerCase();
    const rows = this.allRows.filter((row) => {
      const matchesSearch =
        !q ||
        row.applicationId.toLowerCase().includes(q) ||
        row.applicantName.toLowerCase().includes(q) ||
        row.oldLicenseId.toLowerCase().includes(q) ||
        row.currentStage.toLowerCase().includes(q);
      const matchesGroup = !this.activeSummaryFilter ||
        (this.activeSummaryFilter === 'pending'
          ? (row.statusGroup === 'pending' || row.statusGroup === 'awaiting-payment')
          : row.statusGroup === this.activeSummaryFilter);
      return matchesSearch && matchesGroup;
    });
    this.filteredRows = rows;
  }

  get pagedRows(): RenewalItem[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredRows.slice(start, start + this.pageSize);
  }

  get pageStart(): number {
    return this.filteredRows.length ? this.pageIndex * this.pageSize + 1 : 0;
  }

  get pageEnd(): number {
    return Math.min(this.filteredRows.length, (this.pageIndex + 1) * this.pageSize);
  }

  onPageSizeChange(size: number): void {
    this.pageSize = Number(size || 5);
    this.pageIndex = 0;
  }

  onPageChange(delta: number): void {
    const next = this.pageIndex + delta;
    const maxPage = Math.max(0, Math.ceil(this.filteredRows.length / this.pageSize) - 1);
    this.pageIndex = Math.max(0, Math.min(maxPage, next));
  }

  private flattenGroupedData(grouped: GroupedRenewalResponse): RenewalItem[] {
    const output: RenewalItem[] = [];
    const groups: Array<[any, any[]]> = [
      ['applied', grouped?.applied || []],
      ['pending', grouped?.pending || []],
      ['objection', (grouped as any)?.objection || []],
      ['approved', grouped?.approved || []],
      ['rejected', grouped?.rejected || []]
    ];

    for (const [statusGroup, list] of groups) {
      for (const raw of list || []) {
        const appId = String(raw?.application_id || raw?.applicationId || raw?.id || '').trim();
        if (!appId) continue;

        const currentStageId = raw?.current_stage_id || raw?.currentStageId || raw?.current_stage;
        const currentStageRaw = String(raw?.current_stage_name || raw?.currentStageName || raw?.current_stage || '').trim();
        
        let finalStatusGroup: RenewalItem['statusGroup'] = statusGroup;
        const stageRawLower = currentStageRaw.toLowerCase();
        const isAwaitingPaymentStage = 
          stageRawLower.includes('awaiting payment') || 
          stageRawLower.includes('awaiting_payment') || 
          currentStageId === 119 || 
          currentStageId === '119' ||
          currentStageId === 109 ||
          currentStageId === '109';

        if (this.isLicenseeUser() && isAwaitingPaymentStage) {
          finalStatusGroup = 'awaiting-payment';
        }

        const categoryName = String(
          raw?.license_category_name ||
          raw?.licenseCategoryName ||
          raw?.license_category?.license_category ||
          raw?.license_category?.category_name ||
          raw?.license_category?.name ||
          (typeof raw?.license_category === 'string' && isNaN(Number(raw.license_category)) ? raw.license_category : '') ||
          raw?.license_type_name ||
          raw?.licenseTypeName ||
          '-'
        ).trim();

        const subCategoryName = String(
          raw?.license_sub_category_name ||
          raw?.licenseSubCategoryName ||
          raw?.license_sub_category?.description ||
          raw?.license_sub_category?.license_subcategory ||
          raw?.license_sub_category?.name ||
          (typeof raw?.license_sub_category === 'string' && isNaN(Number(raw.license_sub_category)) ? raw.license_sub_category : '') ||
          ''
        ).trim();

        output.push({
          id: appId,
          applicationId: appId,
          applicantName: String(raw?.applicant_name || raw?.applicantName || '').trim() || '-',
          oldLicenseId: String(raw?.old_license_id || raw?.oldLicenseId || '').trim() || '-',
          licenseCategoryName: categoryName,
          licenseSubCategoryName: subCategoryName,
          submittedOn: this.formatDate(raw?.submitted_on || raw?.submittedOn || raw?.submitted_at || raw?.submittedAt || raw?.created_at || raw?.createdAt || raw?.updated_at || raw?.updatedAt),
          currentStage: this.computeCurrentStageLabel(finalStatusGroup, currentStageRaw),
          currentStageRaw: currentStageRaw || '-',
          statusGroup: finalStatusGroup,
          canView: true,
          canPayLicenseFee: isAwaitingPaymentStage,
          rawRow: raw
        });
      }
    }
    return output;
  }

  payRenewalFee(row: RenewalItem): void {
    const applicationId = row.applicationId || row.id;
    if (!applicationId) {
      Swal.fire('Error', 'Application ID is missing for payment.', 'error');
      return;
    }

    const toNumber = (val: any): number => {
      if (val === null || val === undefined || val === '') return 0;
      const num = Number(val);
      return Number.isFinite(num) ? num : 0;
    };

    const formatInr = (val: any): string => {
      const num = toNumber(val);
      return num.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
    };

    const toBool = (val: any): boolean => {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return val === 1;
      if (typeof val === 'string') {
        const s = val.trim().toLowerCase();
        return s === 'true' || s === '1' || s === 'yes';
      }
      return false;
    };

    const resolveAmounts = (source: any): { licenseFee: number; total: number } => {
      const licenseFee = toNumber(
        source?.['license_fee_amount'] ??
        source?.['licenseFeeAmount'] ??
        source?.['yearly_license_fee'] ??
        source?.['yearlyLicenseFee'] ??
        0
      );
      return { licenseFee, total: licenseFee };
    };

    const showProceedModal = (amountSource: any) => {
      const { licenseFee, total } = resolveAmounts(amountSource);

      const pachwaiSelected = toBool(amountSource?.pachwai ?? amountSource?.pachwai_flag ?? amountSource?.pachwai_selected);
      const draughtSelected = toBool(amountSource?.draught_beer ?? amountSource?.draughtBeer ?? amountSource?.draughtbeer);
      const miniBarSelected = toBool(amountSource?.mini_bar ?? amountSource?.miniBar ?? amountSource?.minibar);
      const miniBarQty = toNumber(amountSource?.mini_bar_quantity ?? amountSource?.miniBarQuantity ?? amountSource?.minibarquantity ?? 0);

      let pachwaiFee = pachwaiSelected ? 3000 : 0;
      let draughtFee = draughtSelected ? 5000 : 0;
      let miniBarFee = miniBarSelected ? (1000 * (miniBarQty || 1)) : 0;

      const rawBreakdown = Array.isArray(amountSource?.additional_charges_breakdown)
        ? amountSource.additional_charges_breakdown
        : (amountSource?.additionalChargesBreakdown || []);

      const dynamicBreakdownRows: { label: string; amount: number }[] = [];
      if (rawBreakdown.length > 0) {
        rawBreakdown.forEach((item: any) => {
          dynamicBreakdownRows.push({
            label: item.label || item.code || 'Additional Charge',
            amount: toNumber(item.amount || 0)
          });
        });
      } else {
        if (pachwaiSelected) dynamicBreakdownRows.push({ label: 'Pachwai (Additional)', amount: pachwaiFee });
        if (draughtSelected) dynamicBreakdownRows.push({ label: 'Draught Beer (Additional)', amount: draughtFee });
        if (miniBarSelected) dynamicBreakdownRows.push({ label: `Mini Bar (Additional x${miniBarQty || 1})`, amount: miniBarFee });
      }

      const additionalTotal = dynamicBreakdownRows.reduce((sum, item) => sum + item.amount, 0);
      const hasAdditional = dynamicBreakdownRows.length > 0;
      const baseLicenseFee = toNumber(amountSource?.base_license_fee ?? amountSource?.baseLicenseFee ?? Math.max(0, licenseFee - additionalTotal));

      const feeRow = (label: string, amount: number, accent = false) => `
        <div style="display:flex; justify-content:space-between; align-items:center;
                    padding:10px 14px; border-radius:8px; margin-bottom:6px;
                    background:${accent ? '#f0fdf8' : '#f9fafb'};
                    border:1px solid ${accent ? '#6ee7c7' : '#e5e7eb'};">
          <span style="color:#374151; font-size:14px;">${label}</span>
          <span style="font-weight:700; color:${accent ? '#0d6e56' : '#111827'}; font-size:14px;">&#8377;${formatInr(amount)}</span>
        </div>`;

      const breakdownHtml = hasAdditional
        ? `
          <div style="margin-top:16px; border-radius:10px; border:1px solid #d1fae5; overflow:hidden;">
            <div style="background:linear-gradient(135deg,#065f46,#059669); color:#fff; padding:10px 16px; font-size:14px; font-weight:600; letter-spacing:0.5px; display:flex; justify-content:space-between; align-items:center;">
              <span>&#9783; Fee Breakup (Itemized)</span>
              <span style="font-size:12px; font-weight:400; opacity:0.95;">Total: &#8377;${formatInr(licenseFee)}</span>
            </div>
            <div style="padding:12px 12px 4px; background:#ffffff;">
              ${feeRow('Base License Fee', baseLicenseFee)}
              ${dynamicBreakdownRows.map(r => feeRow(r.label, r.amount)).join('')}

              <!-- Total Row inside Fee Breakup -->
              <div style="display:flex; justify-content:space-between; align-items:center;
                          padding:11px 14px; border-radius:8px; margin-top:8px; margin-bottom:6px;
                          background:#ecfdf5; border:1.5px solid #10b981;">
                <span style="color:#065f46; font-size:14px; font-weight:700;">Total Fee Breakup</span>
                <span style="font-weight:800; color:#065f46; font-size:16px;">&#8377;${formatInr(licenseFee)}</span>
              </div>
            </div>
            <div style="padding:10px 16px; font-size:12.5px; color:#047857; background:#f0fdf4; border-top:1px dashed #a7f3d0; line-height:1.5;">
              &#9432; <b>Fee Calculation Summary:</b><br/>
              &bull; Base License Fee (&#8377;${formatInr(baseLicenseFee)}) + Additional Charges (&#8377;${formatInr(additionalTotal)}) = <b>&#8377;${formatInr(licenseFee)} Total Fee Breakup</b>.
            </div>
          </div>
        `
        : '';

      Swal.fire({
        title: '',
        html: `
          <div style="font-family:'Segoe UI',sans-serif; text-align:left;">

            <!-- Header -->
            <div style="text-align:center; margin-bottom:20px;">
              <div style="display:inline-flex; align-items:center; justify-content:center;
                          width:52px; height:52px; border-radius:50%;
                          background:linear-gradient(135deg,#065f46,#10b981); margin-bottom:10px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="white"/>
                </svg>
              </div>
              <div style="font-size:22px; font-weight:700; color:#065f46; line-height:1.2;">Proceed to Pay</div>
              <div style="font-size:13px; color:#6b7280; margin-top:4px;">Review your license renewal payment summary before proceeding</div>
            </div>

            <!-- Fee Summary -->
            <div style="border-radius:10px; border:1px solid #d1fae5; overflow:hidden; margin-bottom:12px;">
              <div style="background:#ecfdf5; padding:10px 16px; font-size:12px; font-weight:600;
                          color:#065f46; letter-spacing:0.6px; text-transform:uppercase;">
                Payment Summary
              </div>
              <div style="padding:12px 12px 4px; background:#ffffff;">
                ${feeRow('License Renewal Fee', licenseFee, true)}
              </div>
              <!-- Total -->
              <div style="display:flex; justify-content:space-between; align-items:center;
                          padding:14px 16px; background:linear-gradient(135deg,#065f46,#10b981);
                          border-top:1px solid #6ee7c7;">
                <span style="color:#d1fae5; font-size:15px; font-weight:600;">Total Payable</span>
                <span style="color:#ffffff; font-size:20px; font-weight:800;">&#8377;${formatInr(total)}</span>
              </div>
            </div>

            ${breakdownHtml}

            <!-- Info note -->
            <div style="margin-top:14px; padding:14px 16px; background:#f0f9ff; border:1px solid #bae6fd;
                        border-radius:8px; font-size:13px; color:#0369a1; text-align: left; display:flex; flex-direction:column; gap:8px;">
              <div style="font-weight: 700; display:flex; gap:8px; align-items:center;">
                <span style="font-size:16px;">&#8505;</span>
                <span>Important Payment Instructions:</span>
              </div>
              <ul style="margin: 0; padding-left: 20px; line-height: 1.5; color:#344155;">
                <li><b>License Fee:</b> Pay by navigating to the <b>License Fee Wallet</b> tab and clicking <b>Pay Now</b>.</li>
              </ul>
            </div>

          </div>
        `,
        showCancelButton: true,
        confirmButtonText: '&#10003; &nbsp;Proceed',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#065f46',
        cancelButtonColor: '#6b7280',
        customClass: {
          popup: 'swal-proceed-popup',
          confirmButton: 'swal-proceed-confirm',
          cancelButton: 'swal-proceed-cancel'
        },
        width: '700px',
        didOpen: (popup) => {
          popup.style.background = 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 40%, #ecfdf5 100%)';
          popup.style.boxShadow = '0 24px 60px rgba(5,150,105,0.18), 0 4px 16px rgba(5,150,105,0.10)';
        }
      }).then((result) => {
        if (!result.isConfirmed) return;
        this.router.navigate(['/dashboard'], {
          queryParams: {
            section: 'wallet',
            action: 'pay',
            tab: 'license_fee',
            walletView: 'others',
            id: applicationId,
            type: 'license-renewal',
            ref: applicationId,
            referenceNo: applicationId,
            amount: Number.isFinite(licenseFee) && licenseFee > 0 ? licenseFee : undefined,
            source: 'license-renewal'
          }
        });
      });
    };

    const raw = row.rawRow;
    if (raw?.['license_fee_amount'] || raw?.['licenseFeeAmount'] || raw?.['yearly_license_fee'] || raw?.['yearlyLicenseFee']) {
      showProceedModal(raw);
    } else {
      Swal.fire({
        title: 'Loading...',
        text: 'Fetching fee amounts',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      this.licenseApplicationService.getLicenseRenewalApplicationById(applicationId).subscribe({
        next: (detail: any) => {
          Swal.close();
          showProceedModal(detail || raw);
        },
        error: () => {
          Swal.close();
          showProceedModal(raw);
        }
      });
    }
  }

  private computeCurrentStageLabel(statusGroup: RenewalItem['statusGroup'], currentStageRaw: string): string {
    if (this.isLicenseeUser()) {
      if (statusGroup === 'approved') return 'Approved';
      if (statusGroup === 'rejected') return 'Rejected';
      if (statusGroup === 'objection') return 'Objection';
      if (statusGroup === 'awaiting-payment') return 'Awaiting Payment';
      return 'Pending';
    }
    return this.formatStageName(currentStageRaw || statusGroup);
  }

  private getDetailViewSource(): string {
    const roleId = Number(this.roleService.getCurrentUser()?.roleId || 0);
    if (this.roleService.isLicenseeRole(roleId)) return 'licensee';
    switch (roleId) {
      case 5: return 'permit-section';
      case 6: return 'itcell';
      case 7: return 'officer-in-charge';
      case 9:
      case 10:
        return 'commissioner-dashboard';
      default:
        return 'commissioner-dashboard';
    }
  }

  private formatDate(value: any): string {
    if (!value) return '-';
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return String(value || '').trim() || '-';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private formatStageName(value: string): string {
    const raw = String(value || '').trim();
    if (!raw) return '-';
    return raw
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
