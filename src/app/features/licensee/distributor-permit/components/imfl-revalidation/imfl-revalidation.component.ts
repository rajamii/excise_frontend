import { Component, Input, OnChanges, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../../../../../shared/material.module';
import Swal from 'sweetalert2';
import { UnifiedActionsService } from '../../../../../shared/services/unified-actions.service';

@Component({
  selector: 'app-imfl-revalidation',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './imfl-revalidation.component.html',
  styleUrl: './imfl-revalidation.component.scss'
})
export class ImflRevalidationComponent implements OnInit {
  private readonly unifiedActionsService = inject(UnifiedActionsService);

  @Input() applications: any[] = [];
  filteredRows: any[] = [];
  selectedApp: any = null;
  searchQuery = '';

  // Stats counts
  get totalCount(): number {
    return this.filteredRows.length;
  }

  get pendingCount(): number {
    return this.filteredRows.filter(app => 
      (app.status || '').toLowerCase().includes('pending') || 
      (app.currentStage || '').toLowerCase().includes('pending')
    ).length;
  }

  get approvedCount(): number {
    return this.filteredRows.filter(app => 
      (app.status || '').toLowerCase() === 'approved' || 
      (app.currentStage || '').toLowerCase() === 'approved'
    ).length;
  }

  ngOnInit(): void {
    this.applyFilter();
  }

  ngOnChanges(): void {
    this.applyFilter();
  }

  applyFilter(): void {
    const q = (this.searchQuery || '').trim().toLowerCase();
    this.filteredRows = (this.applications || []).filter((row) => {
      const ref = String(row.referenceNo || row.applicationId || '').toUpperCase();
      const status = String(row.status || row.currentStage || '').toLowerCase();
      const isEligible = ref.startsWith('IMFLREV') || status.includes('approved');
      if (!isEligible) return false;

      if (!q) return true;
      return (
        ref.toLowerCase().includes(q) ||
        String(row.supplierCompanyName || row.supplierName || '').toLowerCase().includes(q)
      );
    });
  }

  openRevalidationModal(app: any): void {
    this.selectedApp = app;
    Swal.fire({
      title: 'Apply IMFL Permit Revalidation',
      html: `
        <div style="text-align: left; padding: 10px 0;">
          <p style="margin-bottom: 10px;"><strong>Permit Ref:</strong> ${app.referenceNo || app.applicationId}</p>
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px;">Extension Period (Days)</label>
            <select id="swal-ext-days" class="swal2-input" style="width: 100%; height: 38px; margin: 0;">
              <option value="15">15 Days</option>
              <option value="30" selected>30 Days</option>
              <option value="60">60 Days</option>
            </select>
          </div>
          <div>
            <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px;">Reason for Revalidation</label>
            <textarea id="swal-reval-reason" class="swal2-textarea" placeholder="Specify reason for delay / extension request..." style="width: 100%; margin: 0; height: 80px;"></textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Submit Revalidation Request',
      confirmButtonColor: '#2563eb',
      preConfirm: () => {
        const days = (document.getElementById('swal-ext-days') as HTMLSelectElement)?.value;
        const reason = (document.getElementById('swal-reval-reason') as HTMLTextAreaElement)?.value;
        if (!reason || !reason.trim()) {
          Swal.showValidationMessage('Please provide a reason for revalidation.');
          return false;
        }
        return { days: Number(days), reason: reason.trim() };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.unifiedActionsService.executeAction('REQUEST_REVALIDATION', this.toActionItem(app), 'requisition', 'licensee').subscribe({
          next: (response) => {
            if (response?.success === false) {
              void Swal.fire('Unable to Proceed', response.message || 'Revalidation request could not be opened.', 'error');
              return;
            }
          },
          error: (error) => {
            void Swal.fire(
              'Unable to Proceed',
              error?.error?.detail || error?.error?.message || error?.message || 'Revalidation request could not be opened.',
              'error'
            );
          }
        });
      }
    });
  }

  private toActionItem(app: any): any {
    return {
      id: app?.id || app?.application?.id || app?.referenceNo || app?.applicationId,
      referenceNo: app?.referenceNo || app?.application?.referenceNo || app?.applicationId || '',
      status: app?.status || app?.currentStage || 'APPROVED',
      ...app,
      ...(app?.application || {})
    };
  }
}
