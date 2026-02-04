import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HologramDataService } from '../../licensee/supplyChain/services/hologram-data.service';
import { AccountService } from '../../../core/services/account.service';
import { DashboardStatisticsComponent } from '../../../shared/components/dashboard-statistics/dashboard-statistics.component';
import { UnifiedActionButtonsComponent } from '../../../shared/components/unified-action-buttons/unified-action-buttons.component';
import { UnifiedActionsService } from '../../../shared/services/unified-actions.service';

interface ITCellData {
  id?: number;
  referenceNo: string;
  submissionDate: string;
  companyName: string;
  status: string;
  amount: string;
  type: 'hologram';
  allowedActions?: string[];
  localQtyLakh?: number;
  exportQtyLakh?: number;
  defenceQtyLakh?: number;
}

@Component({
  selector: 'app-itcell-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DashboardStatisticsComponent,
    UnifiedActionButtonsComponent
  ],
  template: `
    <div class="itcell-dashboard">
      <!-- Dashboard Statistics -->
      <app-dashboard-statistics
        [statistics]="getDashboardStatistics()"
        [filterOptions]="getFilterOptions()"
        [showSelectionMessage]="!selectedApplicationType || selectedApplicationType === 'all'"
        (filterChange)="onDashboardFilterChange($event)">
      </app-dashboard-statistics>

      <!-- Data Table - Only show when a specific type is selected -->
      <div class="data-table-section" *ngIf="selectedApplicationType && selectedApplicationType !== 'all' && filteredApplications.length > 0">
        <div class="table-container">
          <table class="table table-striped table-hover">
            <thead class="table-dark">
              <tr>
                <th>Ref. No.</th>
                <th>Date</th>
                <th>Company Name</th>
                <th>Local Qty (Lakh)</th>
                <th>Export Qty (Lakh)</th>
                <th>Defence Qty (Lakh)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let application of getPaged()">
                <td>{{ application.referenceNo }}</td>
                <td>{{ application.submissionDate }}</td>
                <td>{{ application.companyName }}</td>
                <td>{{ application.localQtyLakh || 0 }}</td>
                <td>{{ application.exportQtyLakh || 0 }}</td>
                <td>{{ application.defenceQtyLakh || 0 }}</td>
                <td>
                  <span class="badge" [ngClass]="getStatusClass(application.status)">
                    {{ application.status }}
                  </span>
                </td>
                <td>
                  <app-unified-action-buttons
                    [item]="application"
                    [itemType]="'hologram'"
                    [context]="'itcell'"
                    (actionClicked)="onUnifiedAction($event)">
                  </app-unified-action-buttons>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination-section" *ngIf="getTotalPages() > 1">
          <nav>
            <ul class="pagination justify-content-center">
              <li class="page-item" [class.disabled]="currentPage === 1">
                <button class="page-link" (click)="goToPage(currentPage - 1)">Previous</button>
              </li>
              <li class="page-item" *ngFor="let page of getPageNumbers()" [class.active]="page === currentPage">
                <button class="page-link" (click)="goToPage(page)">{{ page }}</button>
              </li>
              <li class="page-item" [class.disabled]="currentPage === getTotalPages()">
                <button class="page-link" (click)="goToPage(currentPage + 1)">Next</button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <!-- Empty State for specific type with no data -->
      <div class="empty-state" *ngIf="selectedApplicationType && selectedApplicationType !== 'all' && filteredApplications.length === 0">
        <div class="empty-icon">
          <i class="bi bi-inbox"></i>
        </div>
        <h5>No {{ selectedApplicationType | titlecase }} Applications Found</h5>
        <p>There are no {{ selectedApplicationType }} applications requiring IT Cell verification at this time.</p>
      </div>
    </div>
  `,
  styles: [`
    .itcell-dashboard {
      padding: 1rem;
    }

    .data-table-section {
      margin-top: 2rem;
    }

    .table-container {
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .table {
      margin-bottom: 0;
    }

    .table th {
      border-top: none;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .table td {
      vertical-align: middle;
      font-size: 0.875rem;
    }

    .badge {
      font-size: 0.75rem;
    }

    .pagination-section {
      margin-top: 1.5rem;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: #6b7280;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .empty-state h5 {
      margin-bottom: 0.5rem;
      color: #374151;
    }

    .empty-state p {
      margin-bottom: 0;
      font-size: 1rem;
    }
  `]
})
export class ITCellDashboardComponent implements OnInit {
  // Services
  public accountService = inject(AccountService);
  private router = inject(Router);
  private hologramService = inject(HologramDataService);
  private unifiedActionsService = inject(UnifiedActionsService);

  // Data properties
  allApplications: ITCellData[] = [];
  filteredApplications: ITCellData[] = [];
  selectedApplicationType: string = 'all';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;

  constructor() {}

  ngOnInit(): void {
    this.loadHologramApplications();
  }

  loadHologramApplications(): void {
    this.hologramService.getProcurements().subscribe({
      next: (data: any[]) => {
        const holograms: ITCellData[] = data
          .filter((item: any) => this.requiresITCellReview(item.status))
          .map((item: any) => ({
            id: item.id,
            referenceNo: item.refNo || `HOL-${item.id}`,
            submissionDate: this.formatDate(item.date),
            companyName: item.licenseeName || item.manufacturingUnit || 'N/A',
            status: item.status || 'SUBMITTED',
            amount: '0.00', // Holograms might not have amount
            type: 'hologram',
            allowedActions: item.allowedActions || item.allowed_actions || [],
            localQtyLakh: Number(item.localQty || 0),
            exportQtyLakh: Number(item.exportQty || 0),
            defenceQtyLakh: Number(item.defenceQty || 0)
          }));
        
        this.allApplications = holograms;
        this.applyFilters();
      },
      error: (error) => console.error('Error loading hologram applications:', error)
    });
  }

  private requiresITCellReview(status: string): boolean {
    const statusLower = status?.toLowerCase() || '';
    return statusLower.includes('submitted') || 
           statusLower.includes('under_it_cell_review') ||
           statusLower.includes('pending_verification');
  }

  private formatDate(dateValue: any): string {
    if (!dateValue) return '';
    try {
      return new Date(dateValue).toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      }).replace(/ /g, '-');
    } catch (e) {
      return dateValue.toString();
    }
  }

  // Dashboard statistics methods
  getDashboardStatistics() {
    return {
      applied: this.getStatusCount('SUBMITTED'),
      pending: this.getStatusCount('UNDER_IT_CELL_REVIEW') + this.getStatusCount('PENDING_VERIFICATION'),
      approved: this.getStatusCount('VERIFIED') + this.getStatusCount('FORWARDED_TO_COMMISSIONER'),
      rejected: this.getStatusCount('REJECTED')
    };
  }

  getFilterOptions() {
    return [
      { value: 'all', label: 'All Applications' },
      { value: 'hologram', label: 'Hologram Applications' }
    ];
  }

  onDashboardFilterChange(filterValue: string): void {
    this.selectedApplicationType = filterValue;
    this.applyFilters();
  }

  private applyFilters(): void {
    if (this.selectedApplicationType === 'all') {
      this.filteredApplications = [...this.allApplications];
    } else {
      this.filteredApplications = this.allApplications.filter(app => app.type === this.selectedApplicationType);
    }
    this.currentPage = 1;
  }

  private getStatusCount(status: string): number {
    return this.allApplications.filter(app => 
      app.status.toLowerCase().includes(status.toLowerCase())
    ).length;
  }

  // Unified action handler
  onUnifiedAction(event: {action: string, item: any}): void {
    this.unifiedActionsService.executeAction(
      event.action, 
      event.item, 
      'hologram', 
      'itcell'
    ).subscribe({
      next: (result: any) => {
        if (result.success) {
          if (result.message) {
            alert(result.message);
          }
          if (['VERIFY', 'FORWARD', 'REJECT'].includes(event.action)) {
            this.loadHologramApplications();
          }
        } else {
          alert(`Action failed: ${result.message}`);
        }
      },
      error: (error: any) => {
        console.error('Action failed:', error);
        alert(`Action failed: ${error.message || 'Unknown error'}`);
      }
    });
  }

  // Utility methods
  getStatusClass(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('verified') || statusLower.includes('forwarded')) return 'bg-success';
    if (statusLower.includes('rejected')) return 'bg-danger';
    if (statusLower.includes('submitted') || statusLower.includes('pending')) return 'bg-warning';
    if (statusLower.includes('under_review')) return 'bg-info';
    return 'bg-secondary';
  }

  // Pagination methods
  getTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredApplications.length / this.pageSize));
  }

  getPaged(): ITCellData[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredApplications.slice(start, start + this.pageSize);
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
    }
  }
}