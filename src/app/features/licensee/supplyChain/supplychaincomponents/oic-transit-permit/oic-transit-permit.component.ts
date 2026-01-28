import { Component, OnInit, ViewChild, AfterViewInit, Inject, Optional } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { OicTransitPermitService, GroupedTransitPermit } from '../../services/oic-transit-permit.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Router } from '@angular/router';

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

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private transitPermitService: OicTransitPermitService,
    private snackBar: MatSnackBar,
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
        const status = permit.status.toLowerCase();
        const statusCode = permit.status_code;

        if (filters.status === 'PENDING') {
          return statusCode === 'TRP_02' || status.includes('payment') && status.includes('successful');
        } else if (filters.status === 'APPROVED') {
          return statusCode === 'TRP_03' || status.includes('approved');
        } else if (filters.status === 'REJECTED') {
          return statusCode === 'TRP_04' || status.includes('cancelled') || status.includes('rejected');
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
    console.log('View clicked for:', element);

    // Save the transit permit data to localStorage for the letter view to access
    const transitList: any[] = JSON.parse(localStorage.getItem('transitPermitRequests') || '[]');

    // Check if this permit already exists in localStorage
    const existingIndex = transitList.findIndex((r: any) => r.billNo === element.bill_no);

    // Prepare the transit data with all brand details
    const transitData = {
      billNo: element.bill_no,
      bill_no: element.bill_no,
      refNo: element.bill_no,
      date: element.date,
      submissionDate: element.date,
      soleDistributor: element.sole_distributor_name,
      sole_distributor_name: element.sole_distributor_name,
      depotAddress: element.depot_address,
      depot_address: element.depot_address,
      vehicleNumber: element.vehicle_number,
      vehicle_number: element.vehicle_number,
      status: element.status,
      status_code: element.status_code,
      totalAmount: element.total_amount,
      total_amount: element.total_amount,
      brands: element.brands,
      created_at: element.created_at,
      updated_at: element.updated_at
    };

    if (existingIndex >= 0) {
      // Update existing entry
      transitList[existingIndex] = transitData;
    } else {
      // Add new entry
      transitList.push(transitData);
    }

    // Save back to localStorage
    localStorage.setItem('transitPermitRequests', JSON.stringify(transitList));

    // Navigate to transit permit letter view with reference number and source
    this.router.navigate(['/dev-transit-permit-letter-view'], {
      queryParams: {
        ref: element.bill_no,
        source: 'oic-dashboard'
      }
    });
  }

  onViewFinalPermit(element: GroupedTransitPermit): void {
    console.log('View Final Permit clicked for:', element);

    // Save the transit permit data to localStorage
    localStorage.setItem('finalTransitPermitData', JSON.stringify(element));

    // Navigate to final permit view
    this.router.navigate(['/dev-final-transit-permit-view']);
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
        next: (response) => {
          this.snackBar.open('Transit permit approved successfully', 'Close', { duration: 3000 });
          this.loadTransitPermits();
        },
        error: (error) => {
          console.error('Error approving transit permit:', error);
          this.snackBar.open('Error approving transit permit', 'Close', { duration: 3000 });
        }
      });
    }
  }

  onReject(element: GroupedTransitPermit): void {
    if (confirm(`Are you sure you want to reject transit permit ${element.bill_no}?`)) {
      // Get the first brand's ID to perform action
      const permitId = element.brands[0].id;
      this.transitPermitService.performAction(permitId, 'REJECT').subscribe({
        next: (response) => {
          this.snackBar.open('Transit permit rejected successfully', 'Close', { duration: 3000 });
          this.loadTransitPermits();
        },
        error: (error) => {
          console.error('Error rejecting transit permit:', error);
          this.snackBar.open('Error rejecting transit permit', 'Close', { duration: 3000 });
        }
      });
    }
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

  getStatusClass(statusCode: string): string {
    // Handle both status_code and status string
    if (statusCode === 'TRP_02' || statusCode.toLowerCase().includes('payment')) {
      return 'status-pending';
    } else if (statusCode === 'TRP_03' || statusCode.toLowerCase().includes('approved')) {
      return 'status-approved';
    } else if (statusCode === 'TRP_04' || statusCode.toLowerCase().includes('cancelled') || statusCode.toLowerCase().includes('rejected')) {
      return 'status-rejected';
    }
    return '';
  }

  getStatusLabel(statusCode: string): string {
    // Handle both status_code and status string
    if (statusCode === 'TRP_02' || statusCode.toLowerCase().includes('payment')) {
      return 'PAYMENT SUCCESSFUL & FORWARDED';
    } else if (statusCode === 'TRP_03' || statusCode.toLowerCase().includes('approved')) {
      return 'APPROVED';
    } else if (statusCode === 'TRP_04' || statusCode.toLowerCase().includes('cancelled') || statusCode.toLowerCase().includes('rejected')) {
      return 'REJECTED';
    }
    return statusCode;
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
  animations: [
    trigger('fadeInUp', [
      state('in', style({ opacity: 1, transform: 'translateY(0)' })),
      transition('void => *', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.4s cubic-bezier(0.25, 0.8, 0.25, 1)')
      ])
    ])
  ],
  template: `
    <div class="brand-details-dialog">
      <div class="dialog-header">
        <div class="header-content">
          <mat-icon class="header-icon">inventory_2</mat-icon>
          <h2>Brand Details for {{ data.refNo }}</h2>
        </div>
        <button mat-icon-button mat-dialog-close class="close-btn" matTooltip="Close">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="dialog-body">
        <div class="dialog-stats">
          <div class="stat-card" [@fadeInUp]="'in'">
            <div class="stat-label">REFERENCE NUMBER</div>
            <div class="stat-value ref-number">{{ data.refNo }}</div>
          </div>
          <div class="stat-card" [@fadeInUp]="'in'" style="animation-delay: 0.1s;">
            <div class="stat-label">TOTAL PRODUCTS</div>
            <div class="stat-value total-products">{{ data.totalProducts }}</div>
          </div>
          <div class="stat-card" [@fadeInUp]="'in'" style="animation-delay: 0.2s;">
            <div class="stat-label">TOTAL CASES</div>
            <div class="stat-value total-cases">{{ data.totalCases }}</div>
          </div>
        </div>

        <div class="table-container" [@fadeInUp]="'in'" style="animation-delay: 0.3s;">
          <div class="table-header">
            <h3>Brand Information</h3>
            <div class="table-actions">
              <button mat-icon-button matTooltip="Refresh">
                <mat-icon>refresh</mat-icon>
              </button>
              <button mat-icon-button matTooltip="Print">
                <mat-icon>print</mat-icon>
              </button>
            </div>
          </div>
          
          <div class="table-wrapper">
            <mat-table [dataSource]="data.brands" class="brand-table">
              
              <!-- Serial Number Column -->
              <ng-container matColumnDef="slNo">
                <mat-header-cell *matHeaderCellDef class="serial-header">#</mat-header-cell>
                <mat-cell *matCellDef="let element" class="serial-cell">
                  <div class="serial-number">{{ element.slNo }}</div>
                </mat-cell>
              </ng-container>

              <!-- Brand Column -->
              <ng-container matColumnDef="brand">
                <mat-header-cell *matHeaderCellDef>Brand</mat-header-cell>
                <mat-cell *matCellDef="let element" class="brand-cell">
                  <div class="brand-info">
                    <div class="brand-name">{{ element.brand }}</div>
                    <div class="brand-subtitle">Premium Quality</div>
                  </div>
                </mat-cell>
              </ng-container>

              <!-- Size Column -->
              <ng-container matColumnDef="size">
                <mat-header-cell *matHeaderCellDef>Size (ml)</mat-header-cell>
                <mat-cell *matCellDef="let element" class="size-cell">
                  <div class="size-container">
                    <mat-icon class="size-icon">local_drink</mat-icon>
                    <span class="size-badge">{{ element.size }}</span>
                  </div>
                </mat-cell>
              </ng-container>

              <!-- Cases Column -->
              <ng-container matColumnDef="cases">
                <mat-header-cell *matHeaderCellDef>Cases</mat-header-cell>
                <mat-cell *matCellDef="let element" class="cases-cell">
                  <div class="cases-container">
                    <mat-icon class="cases-icon">inventory</mat-icon>
                    <span class="cases-badge">{{ element.cases }}</span>
                  </div>
                </mat-cell>
              </ng-container>

              <!-- Bottle Type Column -->
              <ng-container matColumnDef="bottleType">
                <mat-header-cell *matHeaderCellDef>Bottle Type</mat-header-cell>
                <mat-cell *matCellDef="let element" class="bottle-cell">
                  <div class="bottle-info">
                    <mat-icon class="bottle-icon">wine_bar</mat-icon>
                    <span>{{ element.bottleType }}</span>
                  </div>
                </mat-cell>
              </ng-container>

              <!-- Brand Owner Column -->
              <ng-container matColumnDef="brandOwner">
                <mat-header-cell *matHeaderCellDef>Brand Owner</mat-header-cell>
                <mat-cell *matCellDef="let element" class="owner-cell">
                  <div class="owner-info">
                    <mat-icon class="owner-icon">business</mat-icon>
                    <span>{{ element.brandOwner }}</span>
                  </div>
                </mat-cell>
              </ng-container>

              <!-- Liquor Type Column -->
              <ng-container matColumnDef="liquorType">
                <mat-header-cell *matHeaderCellDef>Liquor Type</mat-header-cell>
                <mat-cell *matCellDef="let element" class="liquor-cell">
                  <span class="liquor-badge" [ngClass]="getLiquorTypeClass(element.liquorType)">
                    {{ element.liquorType }}
                  </span>
                </mat-cell>
              </ng-container>

              <!-- Manufacturing Unit Column -->
              <ng-container matColumnDef="manufacturingUnit">
                <mat-header-cell *matHeaderCellDef>Manufacturing Unit</mat-header-cell>
                <mat-cell *matCellDef="let element" class="manufacturing-cell">
                  <div class="manufacturing-info">
                    <mat-icon class="manufacturing-icon">factory</mat-icon>
                    <span>{{ element.manufacturingUnit }}</span>
                  </div>
                </mat-cell>
              </ng-container>

              <mat-header-row *matHeaderRowDef="displayedColumns" class="table-header-row"></mat-header-row>
              <mat-row *matRowDef="let row; columns: displayedColumns;" class="table-data-row"></mat-row>
            </mat-table>
          </div>
        </div>
      </div>

      <div class="dialog-footer" [@fadeInUp]="'in'" style="animation-delay: 0.4s;">
        <div class="footer-info">
          <mat-icon>info</mat-icon>
          <span>All brand details are verified and up-to-date</span>
        </div>
        <div class="footer-actions">
          <button mat-button mat-dialog-close class="close-button">
            <mat-icon>close</mat-icon>
            Close
          </button>
          <button mat-raised-button color="primary" class="export-button">
            <mat-icon>file_download</mat-icon>
            Export Details
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .brand-details-dialog {
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      
      .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(135deg, #00bcd4 0%, #00acc1 50%, #0097a7 100%);
        color: white;
        padding: 20px 24px;
        margin: -24px -24px 0 -24px;
        box-shadow: 0 4px 8px rgba(0, 188, 212, 0.3);
        
        .header-content {
          display: flex;
          align-items: center;
          gap: 16px;
          
          .header-icon {
            font-size: 28px;
            width: 28px;
            height: 28px;
            animation: pulse 2s infinite;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          }
          
          h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
            text-shadow: 0 1px 2px rgba(0,0,0,0.2);
          }
        }
        
        .close-btn {
          color: white;
          transition: all 0.3s ease;
          background: rgba(255,255,255,0.1);
          border-radius: 50%;
          
          &:hover {
            transform: rotate(90deg) scale(1.1);
            background: rgba(255,255,255,0.2);
          }
        }
      }
      
      .dialog-body {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        
        .dialog-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding: 24px 0;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          margin: 0 -24px;
          padding-left: 24px;
          padding-right: 24px;
          
          .stat-card {
            background: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            border: 1px solid #e0e0e0;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            
            &::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 4px;
              background: linear-gradient(90deg, #2196f3, #00bcd4, #4caf50);
            }
            
            &:hover {
              transform: translateY(-4px);
              box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            }
            
            .stat-label {
              font-size: 11px;
              color: #666;
              font-weight: 600;
              margin-bottom: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .stat-value {
              font-size: 28px;
              font-weight: 700;
              
              &.ref-number {
                color: #1976d2;
                text-shadow: 0 1px 2px rgba(25, 118, 210, 0.2);
              }
              
              &.total-products {
                color: #388e3c;
                text-shadow: 0 1px 2px rgba(56, 142, 60, 0.2);
              }
              
              &.total-cases {
                color: #00acc1;
                text-shadow: 0 1px 2px rgba(0, 172, 193, 0.2);
              }
            }
          }
        }
        
        .table-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          margin: 20px 0;
          
          .table-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding: 0 4px;
            
            h3 {
              margin: 0;
              color: #333;
              font-size: 18px;
              font-weight: 600;
              display: flex;
              align-items: center;
              gap: 8px;
              
              &::before {
                content: '';
                width: 4px;
                height: 20px;
                background: linear-gradient(135deg, #2196f3, #00bcd4);
                border-radius: 2px;
              }
            }
            
            .table-actions {
              display: flex;
              gap: 8px;
              
              button {
                color: #666;
                transition: all 0.3s ease;
                
                &:hover {
                  color: #2196f3;
                  transform: scale(1.1);
                }
              }
            }
          }
          
          .table-wrapper {
            flex: 1;
            overflow: auto;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            border: 1px solid #e0e0e0;
            
            .brand-table {
              width: 100%;
              
              .table-header-row {
                background: linear-gradient(135deg, #37474f 0%, #455a64 100%);
                
                .mat-mdc-header-cell {
                  color: white;
                  font-weight: 600;
                  font-size: 13px;
                  padding: 16px 12px;
                  border-right: 1px solid #546e7a;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  
                  &:last-child {
                    border-right: none;
                  }
                  
                  &.serial-header {
                    width: 60px;
                    text-align: center;
                  }
                }
              }
              
              .table-data-row {
                transition: all 0.3s ease;
                border-bottom: 1px solid #f0f0f0;
                
                &:hover {
                  background-color: #f8f9fa;
                  transform: scale(1.01);
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                
                &:nth-child(even) {
                  background-color: #fafafa;
                }
                
                .mat-mdc-cell {
                  padding: 16px 12px;
                  font-size: 13px;
                  border-right: 1px solid #f0f0f0;
                  
                  &:last-child {
                    border-right: none;
                  }
                }
              }
              
              .serial-cell {
                text-align: center;
                
                .serial-number {
                  background: linear-gradient(135deg, #2196f3, #1976d2);
                  color: white;
                  width: 28px;
                  height: 28px;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: 600;
                  font-size: 12px;
                  margin: 0 auto;
                  box-shadow: 0 2px 4px rgba(33, 150, 243, 0.3);
                }
              }
              
              .brand-cell {
                .brand-info {
                  .brand-name {
                    color: #1976d2;
                    font-weight: 600;
                    font-size: 14px;
                    margin-bottom: 2px;
                  }
                  
                  .brand-subtitle {
                    color: #666;
                    font-size: 11px;
                    font-style: italic;
                  }
                }
              }
              
              .size-cell, .cases-cell {
                .size-container, .cases-container {
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  
                  .size-icon, .cases-icon {
                    font-size: 16px;
                    width: 16px;
                    height: 16px;
                    color: #666;
                  }
                }
              }
              
              .size-badge {
                background: linear-gradient(135deg, #e3f2fd, #bbdefb);
                color: #1976d2;
                padding: 6px 12px;
                border-radius: 16px;
                font-size: 11px;
                font-weight: 600;
                border: 1px solid #2196f3;
                transition: all 0.3s ease;
                
                &:hover {
                  background: linear-gradient(135deg, #1976d2, #1565c0);
                  color: white;
                  transform: scale(1.05);
                }
              }
              
              .cases-badge {
                background: linear-gradient(135deg, #e8f5e8, #c8e6c9);
                color: #2e7d32;
                padding: 6px 12px;
                border-radius: 16px;
                font-size: 11px;
                font-weight: 600;
                border: 1px solid #4caf50;
                transition: all 0.3s ease;
                
                &:hover {
                  background: linear-gradient(135deg, #2e7d32, #1b5e20);
                  color: white;
                  transform: scale(1.05);
                }
              }
              
              .bottle-cell, .owner-cell, .manufacturing-cell {
                .bottle-info, .owner-info, .manufacturing-info {
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  
                  .bottle-icon, .owner-icon, .manufacturing-icon {
                    font-size: 16px;
                    width: 16px;
                    height: 16px;
                    color: #666;
                  }
                }
              }
              
              .liquor-badge {
                padding: 6px 12px;
                border-radius: 16px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                
                &.whisky {
                  background: linear-gradient(135deg, #fff3e0, #ffe0b2);
                  color: #f57c00;
                  border: 1px solid #ff9800;
                }
                
                &.brandy {
                  background: linear-gradient(135deg, #fce4ec, #f8bbd9);
                  color: #c2185b;
                  border: 1px solid #e91e63;
                }
                
                &.rum {
                  background: linear-gradient(135deg, #efebe9, #d7ccc8);
                  color: #5d4037;
                  border: 1px solid #795548;
                }
              }
            }
          }
        }
      }
      
      .dialog-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 0 0 0;
        border-top: 2px solid #f0f0f0;
        background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
        margin: 0 -24px -24px -24px;
        padding: 20px 24px;
        
        .footer-info {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #666;
          font-size: 13px;
          
          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
            color: #4caf50;
          }
        }
        
        .footer-actions {
          display: flex;
          gap: 12px;
          
          .close-button, .export-button {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 8px;
            transition: all 0.3s ease;
            
            &:hover {
              transform: translateY(-2px);
            }
            
            mat-icon {
              font-size: 18px;
              width: 18px;
              height: 18px;
            }
          }
          
          .export-button {
            box-shadow: 0 4px 8px rgba(33, 150, 243, 0.3);
            
            &:hover {
              box-shadow: 0 6px 12px rgba(33, 150, 243, 0.4);
            }
          }
        }
      }
    }
    
    @keyframes pulse {
      0% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
      100% {
        transform: scale(1);
      }
    }
    
    @keyframes fadeInUp {
      0% {
        opacity: 0;
        transform: translateY(30px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @media (max-width: 768px) {
      .brand-details-dialog {
        .dialog-body .dialog-stats {
          grid-template-columns: 1fr;
          gap: 16px;
        }
        
        .table-container .table-wrapper {
          .brand-table {
            min-width: 900px;
          }
        }
        
        .dialog-footer {
          flex-direction: column;
          gap: 16px;
          align-items: stretch;
          
          .footer-actions {
            justify-content: center;
          }
        }
      }
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
    return liquorType.toLowerCase().replace(/\s+/g, '-');
  }
}
