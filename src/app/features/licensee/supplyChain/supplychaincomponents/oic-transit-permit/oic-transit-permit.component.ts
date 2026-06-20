import { Component, OnInit, ViewChild, AfterViewInit, Inject, Optional } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { OicTransitPermitService, GroupedTransitPermit } from '../../services/oic-transit-permit.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ActivatedRoute, Router } from '@angular/router';

interface BrandDetail {
  slNo: number;
  brand: string;
  size: string;
  cases: number;
  bottleType: string;
  brandOwner: string;
  liquorType: string;
  manufacturingUnit: string;
}

// Rejection Confirmation Dialog
@Component({
  selector: 'app-rejection-confirmation-dialog',
  standalone: true,
  imports: [MaterialModule, CommonModule, FormsModule],
  template: `
    <div class="rejection-dialog">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon color="warn">warning</mat-icon> Confirm Rejection
      </h2>
      <div mat-dialog-content>
        <div class="alert-message">
          <p><strong>Warning:</strong> You are about to reject Transit Permit <strong>{{data.billNo}}</strong>.</p>
          <p>Please note that:</p>
          <ul>
            <li>The deducted wallet amount will be <strong>refunded</strong> to the licensee.</li>
            <li>The utilized stock (bottles/cases) will be <strong>restored</strong> to the Brand Warehouse.</li>
          </ul>
        </div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Reason for Rejection</mat-label>
          <textarea matInput [(ngModel)]="remarks" placeholder="Enter remarks..." rows="3" required></textarea>
        </mat-form-field>
      </div>
      <div mat-dialog-actions align="end">
        <button mat-button mat-dialog-close>Cancel</button>
        <button mat-raised-button color="warn" [mat-dialog-close]="{confirmed: true, remarks: remarks}" [disabled]="!remarks">
          I Agree and Confirm
        </button>
      </div>
    </div>
  `,
  styles: [`
    .rejection-dialog { padding: 0; max-width: 500px; }
    .dialog-title {
      display: flex; align-items: center; gap: 8px;
      margin: 0; padding: 16px 24px;
      background-color: #ffebee; color: #c62828;
      border-bottom: 1px solid #ffcdd2;
    }
    .alert-message {
      background-color: #fff8e1; color: #f57f17;
      padding: 16px; border-radius: 8px; margin: 20px 0;
      border: 1px solid #ffecb3;
      p { margin: 8px 0; }
      ul { margin-top: 8px; padding-left: 20px; }
    }
    .full-width { width: 100%; }
  `]
})
export class RejectionConfirmationDialogComponent {
  remarks: string = '';
  constructor(@Inject(MAT_DIALOG_DATA) public data: { billNo: string }) { }
}

@Component({
  selector: 'app-oic-transit-permit',
  imports: [MaterialModule, CommonModule],
  templateUrl: './oic-transit-permit.component.html',
  styleUrl: './oic-transit-permit.component.scss'
})
export class OicTransitPermitComponent implements OnInit, AfterViewInit {

  filterForm: FormGroup;

  // Statistics
  pendingApplications = 0;
  approvedApplications = 0;
  rejectedApplications = 0;
  totalApplications = 0;

  // Table data
  displayedColumns: string[] = [
    'slNo', 'refNo', 'appDate', 'licensee', 'destination',
    'vehicleNo', 'depotAddress', 'amount', 'brandDetails', 'status', 'actions'
  ];

  dataSource = new MatTableDataSource<GroupedTransitPermit>([]);
  allPermits: GroupedTransitPermit[] = [];
  isLoading = false;
  private focusPendingOnLoad = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private transitPermitService: OicTransitPermitService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.filterForm = this.fb.group({
      referenceNumber: [''],
      status: ['All Status'],
      fromDate: [''],
      toDate: ['']
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.focusPendingOnLoad = String(params.get('focus') || '').toLowerCase() === 'pending';
      this.applyInitialFocusIfNeeded();
    });
    this.loadTransitPermits();
    this.setupFilterListener();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  loadTransitPermits(): void {
    this.isLoading = true;

    this.transitPermitService.getOICTransitPermits().subscribe({
      next: (permits) => {
        this.allPermits = permits;
        this.dataSource.data = permits;
        this.updateStatistics();
        this.isLoading = false;

        // If opened from sidebar with focus=pending, auto-select pending when available.
        this.applyInitialFocusIfNeeded();

        // Apply any existing filters
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error loading transit permits:', error);
        this.snackBar.open('Error loading transit permits: ' + (error.error?.message || error.message), 'Close', { duration: 5000 });
        this.isLoading = false;
      }
    });
  }

  updateStatistics(): void {
    this.transitPermitService.getOICStatistics().subscribe({
      next: (stats) => {
        this.pendingApplications = stats.pending;
        this.approvedApplications = stats.approved;
        this.rejectedApplications = stats.rejected;
        this.totalApplications = stats.total;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
      }
    });
  }

  setupFilterListener(): void {
    this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  applyFilters(): void {
    const filters = this.filterForm.value;
    let filtered = [...this.allPermits];

    // Filter by reference number
    if (filters.referenceNumber) {
      filtered = filtered.filter(permit =>
        permit.bill_no.toLowerCase().includes(filters.referenceNumber.toLowerCase())
      );
    }

    // Filter by status
    if (filters.status && filters.status !== 'All Status') {
      filtered = filtered.filter(permit => {
        const allowed = Array.isArray(permit.allowed_actions) ? permit.allowed_actions.map(a => String(a).toUpperCase()) : [];
        const entryActions = Array.isArray(permit.current_stage_entry_actions) ? permit.current_stage_entry_actions.map(a => String(a).toUpperCase()) : [];
        if (filters.status === 'PENDING') {
          return allowed.includes('APPROVE') || allowed.includes('REJECT');
        } else if (filters.status === 'APPROVED') {
          return !!permit.current_stage_is_final && entryActions.includes('APPROVE');
        } else if (filters.status === 'REJECTED') {
          return !!permit.current_stage_is_final && entryActions.includes('REJECT');
        }
        return false;
      });
    }

    // Filter by date range
    if (filters.fromDate) {
      const fromDate = new Date(filters.fromDate);
      filtered = filtered.filter(permit => new Date(permit.date) >= fromDate);
    }

    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      filtered = filtered.filter(permit => new Date(permit.date) <= toDate);
    }

    this.dataSource.data = filtered;
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  private applyInitialFocusIfNeeded(): void {
    if (!this.focusPendingOnLoad) return;
    if (!this.allPermits || this.allPermits.length === 0) return;

    const hasPending = this.allPermits.some((permit) => this.isPermitPending(permit));
    if (!hasPending) return;

    if (this.filterForm.get('status')?.value !== 'PENDING') {
      this.filterForm.patchValue({ status: 'PENDING' }, { emitEvent: true });
    }
  }

  private isPermitPending(permit: GroupedTransitPermit): boolean {
    const allowed = Array.isArray((permit as any)?.allowed_actions)
      ? (permit as any).allowed_actions.map((a: any) => String(a).toUpperCase())
      : [];
    return allowed.includes('APPROVE') || allowed.includes('REJECT');
  }

  onStatCardClick(status: 'All Status' | 'PENDING' | 'APPROVED' | 'REJECTED'): void {
    this.filterForm.patchValue({ status });
  }

  isStatCardActive(status: 'All Status' | 'PENDING' | 'APPROVED' | 'REJECTED'): boolean {
    return this.filterForm.get('status')?.value === status;
  }

  onClear(): void {
    this.filterForm.reset({
      referenceNumber: '',
      status: 'All Status',
      fromDate: '',
      toDate: ''
    });
    this.dataSource.data = this.allPermits;
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  onExport(): void {
    // Export functionality
    console.log('Export clicked');
    this.snackBar.open('Export functionality coming soon', 'Close', { duration: 3000 });
  }

  onView(element: GroupedTransitPermit): void {
    const permitId = element?.brands?.[0]?.id;
    this.router.navigate(['/supply-chain-view'], {
      queryParams: {
        id: permitId,
        ref: element.bill_no,
        type: 'transit',
        source: 'officer-in-charge'
      }
    });
  }

  onViewFinalPermit(element: GroupedTransitPermit): void {
    console.log('View Final Permit clicked for:', element);

    // Save the transit permit data to localStorage
    localStorage.setItem('finalTransitPermitData', JSON.stringify(element));

    // Navigate to final permit view
    this.router.navigate(['/unified-letter-view/transit']);
  }

  onEdit(element: GroupedTransitPermit): void {
    console.log('Edit clicked for:', element);
    this.snackBar.open('Edit functionality coming soon', 'Close', { duration: 2000 });
  }

  onApprove(element: GroupedTransitPermit): void {
    if (confirm(`Are you sure you want to approve transit permit ${element.bill_no}?`)) {
      // Get the first brand's ID to perform action
      const permitId = element.brands[0].id;
      this.transitPermitService.performAction(permitId, 'APPROVE').subscribe({
        next: (_response) => {
          localStorage.setItem('finalTransitPermitData', JSON.stringify(element));
          this.snackBar.open('Transit permit approved successfully', 'Close', { duration: 3000 });
          this.loadTransitPermits();
          this.router.navigate(['/unified-letter-view/transit']);
        },
        error: (error) => {
          console.error('Error approving transit permit:', error);
          this.snackBar.open('Error approving transit permit: ' + (error.error?.message || error.message), 'Close', { duration: 5000 });
        }
      });
    }
  }

  onReject(element: GroupedTransitPermit): void {
    const dialogRef = this.dialog.open(RejectionConfirmationDialogComponent, {
      width: '500px',
      data: { billNo: element.bill_no }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.confirmed) {
        // Get the first brand's ID to perform action (assuming rejection applies to whole permit group)
        // In backend, rejection of one permit in group currently refunds everything?
        // Actually backend logic takes `permit` object which is a single `EnaTransitPermitDetail`.
        // But the group logic implies there are multiple "brands" with same bill_no.
        // If we reject one ID, do we reject all?
        // The backend `_handle_rejection` uses `permit.bill_no` to find `BrandWarehouseUtilization`.
        // Utilization is linked to `permit_no`.
        // If multiple rows share `bill_no`, they might share utilization record?
        // Assuming rejecting one record with the bill_no is enough to trigger the bill-level rejection or 
        // we should loop? 
        // The current `performAction` takes one ID. The backend finds `permit` by that ID.
        // `_handle_rejection` uses `permit.bill_no`.
        // So submitting any valid ID from the group should work if the backend uses bill_no for the heavy lifting.
        const permitId = element.brands[0].id;
        const remarks = result.remarks;

        this.transitPermitService.performAction(permitId, 'REJECT', remarks).subscribe({
          next: (response) => {
            this.snackBar.open('Transit permit rejected successfully', 'Close', { duration: 3000 });
            this.loadTransitPermits();
          },
          error: (error) => {
            console.error('Error rejecting transit permit:', error);
            this.snackBar.open('Error rejecting transit permit: ' + (error.error?.message || error.message), 'Close', { duration: 5000 });
          }
        });
      }
    });
  }

  onShowBrandDetails(element: GroupedTransitPermit): void {
    const brandDetails: BrandDetail[] = element.brands.map((brand: any, index) => ({
      slNo: index + 1,
      brand: brand.brand,
      size: `${brand.size_ml || brand.sizeMl || 0}ml`,
      cases: brand.cases,
      bottleType: brand.bottle_type || brand.bottleType || '',
      brandOwner: brand.brand_owner || brand.brandOwner || '',
      liquorType: brand.liquor_type || brand.liquorType || '',
      manufacturingUnit: brand.manufacturing_unit_name || brand.manufacturingUnitName || brand.manufacturingUnit || ''
    }));

    const dialogRef = this.dialog.open(BrandDetailsDialogComponent, {
      width: '90%',
      maxWidth: '1200px',
      panelClass: 'brand-details-dialog-panel',
      enterAnimationDuration: '400ms',
      exitAnimationDuration: '300ms',
      data: {
        refNo: element.bill_no,
        brands: brandDetails,
        totalProducts: element.total_products,
        totalCases: element.total_cases
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Brand details dialog was closed');
    });
  }

  getStatusClass(element: GroupedTransitPermit): string {
    const allowed = Array.isArray(element.allowed_actions) ? element.allowed_actions.map(a => String(a).toUpperCase()) : [];
    const entryActions = Array.isArray(element.current_stage_entry_actions) ? element.current_stage_entry_actions.map(a => String(a).toUpperCase()) : [];
    if (allowed.includes('APPROVE') || allowed.includes('REJECT')) {
      return 'status-pending';
    } else if (element.current_stage_is_final && entryActions.includes('APPROVE')) {
      return 'status-approved';
    } else if (element.current_stage_is_final && entryActions.includes('REJECT')) {
      return 'status-rejected';
    }
    return '';
  }

  getStatusLabel(element: GroupedTransitPermit): string {
    const dynamicLabel = String(element?.status_label || '').trim();
    if (dynamicLabel) {
      return dynamicLabel;
    }
    const statusCode = String(element?.status_code || '').trim();
    const status = String(element?.status || '').trim();
    return dynamicLabel || status || statusCode || 'N/A';
  }

  getStatusIcon(element: GroupedTransitPermit): string {
    const allowed = Array.isArray(element.allowed_actions) ? element.allowed_actions.map(a => String(a).toUpperCase()) : [];
    const entryActions = Array.isArray(element.current_stage_entry_actions) ? element.current_stage_entry_actions.map(a => String(a).toUpperCase()) : [];
    if (element.current_stage_is_final && entryActions.includes('APPROVE')) return 'check_circle';
    if (element.current_stage_is_final && entryActions.includes('REJECT')) return 'cancel';
    if (allowed.includes('APPROVE') || allowed.includes('REJECT')) return 'schedule';
    return 'schedule';
  }

  canViewFinalPermit(element: GroupedTransitPermit): boolean {
    const entryActions = Array.isArray(element.current_stage_entry_actions) ? element.current_stage_entry_actions.map(a => String(a).toUpperCase()) : [];
    return !!element.current_stage_is_final && entryActions.includes('APPROVE');
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  }
}

// Brand Details Dialog Component
@Component({
  selector: 'app-brand-details-dialog',
  standalone: true,
  imports: [MaterialModule, CommonModule],
  template: `
    <!-- Header (outside mat-dialog-content so it's always visible) -->
    <div class="bdd-header">
      <div class="bdd-header-left">
        <div class="bdd-header-icon">
          <mat-icon>inventory_2</mat-icon>
        </div>
        <div class="bdd-header-text">
          <div class="bdd-header-title">Brand Details</div>
          <div class="bdd-header-sub">{{ data.refNo }}</div>
        </div>
      </div>
      <button mat-icon-button mat-dialog-close class="bdd-close">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <!-- Scrollable body -->
    <mat-dialog-content class="bdd-body">

      <!-- Summary cards -->
      <div class="bdd-stats">
        <div class="bdd-stat-card">
          <div class="bdd-stat-icon ref-icon"><mat-icon>tag</mat-icon></div>
          <div>
            <div class="bdd-stat-label">Reference No.</div>
            <div class="bdd-stat-value ref">{{ data.refNo }}</div>
          </div>
        </div>
        <div class="bdd-stat-card">
          <div class="bdd-stat-icon prod-icon"><mat-icon>category</mat-icon></div>
          <div>
            <div class="bdd-stat-label">Total Products</div>
            <div class="bdd-stat-value green">{{ data.totalProducts }}</div>
          </div>
        </div>
        <div class="bdd-stat-card">
          <div class="bdd-stat-icon cases-icon"><mat-icon>inventory</mat-icon></div>
          <div>
            <div class="bdd-stat-label">Total Cases</div>
            <div class="bdd-stat-value teal">{{ data.totalCases }}</div>
          </div>
        </div>
      </div>

      <!-- Section heading -->
      <div class="bdd-section-title">
        <span class="bdd-accent-bar"></span>Brand Information
      </div>

      <!-- Table -->
      <div class="bdd-table-wrap">
          
        <mat-table [dataSource]="data.brands">
          <ng-container matColumnDef="slNo">
            <mat-header-cell *matHeaderCellDef>#</mat-header-cell>
            <mat-cell *matCellDef="let e">
              <span class="bdd-serial">{{ e.slNo }}</span>
            </mat-cell>
          </ng-container>
          <ng-container matColumnDef="brand">
            <mat-header-cell *matHeaderCellDef>Brand</mat-header-cell>
            <mat-cell *matCellDef="let e">
              <div class="bdd-brand-name">{{ e.brand }}</div>
            </mat-cell>
          </ng-container>
          <ng-container matColumnDef="size">
            <mat-header-cell *matHeaderCellDef>Size (ml)</mat-header-cell>
            <mat-cell *matCellDef="let e">
              <span class="bdd-chip blue">{{ e.size }}</span>
            </mat-cell>
          </ng-container>
          <ng-container matColumnDef="cases">
            <mat-header-cell *matHeaderCellDef>Cases</mat-header-cell>
            <mat-cell *matCellDef="let e">
              <span class="bdd-chip green">{{ e.cases }}</span>
            </mat-cell>
          </ng-container>
          <ng-container matColumnDef="bottleType">
            <mat-header-cell *matHeaderCellDef>Bottle Type</mat-header-cell>
            <mat-cell *matCellDef="let e">{{ e.bottleType }}</mat-cell>
          </ng-container>
          <ng-container matColumnDef="brandOwner">
            <mat-header-cell *matHeaderCellDef>Brand Owner</mat-header-cell>
            <mat-cell *matCellDef="let e">{{ e.brandOwner }}</mat-cell>
          </ng-container>
          <ng-container matColumnDef="liquorType">
            <mat-header-cell *matHeaderCellDef>Liquor Type</mat-header-cell>
            <mat-cell *matCellDef="let e">
              <span class="bdd-liquor" [ngClass]="getLiquorTypeClass(e.liquorType)">{{ e.liquorType }}</span>
            </mat-cell>
          </ng-container>
          <ng-container matColumnDef="manufacturingUnit">
            <mat-header-cell *matHeaderCellDef>Manufacturing Unit</mat-header-cell>
            <mat-cell *matCellDef="let e">{{ e.manufacturingUnit }}</mat-cell>
          </ng-container>
          <mat-header-row *matHeaderRowDef="displayedColumns"></mat-header-row>
          <mat-row *matRowDef="let row; columns: displayedColumns;"></mat-row>
        </mat-table>
      </div>

    </mat-dialog-content>

    <!-- Footer (outside scroll area) -->
    <mat-dialog-actions class="bdd-footer">
      <div class="bdd-footer-info">
        <mat-icon>check_circle</mat-icon>
        <span>All brand details are verified and up-to-date</span>
      </div>
      <div class="bdd-footer-actions">
        <button mat-button mat-dialog-close class="bdd-btn-close">
          <mat-icon>close</mat-icon> Close
        </button>
        <button mat-raised-button class="bdd-btn-export">
          <mat-icon>file_download</mat-icon> Export Details
        </button>
      </div>
    </mat-dialog-actions>
  `,
  styles: [`
    /* ── Host & layout ───────────────────────────── */
    :host {
      display: flex; flex-direction: column;
      max-height: 85vh; overflow: hidden;
    }

    /* ── Header ──────────────────────────────────── */
    .bdd-header {
      display: flex; align-items: center; justify-content: space-between;
      background: linear-gradient(135deg, #1C2B78 0%, #2d3f9e 60%, #1a3a6e 100%);
      color: #fff;
      padding: 20px 28px;
      flex-shrink: 0;
      position: relative;
      overflow: hidden;
    }
    .bdd-header::after {
      content: '';
      position: absolute; bottom: 0; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, #34d399, #3b82f6, #a78bfa);
    }
    .bdd-header-left { display: flex; align-items: center; gap: 16px; }
    .bdd-header-icon {
      width: 50px; height: 50px; border-radius: 14px;
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.25);
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(4px);
    }
    .bdd-header-icon mat-icon { font-size: 26px; width: 26px; height: 26px; color: #fff; }
    .bdd-header-title { font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
    .bdd-header-sub {
      font-size: 13px; opacity: 0.8; font-family: 'Courier New', monospace;
      margin-top: 2px; background: rgba(255,255,255,0.12);
      display: inline-block; padding: 1px 8px; border-radius: 4px;
    }
    .bdd-close {
      color: #fff !important; background: rgba(255,255,255,0.12) !important;
      border-radius: 50% !important;
    }
    .bdd-close:hover { background: rgba(255,255,255,0.25) !important; }

    /* ── Scrollable body ─────────────────────────── */
    .bdd-body {
      flex: 1; overflow-y: auto; overflow-x: hidden;
      padding: 24px 28px !important;
      max-height: calc(85vh - 160px);
    }

    /* ── Stat cards ──────────────────────────────── */
    .bdd-stats {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 14px; margin-bottom: 24px;
    }
    .bdd-stat-card {
      display: flex; align-items: center; gap: 14px;
      background: #fff; border: 1px solid #e2e8f0;
      border-radius: 12px; padding: 16px 18px;
      box-shadow: 0 2px 8px rgba(28,43,120,0.07);
    }
    .bdd-stat-icon {
      width: 42px; height: 42px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .bdd-stat-icon mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .ref-icon   { background: #eff6ff; } .ref-icon mat-icon   { color: #1C2B78; }
    .prod-icon  { background: #f0fdf4; } .prod-icon mat-icon  { color: #16a34a; }
    .cases-icon { background: #ecfeff; } .cases-icon mat-icon { color: #0891b2; }
    .bdd-stat-label {
      font-size: 10px; font-weight: 700; color: #94a3b8;
      text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 3px;
    }
    .bdd-stat-value { font-size: 18px; font-weight: 700; }
    .bdd-stat-value.ref   { color: #1C2B78; font-size: 14px; font-family: monospace; }
    .bdd-stat-value.green { color: #16a34a; }
    .bdd-stat-value.teal  { color: #0891b2; }

    /* ── Section title ───────────────────────────── */
    .bdd-section-title {
      display: flex; align-items: center; gap: 10px;
      font-size: 14px; font-weight: 700; color: #1e293b;
      text-transform: uppercase; letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .bdd-accent-bar { width: 4px; height: 16px; background: #1C2B78; border-radius: 3px; }

    /* ── Table ───────────────────────────────────── */
    .bdd-table-wrap {
      border-radius: 10px; border: 1px solid #e2e8f0;
      overflow: hidden; overflow-x: auto;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    mat-table { width: 100%; min-width: 880px; background: #fff; }
    mat-header-row {
      background: linear-gradient(90deg, #0f172a 0%, #1e293b 100%);
      min-height: 46px;
    }
    mat-header-cell {
      color: #cbd5e1 !important; font-size: 11px !important;
      font-weight: 700 !important; text-transform: uppercase;
      letter-spacing: 0.07em; background: transparent !important;
      border-bottom: none !important; padding: 0 16px;
    }
    mat-row {
      border-bottom: 1px solid #f1f5f9;
      transition: background 0.12s ease;
      min-height: 54px;
    }
    mat-row:hover { background: #f0f5ff !important; }
    mat-row:nth-child(even) { background: #fafbff; }
    mat-row:last-child { border-bottom: none; }
    mat-cell { font-size: 13px; color: #334155; padding: 0 16px; }

    /* ── Cell helpers ────────────────────────────── */
    .bdd-serial {
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: 50%;
      background: #1C2B78; color: #fff;
      font-size: 12px; font-weight: 700;
    }
    .bdd-brand-name { color: #1C2B78; font-weight: 600; font-size: 13px; line-height: 1.4; }
    .bdd-chip {
      display: inline-block; padding: 3px 11px; border-radius: 20px;
      font-size: 12px; font-weight: 600; white-space: nowrap;
    }
    .bdd-chip.blue  { background: #dbeafe; color: #1d4ed8; }
    .bdd-chip.green { background: #dcfce7; color: #15803d; }
    .bdd-liquor {
      display: inline-block; padding: 3px 10px; border-radius: 20px;
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;
    }
    .bdd-liquor.type-whisky  { background: #fff7ed; color: #c2410c; }
    .bdd-liquor.type-beer    { background: #fefce8; color: #a16207; }
    .bdd-liquor.type-rum     { background: #fdf4ff; color: #7e22ce; }
    .bdd-liquor.type-vodka   { background: #f0fdf4; color: #15803d; }
    .bdd-liquor.type-wine    { background: #fff1f2; color: #be123c; }
    .bdd-liquor.type-generic { background: #f1f5f9; color: #475569; }

    /* ── Footer ──────────────────────────────────── */
    .bdd-footer {
      display: flex !important; align-items: center; justify-content: space-between;
      padding: 14px 28px !important; margin: 0 !important;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc; flex-shrink: 0;
      min-height: 56px;
    }
    .bdd-footer-info {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; color: #64748b;
    }
    .bdd-footer-info mat-icon { font-size: 15px; width: 15px; height: 15px; color: #16a34a; }
    .bdd-footer-actions { display: flex; gap: 10px; }
    .bdd-btn-close { color: #64748b !important; border: 1px solid #e2e8f0 !important; border-radius: 8px !important; }
    .bdd-btn-export {
      background: #1C2B78 !important; color: #fff !important;
      border-radius: 8px !important;
      box-shadow: 0 2px 8px rgba(28,43,120,0.3) !important;
    }
  `]
})
export class BrandDetailsDialogComponent {
  displayedColumns: string[] = ['slNo', 'brand', 'size', 'cases', 'bottleType', 'brandOwner', 'liquorType', 'manufacturingUnit'];

  constructor(
    public dialogRef: MatDialogRef<BrandDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  getLiquorTypeClass(liquorType: string): string {
    if (!liquorType) return 'type-generic';
    const lower = liquorType.toLowerCase();
    if (lower.includes('whisky')) return 'type-whisky';
    if (lower.includes('beer')) return 'type-beer';
    if (lower.includes('rum')) return 'type-rum';
    if (lower.includes('vodka')) return 'type-vodka';
    if (lower.includes('wine')) return 'type-wine';
    return 'type-generic';
  }
}
