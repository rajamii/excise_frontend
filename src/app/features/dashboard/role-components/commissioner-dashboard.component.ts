import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupplyChainService } from '../../licensee/supplyChain/services/supplychain.service';
import { EnaRequisitionService } from '../../../core/services/ena-requisition.service';
import { HologramDataService } from '../../licensee/supplyChain/services/hologram-data.service';
import { AccountService } from '../../../core/services/account.service';
import { DashboardStatisticsComponent } from '../../../shared/components/dashboard-statistics/dashboard-statistics.component';
import { UnifiedActionButtonsComponent } from '../../../shared/components/unified-action-buttons/unified-action-buttons.component';
import { UnifiedActionsService } from '../../../shared/services/unified-actions.service';

interface CommissionerData {
  id?: number;
  referenceNo: string;
  submissionDate: string;
  distilleryName: string;
  status: string;
  amount: string;
  type: 'requisition' | 'revalidation' | 'transit' | 'hologram';
  localQtyLakh?: number;
  exportQtyLakh?: number;
  defenceQtyLakh?: number;
  totalQtyLakh?: number;
  allowedActions?: string[];
  allowedActionConfigs?: any[];
  workflowId?: number;
  currentStage?: number;
  payment_details?: any;
  editHistory?: {
    editedBy?: string;
    editedDate?: string;
    originalQuantities?: { local?: number; export?: number; defence?: number; total?: number };
    updatedQuantities?: { local?: number; export?: number; defence?: number; total?: number };
    originalPayment?: number;
    updatedPayment?: number;
  };
  edit_history?: {
    editedBy?: string;
    editedDate?: string;
    originalQuantities?: { local?: number; export?: number; defence?: number; total?: number };
    updatedQuantities?: { local?: number; export?: number; defence?: number; total?: number };
    originalPayment?: number;
    updatedPayment?: number;
  };
}

@Component({
  selector: 'app-commissioner-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DashboardStatisticsComponent,
    UnifiedActionButtonsComponent
  ],
  template: `
    <div class="commissioner-dashboard">
      <ng-container *ngIf="embeddedHologramOnly; else fullDashboard">
        <div class="hologram-register-table">
          <div class="register-container">
             <div class="holo-stat-cards" *ngIf="embeddedHologramOnly">
               <div
                 class="holo-stat-card total"
                 role="button"
                 tabindex="0"
                 (click)="setHologramStatusSummary('ALL')"
                 (keydown.enter)="setHologramStatusSummary('ALL')"
                 (keydown.space)="setHologramStatusSummary('ALL')"
                 [class.active]="hologramStatusSummary === 'ALL'">
                 <div class="holo-stat-icon"><i class="bi bi-list-ul"></i></div>
                 <div class="holo-stat-content">
                   <div class="holo-stat-number">{{ getHologramSummaryCount('ALL') }}</div>
                   <div class="holo-stat-label">TOTAL</div>
                 </div>
               </div>
               <div
                 class="holo-stat-card pending"
                 role="button"
                 tabindex="0"
                 (click)="setHologramStatusSummary('UNDER_PROCESS')"
                 (keydown.enter)="setHologramStatusSummary('UNDER_PROCESS')"
                 (keydown.space)="setHologramStatusSummary('UNDER_PROCESS')"
                 [class.active]="hologramStatusSummary === 'UNDER_PROCESS'">
                 <div class="holo-stat-icon"><i class="bi bi-clock"></i></div>
                 <div class="holo-stat-content">
                   <div class="holo-stat-number">{{ getHologramSummaryCount('UNDER_PROCESS') }}</div>
                   <div class="holo-stat-label">UNDER PROCESS</div>
                 </div>
               </div>
               <div
                 class="holo-stat-card approved"
                 role="button"
                 tabindex="0"
                 (click)="setHologramStatusSummary('APPROVED')"
                 (keydown.enter)="setHologramStatusSummary('APPROVED')"
                 (keydown.space)="setHologramStatusSummary('APPROVED')"
                 [class.active]="hologramStatusSummary === 'APPROVED'">
                 <div class="holo-stat-icon"><i class="bi bi-check-circle"></i></div>
                 <div class="holo-stat-content">
                   <div class="holo-stat-number">{{ getHologramSummaryCount('APPROVED') }}</div>
                   <div class="holo-stat-label">APPROVED</div>
                 </div>
               </div>
               <div
                 class="holo-stat-card rejected"
                 role="button"
                 tabindex="0"
                 (click)="setHologramStatusSummary('REJECTED')"
                 (keydown.enter)="setHologramStatusSummary('REJECTED')"
                 (keydown.space)="setHologramStatusSummary('REJECTED')"
                 [class.active]="hologramStatusSummary === 'REJECTED'">
                 <div class="holo-stat-icon"><i class="bi bi-x-circle"></i></div>
                 <div class="holo-stat-content">
                   <div class="holo-stat-number">{{ getHologramSummaryCount('REJECTED') }}</div>
                   <div class="holo-stat-label">REJECTED</div>
                 </div>
               </div>
             </div>

             <div class="filter-bar" *ngIf="allApplications.length > 0">
               <div class="filter-item">
                 <label class="filter-label">Date</label>
                 <input
                  type="date"
                  class="form-control form-control-sm"
                  [(ngModel)]="hologramDateFilter"
                  (change)="applyFilters()"
                  title="Filter by date">
              </div>
              <div class="filter-item">
                <label class="filter-label">Month</label>
                <input
                  type="month"
                  class="form-control form-control-sm"
                  [(ngModel)]="hologramMonthFilter"
                  (change)="applyFilters()"
                  title="Filter by month">
              </div>
              <div class="filter-item">
                <label class="filter-label">Company</label>
                <select class="form-select form-select-sm" [(ngModel)]="selectedCompany" (ngModelChange)="applyFilters()">
                  <option value="">All Companies</option>
                  <option *ngFor="let c of companyOptions" [value]="c">{{ c }}</option>
                </select>
              </div>
              <button
                class="btn btn-outline-danger btn-sm"
                (click)="clearHologramFilters()"
                *ngIf="selectedCompany || hologramMonthFilter || hologramDateFilter || hologramStatusSummary !== 'ALL'">
                <i class="bi bi-x-circle me-1"></i>Clear
              </button>

              <span class="entries-count entries-count--inline">
                {{ filteredApplications.length }} Applications
              </span>
            </div>

            <div class="table-responsive" *ngIf="filteredApplications.length > 0">
              <table class="table register-table">
                <thead>
                  <tr>
                    <th class="sl-no">Sl. No.</th>
                    <th class="ref-number">Ref. No</th>
                    <th class="submission-date">Date</th>
                    <th class="company-name">Company</th>
                    <th class="total-qty">Total Qty</th>
                    <th class="status">Status</th>
                    <th class="actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let application of getPaged(); let i = index" class="register-row">
                    <td class="sl-no">{{ (currentPage - 1) * pageSize + i + 1 }}</td>
                    <td class="ref-number">{{ application.referenceNo }}</td>
                    <td class="submission-date">{{ application.submissionDate }}</td>
                    <td class="company-name">{{ application.distilleryName }}</td>
                    <td class="total-qty">
                      <div class="d-flex align-items-center gap-2">
                        <span class="qty-value total">{{ application.totalQtyLakh || 0 | number:'1.1-1' }}</span>
                        <button
                          type="button"
                          class="btn btn-outline-info details-btn"
                          title="View Quantity Breakdown"
                          (click)="openHologramQtyDetails(application)">
                          <i class="bi bi-info-circle me-1"></i>Details
                        </button>
                      </div>
                    </td>
                    <td class="status">
                      <span class="status-badge" [ngClass]="getStatusClass(application.status)" [class.text-white]="getStatusClass(application.status) === 'bg-success'">
                        {{ application.status }}
                      </span>
                    </td>
                    <td class="actions actions-cell">
                      <app-unified-action-buttons
                        [item]="application"
                        [itemType]="'hologram'"
                        [context]="'commissioner'"
                        [displayMode]="'table'"
                        [includeActions]="['VIEW']"
                        (actionClicked)="onUnifiedAction($event)">
                      </app-unified-action-buttons>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="empty-state" *ngIf="filteredApplications.length === 0">
              <div class="empty-icon"><i class="bi bi-journal-x"></i></div>
              <h5 class="empty-title">No Hologram Applications Found</h5>
              <p class="empty-message">No hologram applications are available for review.</p>
            </div>
          </div>
        </div>

        <div class="holo-popup-backdrop" *ngIf="selectedHologramDetails" (click)="closeHologramQtyDetails()">
          <div class="holo-popup-card" (click)="$event.stopPropagation()">
            <div class="holo-popup-header">
              <div class="holo-popup-title">
                <i class="bi bi-eye me-2"></i>Hologram Request Details
              </div>
              <button type="button" class="holo-popup-close" (click)="closeHologramQtyDetails()">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>

            <div class="holo-popup-body" *ngIf="selectedHologramDetails as d">
              <div class="holo-tags">
                <span class="holo-tag ref">Ref: {{ d.referenceNo }}</span>
                <span class="holo-tag date">Date: {{ d.submissionDate }}</span>
                <span class="holo-tag company">{{ d.distilleryName }}</span>
              </div>

              <div class="holo-grid">
                <div class="holo-panel">
                  <div class="holo-panel-title series">Series</div>
                  <table class="table table-sm mb-0">
                    <tbody>
                      <tr>
                        <td>Local</td>
                        <td class="text-end fw-bold" *ngIf="!isHologramEditMode">{{ d.localQtyLakh || 0 | number:'1.0-0' }} pieces</td>
                        <td class="text-end fw-bold" *ngIf="isHologramEditMode">
                          <input
                            type="number"
                            min="0"
                            class="form-control form-control-sm text-end d-inline-block"
                            style="max-width: 140px;"
                            [(ngModel)]="hologramEditForm.localQty">
                        </td>
                      </tr>
                      <tr *ngIf="(d.exportQtyLakh || 0) > 0">
                        <td>Export</td>
                        <td class="text-end fw-bold" *ngIf="!isHologramEditMode">{{ d.exportQtyLakh || 0 | number:'1.0-0' }} pieces</td>
                        <td class="text-end fw-bold" *ngIf="isHologramEditMode">
                          <input
                            type="number"
                            min="0"
                            class="form-control form-control-sm text-end d-inline-block"
                            style="max-width: 140px;"
                            [(ngModel)]="hologramEditForm.exportQty">
                        </td>
                      </tr>
                      <tr *ngIf="(d.defenceQtyLakh || 0) > 0">
                        <td>Defence</td>
                        <td class="text-end fw-bold" *ngIf="!isHologramEditMode">{{ d.defenceQtyLakh || 0 | number:'1.0-0' }} pieces</td>
                        <td class="text-end fw-bold" *ngIf="isHologramEditMode">
                          <input
                            type="number"
                            min="0"
                            class="form-control form-control-sm text-end d-inline-block"
                            style="max-width: 140px;"
                            [(ngModel)]="hologramEditForm.defenceQty">
                        </td>
                      </tr>
                      <tr>
                        <td class="fw-bold">Total</td>
                        <td class="text-end fw-bold text-primary" *ngIf="!isHologramEditMode">{{ d.totalQtyLakh || 0 | number:'1.0-0' }} pieces</td>
                        <td class="text-end fw-bold text-primary" *ngIf="isHologramEditMode">{{ getEditedHologramTotal() | number:'1.0-0' }} pieces</td>
                      </tr>
                    </tbody>
                  </table>
                  <div class="px-2 pb-2" *ngIf="hologramEditSummary">
                    <div class="alert alert-warning py-2 mb-0 small">
                      <strong>Commissioner Change Summary:</strong><br>
                      Qty: {{ hologramEditSummary.beforeQty | number:'1.0-0' }} -> {{ hologramEditSummary.afterQty | number:'1.0-0' }}<br>
                      Amount: ₹{{ hologramEditSummary.beforeAmount | number:'1.2-2' }} -> ₹{{ hologramEditSummary.afterAmount | number:'1.2-2' }}
                    </div>
                  </div>
                </div>

                <div class="holo-panel">
                  <div class="holo-panel-title payment"><i class="bi bi-currency-rupee me-1"></i>Payment Calculation</div>
                  <table class="table table-sm mb-2">
                    <thead>
                      <tr>
                        <th>Payment Type</th>
                        <th class="text-end">Rate</th>
                        <th class="text-end">Qty</th>
                        <th class="text-end">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <div class="fw-bold">Wallet Payment</div>
                          <div class="text-muted small">(Online Payment - After Approval)</div>
                        </td>
                        <td class="text-end">&#8377;0.15</td>
                        <td class="text-end">{{ d.totalQtyLakh || 0 | number:'1.0-0' }}</td>
                        <td class="text-end fw-bold text-success">&#8377;{{ getHologramPopupAmount(d) | number:'1.2-2' }}</td>
                      </tr>
                      <tr *ngIf="hologramEditSummary">
                        <td><span class="fw-bold text-warning">Before Edit</span></td>
                        <td class="text-end">&#8377;0.15</td>
                        <td class="text-end">{{ hologramEditSummary.beforeQty | number:'1.0-0' }}</td>
                        <td class="text-end fw-bold text-warning">&#8377;{{ hologramEditSummary.beforeAmount | number:'1.2-2' }}</td>
                      </tr>
                      <tr *ngIf="hologramEditSummary">
                        <td><span class="fw-bold text-success">After Edit</span></td>
                        <td class="text-end">&#8377;0.15</td>
                        <td class="text-end">{{ hologramEditSummary.afterQty | number:'1.0-0' }}</td>
                        <td class="text-end fw-bold text-success">&#8377;{{ hologramEditSummary.afterAmount | number:'1.2-2' }}</td>
                      </tr>
                    </tbody>
                  </table>
                  
                  <div class="alert alert-info py-2 mb-0 small">
                    <i class="bi bi-info-circle me-1"></i><strong>Payment Process:</strong>
                    <ol class="mb-0 mt-1">
                      <li>Review and approve the hologram application</li>
                      <li>After approval, supply chain user can make wallet payment (&#8377;0.15/hologram)</li>
                      <li>Payment will be processed online from Excise/Additional Wallet Balance</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div class="holo-bottom-grid">
                <div class="holo-bottom-panel">
                  <h6 class="text-primary mb-2"><i class="bi bi-info-circle me-1"></i>Status Information</h6>
                  <p class="mb-1"><strong>Current Status:</strong>
                    <span class="badge bg-primary ms-1">{{ d.status }}</span>
                  </p>
                  <p class="mb-0"><strong>Submitted Date:</strong> {{ d.submissionDate }}</p>
                </div>
                <div class="holo-bottom-panel">
                  <h6 class="text-success mb-2"><i class="bi bi-clipboard-check me-1"></i>Additional Information</h6>
                  <p class="mb-0">Verified and approved by IT Cells. Upload slip enabled for supply chain user.</p>
                </div>
              </div>

              <div class="text-end mt-3">
                <button
                  type="button"
                  class="btn btn-outline-primary btn-sm me-2"
                  *ngIf="canEditHologramDetails(d) && !isHologramEditMode"
                  (click)="startHologramEdit(d, $event)">
                  <i class="bi bi-pencil-square me-1"></i>Edit Quantity
                </button>
                <button
                  type="button"
                  class="btn btn-success btn-sm me-2"
                  *ngIf="isHologramEditMode"
                  (click)="saveHologramEdit(d)">
                  <i class="bi bi-check2-circle me-1"></i>Save Changes
                </button>
                <button
                  type="button"
                  class="btn btn-outline-warning btn-sm me-2"
                  *ngIf="isHologramEditMode"
                  (click)="cancelHologramEdit()">
                  <i class="bi bi-arrow-counterclockwise me-1"></i>Cancel Edit
                </button>
                <button type="button" class="btn btn-outline-secondary btn-sm" (click)="closeHologramQtyDetails()">
                  <i class="bi bi-x-circle me-1"></i>Close
                </button>
              </div>
            </div>
          </div>
        </div>

      </ng-container>

      <ng-template #fullDashboard>
      <!-- Dashboard Statistics -->
      <app-dashboard-statistics
        [statistics]="getDashboardStatistics()">
      </app-dashboard-statistics>

       <!-- Data Table -->
        <div class="data-table-section" *ngIf="false">
          <div class="filter-bar" *ngIf="filteredApplications.length > 0">
            <div class="filter-item">
              <label class="filter-label">Company</label>
              <select class="form-select form-select-sm" [(ngModel)]="selectedCompany" (ngModelChange)="applyFilters()">
                <option value="">All Companies</option>
               <option *ngFor="let c of companyOptions" [value]="c">{{ c }}</option>
             </select>
           </div>
           <button
              class="btn btn-outline-danger btn-sm"
              (click)="clearCompanyFilter()"
              *ngIf="selectedCompany">
              <i class="bi bi-x-circle me-1"></i>Clear
            </button>
          </div>
        <div class="table-container">
          <table class="table table-striped table-hover">
            <thead class="table-dark">
              <tr>
                <th>Ref. No.</th>
                <th>Submission Date</th>
                <th>Distillery Name</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let application of getPaged()">
                <td>{{ application.referenceNo }}</td>
                <td>{{ application.submissionDate }}</td>
                <td>{{ application.distilleryName }}</td>
                <td>
                  <span class="badge" [ngClass]="getStatusClass(application.status)" [class.text-white]="getStatusClass(application.status) === 'bg-success'">
                    {{ application.status }}
                  </span>
                </td>
                <td>₹{{ application.amount }}</td>
                <td>
                  <span class="badge bg-info">{{ application.type | titlecase }}</span>
                </td>
                <td>
                  <app-unified-action-buttons
                    [item]="application"
                    [itemType]="application.type"
                    [context]="'commissioner'"
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

      <!-- Empty State -->
      <div class="empty-state" *ngIf="false">
        <div class="empty-icon">
          <i class="bi bi-inbox"></i>
        </div>
        <h5>No Applications Found</h5>
        <p>There are no applications requiring commissioner review at this time.</p>
      </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .commissioner-dashboard {
      padding: 1rem;
    }

    .filter-bar {
      display: flex;
      align-items: end;
      justify-content: flex-start !important;
      flex-wrap: wrap;
      gap: 12px;
      padding: 10px 12px;
      width: 100%;
      flex: 1 1 100%;
      border: 1px solid #e5e7eb;
      border-top: 0;
      background: #f8fafc;
    }

    .holo-stat-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      padding: 12px;
      border: 1px solid #e5e7eb;
      border-top: 0;
      background: #ffffff;
    }

    .holo-stat-card {
      background: #ffffff;
      border-radius: 10px;
      padding: 12px 14px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
      display: flex;
      align-items: center;
      gap: 12px;
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
      cursor: pointer;
      user-select: none;
      position: relative;
      overflow: hidden;
    }

    .holo-stat-card::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      transform: scaleX(0);
      transform-origin: left;
      transition: transform 0.2s ease;
    }

    .holo-stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 14px rgba(0, 0, 0, 0.12);
    }

    .holo-stat-card:hover::after,
    .holo-stat-card.active::after {
      transform: scaleX(1);
    }

    .holo-stat-card.active {
      border-color: rgba(59, 130, 246, 0.55);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15), 0 6px 14px rgba(0, 0, 0, 0.12);
    }

    .holo-stat-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 1.15rem;
      flex: 0 0 44px;
    }

    .holo-stat-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .holo-stat-number {
      font-size: 1.4rem;
      font-weight: 800;
      line-height: 1;
      color: #1f2937;
    }

    .holo-stat-label {
      font-size: 0.78rem;
      font-weight: 700;
      color: #6b7280;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .holo-stat-card.total .holo-stat-icon {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    }
    .holo-stat-card.total::after {
      background: linear-gradient(90deg, #3b82f6, #1d4ed8);
    }

    .holo-stat-card.pending .holo-stat-icon {
      background: linear-gradient(135deg, #f59e0b, #d97706);
    }
    .holo-stat-card.pending::after {
      background: linear-gradient(90deg, #f59e0b, #d97706);
    }

    .holo-stat-card.approved .holo-stat-icon {
      background: linear-gradient(135deg, #10b981, #059669);
    }
    .holo-stat-card.approved::after {
      background: linear-gradient(90deg, #10b981, #059669);
    }

    .holo-stat-card.rejected .holo-stat-icon {
      background: linear-gradient(135deg, #ef4444, #dc2626);
    }
    .holo-stat-card.rejected::after {
      background: linear-gradient(90deg, #ef4444, #dc2626);
    }

    .filter-item {
      display: flex;
      flex-direction: column;
      min-width: 180px;
    }

    .filter-label {
      font-size: 0.8rem;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 6px;
    }

    .entries-count--inline {
      margin-left: auto;
      align-self: center;
      flex: 0 0 auto;
      white-space: nowrap;
    }

    .data-table-section {
      margin-top: 2rem;
    }

    .register-container {
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }

    .register-header-bar {
      background: #fff;
      color: #111827;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #e5e7eb;
    }

    .register-table-title {
      margin: 0;
      font-weight: 700;
      font-size: 1.25rem;
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }

    .entries-count {
      background: #111827;
      color: #fff;
      border-radius: 999px;
      padding: 6px 14px;
      font-weight: 600;
      font-size: 0.95rem;
    }

    .register-table th,
    .register-table td {
      vertical-align: middle;
      font-size: 0.95rem;
      border-color: #dbe2ea;
    }

    /* Dark header background for all columns */
    .register-table thead th {
      background: #111827;
      color: #fff;
      border-color: #111827;
    }

    .qty-value.total {
      color: #059669;
      font-weight: 700;
    }

    .actions-cell {
      min-width: 140px;
      white-space: nowrap;
      text-align: center;
    }

    .details-btn { padding: 2px 8px; font-size: 0.8rem; }

    .holo-popup-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(17, 24, 39, 0.45);
      z-index: 1200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .holo-popup-card {
      width: min(940px, 96vw);
      max-height: 92vh;
      overflow: auto;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
    }

    .holo-popup-header {
      background: #1f6fe5;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
    }

    .holo-popup-title { font-weight: 700; }
    .holo-popup-close {
      border: 0;
      background: transparent;
      color: #fff;
      font-size: 1rem;
    }

    .holo-popup-body { padding: 14px; }
    .holo-tags { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
    .holo-tag { border-radius: 6px; padding: 4px 8px; font-size: 0.8rem; font-weight: 600; color: #fff; }
    .holo-tag.ref { background: #6b7280; }
    .holo-tag.date { background: #22b8cf; }
    .holo-tag.company { background: #22a06b; }

    .holo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .holo-panel { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #fff; }
    .holo-panel-title { padding: 8px 12px; font-weight: 700; }
    .holo-panel-title.series { background: #d5ede3; color: #0f766e; }
    .holo-panel-title.payment { background: #ffca2c; color: #1f2937; }

    .holo-bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
    .holo-bottom-panel { background: #f8fafc; border-radius: 8px; padding: 12px; border: 1px solid #edf2f7; }

    @media (max-width: 900px) {
      .holo-grid, .holo-bottom-grid { grid-template-columns: 1fr; }
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
export class CommissionerDashboardComponent implements OnInit {
  @Input() embeddedHologramOnly = false;

  // Services
  public accountService = inject(AccountService);
  private router = inject(Router);
  private enaRequisitionService = inject(EnaRequisitionService);
  private supplyChainService = inject(SupplyChainService);
  private hologramDataService = inject(HologramDataService);
  private unifiedActionsService = inject(UnifiedActionsService);

  // Data properties
  allApplications: CommissionerData[] = [];
  filteredApplications: CommissionerData[] = [];
  selectedApplicationType: string = 'all';
  selectedCompany: string = '';
  companyOptions: string[] = [];
  hologramMonthFilter: string = '';
  hologramDateFilter: string = '';
  hologramStatusSummary: 'ALL' | 'UNDER_PROCESS' | 'APPROVED' | 'REJECTED' = 'ALL';
  private currentRoleId: number = 0;
  private currentRoleName: string = '';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  selectedHologramDetails: CommissionerData | null = null;
  isHologramEditMode = false;
  hologramEditForm: { localQty: number; exportQty: number; defenceQty: number } = {
    localQty: 0,
    exportQty: 0,
    defenceQty: 0
  };
  hologramEditSummary: { beforeQty: number; afterQty: number; beforeAmount: number; afterAmount: number } | null = null;

  constructor() {}

  ngOnInit(): void {
    console.log('🎯 Commissioner Dashboard (role-components) initialized');
    this.resolveCurrentUserRole();
    if (this.embeddedHologramOnly) {
      this.selectedApplicationType = 'hologram';
      this.loadHolograms();
    } else {
      console.log('📊 Loading all applications for Commissioner review...');
      this.loadAllApplications();
    }
  }

  private resolveCurrentUserRole(): void {
    try {
      const storedRoleId = Number(localStorage.getItem('role_id') || 0);
      const storedRoleName = String(localStorage.getItem('role') || '');
      if (storedRoleId) this.currentRoleId = storedRoleId;
      if (storedRoleName) this.currentRoleName = storedRoleName;
    } catch {}

    this.accountService.identity().subscribe(user => {
      this.currentRoleId = Number(user?.role?.id || this.currentRoleId || 0);
      this.currentRoleName = String(
        (user as any)?.role?.name ||
        (user as any)?.role?.displayName ||
        this.currentRoleName ||
        ''
      );
    });
  }

  isDeputyCommissionerUser(): boolean {
    if (Number(this.currentRoleId || 0) === 12) return true;
    const normalized = String(this.currentRoleName || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    return normalized.includes('deputycommissioner');
  }

  loadAllApplications(): void {
    // Load all types of applications for commissioner review
    this.loadRequisitions();
    this.loadRevalidations();
    this.loadTransitPermits();
    this.loadHolograms();
  }

  loadRequisitions(): void {
    this.enaRequisitionService.getRequisitions().subscribe({
      next: (response: any) => {
        const data = Array.isArray(response) ? response : response?.results || [];
        const requisitions: CommissionerData[] = data
          .filter((item: any) => this.requiresCommissionerReview(item.status))
          .map((item: any) => ({
            id: item.id,
            referenceNo: item.ourRefNo || item.our_ref_no || `REQ-${item.id}`,
            submissionDate: this.formatDate(item.submissionDate || item.submission_date),
            distilleryName: item.distilleryName || item.distillery_name || 'N/A',
            status: item.status || 'PENDING',
            amount: item.amount || '0.00',
            type: 'requisition',
            allowedActions: item.allowedActions || item.allowed_actions || [],
            allowedActionConfigs: item.allowedActionConfigs || item.allowed_action_configs || [],
            workflowId: item.workflow || item.workflow_id || item.workflowId,
            currentStage: item.current_stage || item.currentStage || item.stage_id || item.stageId,
            editHistory: item.editHistory || item.edit_history || null,
            edit_history: item.edit_history || item.editHistory || null
          }));
        
        this.updateApplications('requisition', requisitions);
      },
      error: (error) => console.error('Error loading requisitions:', error)
    });
  }

  loadRevalidations(): void {
    this.supplyChainService.getRevalidationData().subscribe({
      next: (data: any[]) => {
        const revalidations: CommissionerData[] = data
          .filter((item: any) => this.requiresCommissionerReview(item.status))
          .map((item: any) => ({
            id: item.id,
            referenceNo: item.ourRefNo || item.our_ref_no || `REV-${item.id}`,
            submissionDate: this.formatDate(item.revalidationDate || item.revalidation_date),
            distilleryName: item.distilleryName || item.distillery_name || 'N/A',
            status: item.status || 'PENDING',
            amount: item.revalidationBrAmount || item.revalidation_br_amount || '0.00',
            type: 'revalidation',
            allowedActions: item.allowedActions || item.allowed_actions || [],
            allowedActionConfigs: item.allowedActionConfigs || item.allowed_action_configs || [],
            workflowId: item.workflow || item.workflow_id || item.workflowId,
            currentStage: item.current_stage || item.currentStage || item.stage_id || item.stageId,
            editHistory: item.editHistory || item.edit_history || null,
            edit_history: item.edit_history || item.editHistory || null
          }));
        
        this.updateApplications('revalidation', revalidations);
      },
      error: (error) => console.error('Error loading revalidations:', error)
    });
  }

  loadTransitPermits(): void {
    this.supplyChainService.getTransitPermits().subscribe({
      next: (data: any[]) => {
        const transits: CommissionerData[] = data
          .filter((item: any) => this.requiresCommissionerReview(item.status))
          .map((item: any) => ({
            id: item.id,
            referenceNo: item.billNo || item.bill_no || `TRP-${item.id}`,
            submissionDate: this.formatDate(item.date),
            distilleryName: item.soleDistributorName || item.sole_distributor_name || 'N/A',
            status: item.status || 'PENDING',
            amount: item.totalAmount || item.total_amount || '0.00',
            type: 'transit',
            allowedActions: item.allowedActions || item.allowed_actions || [],
            allowedActionConfigs: item.allowedActionConfigs || item.allowed_action_configs || [],
            workflowId: item.workflow || item.workflow_id || item.workflowId,
            currentStage: item.current_stage || item.currentStage || item.stage_id || item.stageId
          }));
        
        this.updateApplications('transit', transits);
      },
      error: (error) => console.error('Error loading transit permits:', error)
    });
  }

  loadHolograms(): void {
    console.log('Commissioner Dashboard: Loading hologram procurements...');
    this.hologramDataService.getProcurements().subscribe({
      next: (response: any) => {
        console.log('Commissioner Dashboard: Received hologram data:', response);
        const rows: any[] = Array.isArray(response)
          ? response
          : (response?.results || response?.data || []);

        const holograms: CommissionerData[] = rows
          .map((item: any) => ({
            id: item.id,
            referenceNo: item.refNo || item.ref_no || `HOL-${item.id}`,
            submissionDate: this.formatDate(item.date || item.created_at),
            distilleryName: item.licenseeName || item.licensee_name || item.manufacturingUnit || item.manufacturing_unit || 'N/A',
            status: item.status || 'PENDING',
            amount: this.calculateHologramAmount(item).toString(),
            type: 'hologram',
            localQtyLakh: Number(item.localQty || item.local_qty || 0),
            exportQtyLakh: Number(item.exportQty || item.export_qty || 0),
            defenceQtyLakh: Number(item.defenceQty || item.defence_qty || 0),
            totalQtyLakh:
              Number(item.localQty || item.local_qty || 0) +
              Number(item.exportQty || item.export_qty || 0) +
              Number(item.defenceQty || item.defence_qty || 0),
            allowedActions: item.allowedActions || item.allowed_actions || [],
            allowedActionConfigs: item.allowedActionConfigs || item.allowed_action_configs || [],
            workflowId: item.workflow || item.workflow_id || item.workflowId,
            currentStage: item.current_stage || item.currentStage || item.stage_id || item.stageId,
            payment_details: item.payment_details || null,
            editHistory: item.editHistory || item.edit_history || item?.payment_details?.edit_history || null,
            edit_history: item.edit_history || item.editHistory || item?.payment_details?.edit_history || null
          }));

        console.log(`Commissioner Dashboard: Mapped ${holograms.length} hologram applications`);
        this.updateApplications('hologram', holograms);
      },
      error: (error) => {
        console.error('Commissioner Dashboard: Error loading holograms:', error);
      }
    });
  }
  private calculateHologramAmount(item: any): number {
    const localQty = Number(item.localQty || item.local_qty || 0);
    const exportQty = Number(item.exportQty || item.export_qty || 0);
    const defenceQty = Number(item.defenceQty || item.defence_qty || 0);
    const total = localQty + exportQty + defenceQty;
    // Rate is 0.15 rupees per hologram piece
    return total * 0.15;
  }

  private requiresCommissionerReview(status: string): boolean {
    const statusLower = status?.toLowerCase() || '';
    return statusLower.includes('forwarded') || 
           statusLower.includes('commissioner') || 
           statusLower.includes('pending_commissioner') ||
           statusLower.includes('under_commissioner_review') ||
           statusLower.includes('pending') ||
           statusLower.includes('submitted') ||
           statusLower.includes('approved_by');
  }

  private updateApplications(type: string, newApplications: CommissionerData[]): void {
    this.allApplications = [
      ...this.allApplications.filter(p => p.type !== type),
      ...newApplications
    ];
    this.applyFilters();
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
      applied: this.getStatusCount('APPLIED') + this.getStatusCount('SUBMITTED'),
      pending: this.getStatusCount('PENDING') + this.getStatusCount('FORWARDED'),
      approved: this.getStatusCount('APPROVED') + this.getStatusCount('APPROVED_BY_COMMISSIONER'),
      rejected: this.getStatusCount('REJECTED') + this.getStatusCount('REJECTED_BY_COMMISSIONER')
    };
  }

  getFilterOptions() {
    return [
      { value: 'all', label: 'All Applications' },
      { value: 'requisition', label: 'Requisitions' },
      { value: 'revalidation', label: 'Revalidations' },
      { value: 'transit', label: 'Transit Permits' },
      { value: 'hologram', label: 'Holograms' }
    ];
  }

  onDashboardFilterChange(filterValue: string): void {
    this.selectedApplicationType = filterValue;
    this.applyFilters();
  }

  applyFilters(): void {
    const base =
      this.selectedApplicationType === 'all'
        ? [...this.allApplications]
        : this.allApplications.filter(app => app.type === this.selectedApplicationType);

    const isHologramView = this.embeddedHologramOnly || this.selectedApplicationType === 'hologram';
    let filteredBase = base;

    if (isHologramView && this.hologramStatusSummary !== 'ALL') {
      filteredBase = filteredBase.filter(app =>
        this.matchesHologramStatusSummary(app?.status || '', this.hologramStatusSummary)
      );
    }

    if (isHologramView && this.hologramMonthFilter) {
      filteredBase = filteredBase.filter(app => {
        const dt = this.parseSubmissionDate(app?.submissionDate || '');
        return dt ? this.toIsoMonth(dt) === this.hologramMonthFilter : false;
      });
    }

    if (isHologramView && this.hologramDateFilter) {
      filteredBase = filteredBase.filter(app => {
        const dt = this.parseSubmissionDate(app?.submissionDate || '');
        return dt ? this.toIsoDate(dt) === this.hologramDateFilter : false;
      });
    }

    this.companyOptions = Array.from(
      new Set(filteredBase.map(app => String(app?.distilleryName || '').trim()).filter(v => !!v))
    ).sort((a, b) => a.localeCompare(b));

    if (this.selectedCompany && !this.companyOptions.includes(this.selectedCompany)) {
      this.selectedCompany = '';
    }

    this.filteredApplications = this.selectedCompany
      ? filteredBase.filter(app => String(app?.distilleryName || '').trim() === this.selectedCompany)
      : filteredBase;

    this.currentPage = 1;
  }

  clearCompanyFilter(): void {
    this.selectedCompany = '';
    this.applyFilters();
  }

  clearHologramFilters(): void {
    this.selectedCompany = '';
    this.hologramMonthFilter = '';
    this.hologramDateFilter = '';
    this.hologramStatusSummary = 'ALL';
    this.applyFilters();
  }

  setHologramStatusSummary(value: 'ALL' | 'UNDER_PROCESS' | 'APPROVED' | 'REJECTED'): void {
    this.hologramStatusSummary = value;
    this.applyFilters();
  }

  getHologramSummaryCount(value: 'ALL' | 'UNDER_PROCESS' | 'APPROVED' | 'REJECTED'): number {
    const holograms = this.allApplications.filter(a => a.type === 'hologram');
    return holograms.filter(app => this.matchesHologramStatusSummary(app?.status || '', value)).length;
  }

  private matchesHologramStatusSummary(
    status: string,
    value: 'ALL' | 'UNDER_PROCESS' | 'APPROVED' | 'REJECTED'
  ): boolean {
    if (value === 'ALL') return true;
    const s = String(status || '').toLowerCase();
    const isApproved = s.includes('approved') || s.includes('cartoon assigned') || s.includes('carton assigned');
    const isRejected = s.includes('rejected');
    if (value === 'APPROVED') return isApproved;
    if (value === 'REJECTED') return isRejected;
    return !isApproved && !isRejected;
  }

  private parseSubmissionDate(value: string): Date | null {
    const v = String(value || '').trim();
    if (!v) return null;

    const direct = new Date(v);
    if (!Number.isNaN(direct.getTime())) return direct;

    const parts = v.split('-');
    if (parts.length === 3) {
      const day = Number(parts[0]);
      const mon = String(parts[1] || '').slice(0, 3).toLowerCase();
      const year = Number(parts[2]);
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const monthIndex = months.indexOf(mon);
      if (!Number.isNaN(day) && !Number.isNaN(year) && monthIndex >= 0) {
        const dt = new Date(year, monthIndex, day);
        if (!Number.isNaN(dt.getTime())) return dt;
      }
    }

    return null;
  }

  private toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private toIsoMonth(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
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
      event.item.type, 
      'commissioner'
    ).subscribe({
      next: (result: any) => {
        if (result.success) {
          if (result.message) {
            alert(result.message);
          }
          if (this.embeddedHologramOnly) {
            this.loadHolograms();
          } else if (['APPROVE', 'REJECT', 'EXTEND', 'ISSUE', 'FORWARD', 'ASSIGN_CARTONS', 'COMPLETE'].includes((event.action || '').toUpperCase())) {
            this.loadAllApplications();
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

  openHologramQtyDetails(application: CommissionerData): void {
    this.selectedHologramDetails = application;
    this.isHologramEditMode = false;
    const edit =
      application?.editHistory ||
      application?.edit_history ||
      application?.payment_details?.edit_history ||
      null;
    if (edit?.originalQuantities && edit?.updatedQuantities) {
      this.hologramEditSummary = {
        beforeQty: Number(edit.originalQuantities.total || 0),
        afterQty: Number(edit.updatedQuantities.total || 0),
        beforeAmount: Number(edit.originalPayment || 0),
        afterAmount: Number(edit.updatedPayment || 0)
      };
    } else {
      this.hologramEditSummary = null;
    }
  }

  closeHologramQtyDetails(): void {
    this.selectedHologramDetails = null;
    this.isHologramEditMode = false;
  }

  canEditHologramDetails(application: CommissionerData): boolean {
    const status = String(application?.status || '')
      .toLowerCase()
      .replace(/[_\s-]+/g, '');
    const allowedActions = Array.isArray(application?.allowedActions)
      ? application.allowedActions.map((action: string) => String(action || '').toLowerCase())
      : [];

    const hasCommissionerApprovalAction = allowedActions.includes('approve');
    const reachedCommissionerAfterItCell =
      status.includes('verified') ||
      status.includes('approvedbyitcell') ||
      status.includes('forwardedtocommissioner') ||
      status.includes('forwardedbyitcelltocommissioner');

    return hasCommissionerApprovalAction && reachedCommissionerAfterItCell;
  }

  private parseQty(value: any): number {
    const parsed = Number(String(value ?? 0).replace(/,/g, '').trim());
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  startHologramEdit(application: CommissionerData | null | undefined, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const target = application || this.selectedHologramDetails;
    if (!target || !this.canEditHologramDetails(target)) return;

    this.isHologramEditMode = true;
    this.hologramEditForm = {
      localQty: this.parseQty(target.localQtyLakh),
      exportQty: this.parseQty(target.exportQtyLakh),
      defenceQty: this.parseQty(target.defenceQtyLakh)
    };
  }

  cancelHologramEdit(): void {
    this.isHologramEditMode = false;
  }

  getEditedHologramTotal(): number {
    return Number(this.hologramEditForm.localQty || 0) +
           Number(this.hologramEditForm.exportQty || 0) +
           Number(this.hologramEditForm.defenceQty || 0);
  }

  saveHologramEdit(application: CommissionerData): void {
    const resolvedId = Number(
      application?.id ||
      this.allApplications.find(a => a.referenceNo === application?.referenceNo)?.id ||
      this.filteredApplications.find(a => a.referenceNo === application?.referenceNo)?.id
    );
    if (!resolvedId || Number.isNaN(resolvedId)) {
      alert('Unable to resolve request id for edit.');
      return;
    }

    const localQty = Number(this.hologramEditForm.localQty);
    const exportQty = Number(this.hologramEditForm.exportQty);
    const defenceQty = Number(this.hologramEditForm.defenceQty);

    if ([localQty, exportQty, defenceQty].some(v => Number.isNaN(v) || v < 0)) {
      alert('Invalid quantities. Please enter non-negative numbers only.');
      return;
    }

    this.hologramDataService.updateProcurementQuantities(
      resolvedId,
      localQty,
      exportQty,
      defenceQty
    ).subscribe({
      next: (res: any) => {
        const beforeQty = Number(application.totalQtyLakh || 0);
        const afterQty = localQty + exportQty + defenceQty;
        const beforeAmount = this.getHologramPopupAmount(application);
        const afterAmount = afterQty * 0.15;

        this.hologramEditSummary = { beforeQty, afterQty, beforeAmount, afterAmount };
        application.editHistory = {
          editedBy: res?.edited_by || 'Commissioner',
          editedDate: res?.updated_at || new Date().toISOString(),
          originalQuantities: res?.original_quantities || { total: beforeQty },
          updatedQuantities: res?.updated_quantities || { total: afterQty },
          originalPayment: beforeAmount,
          updatedPayment: afterAmount
        };
        application.edit_history = application.editHistory;

        application.localQtyLakh = localQty;
        application.exportQtyLakh = exportQty;
        application.defenceQtyLakh = defenceQty;
        application.totalQtyLakh = afterQty;
        application.amount = afterAmount.toFixed(2);

        this.allApplications = this.allApplications.map(a =>
          a.referenceNo === application.referenceNo ? { ...a, ...application } : a
        );
        this.filteredApplications = this.filteredApplications.map(a =>
          a.referenceNo === application.referenceNo ? { ...a, ...application } : a
        );

        this.isHologramEditMode = false;
      },
      error: (err: any) => {
        console.error('Error updating hologram quantities:', err);
        alert(err?.error?.error || 'Failed to update hologram quantities.');
      }
    });
  }

  getHologramPopupAmount(application: CommissionerData): number {
    const qty = Number(application?.totalQtyLakh || 0);
    return qty * 0.15;
  }

  // Utility methods
  getStatusClass(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('approved') || statusLower.includes('cartoon assigned') || statusLower.includes('carton assigned')) return 'bg-success';
    if (statusLower.includes('rejected')) return 'bg-danger';
    if (statusLower.includes('pending') || statusLower.includes('forwarded')) return 'bg-warning';
    return 'bg-secondary';
  }

  // Pagination methods
  getTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredApplications.length / this.pageSize));
  }

  getPaged(): CommissionerData[] {
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

