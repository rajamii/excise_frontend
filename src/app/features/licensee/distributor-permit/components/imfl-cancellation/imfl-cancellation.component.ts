import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../../../../../shared/material.module';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-imfl-cancellation',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './imfl-cancellation.component.html',
  styleUrl: './imfl-cancellation.component.scss'
})
export class ImflCancellationComponent implements OnInit {
  @Input() applications: any[] = [];
  filteredRows: any[] = [];
  selectedApp: any = null;

  // Stats counts
  get totalCount(): number {
    return this.applications.length;
  }

  get pendingCount(): number {
    return this.applications.filter(app => 
      (app.status || '').toLowerCase().includes('pending') || 
      (app.currentStage || '').toLowerCase().includes('pending')
    ).length;
  }

  get approvedCount(): number {
    return this.applications.filter(app => 
      (app.status || '').toLowerCase() === 'approved' || 
      (app.currentStage || '').toLowerCase() === 'approved'
    ).length;
  }

  ngOnInit(): void {
    this.filteredRows = [...this.applications];
  }

  openCancellationModal(app: any): void {
    this.selectedApp = app;

    Swal.fire({
      title: 'Request IMFL Permit Cancellation',
      html: `
        <div style="text-align: left; padding: 10px 0;">
          <p style="margin-bottom: 10px;"><strong>Permit Ref:</strong> ${app.referenceNo || app.applicationId}</p>
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px;">Reason for Cancellation</label>
            <textarea id="swal-cancel-reason" class="swal2-textarea" placeholder="Specify reason for cancelling this import permit..." style="width: 100%; margin: 0; height: 85px;"></textarea>
          </div>
          <div style="padding: 10px; background: #fff5f5; border: 1px solid #fed7d7; border-radius: 8px; color: #c53030; font-size: 12px;">
            ⚠️ <strong>Warning:</strong> Cancellation request will be sent to Excise Permit Section for approval.
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Submit Cancellation Request',
      confirmButtonColor: '#dc2626',
      preConfirm: () => {
        const reason = (document.getElementById('swal-cancel-reason') as HTMLTextAreaElement)?.value;
        if (!reason || !reason.trim()) {
          Swal.showValidationMessage('Please provide a reason for cancellation.');
          return false;
        }
        return { reason: reason.trim() };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        Swal.fire('Submitted!', `Cancellation request for ${app.referenceNo || app.applicationId} submitted successfully.`, 'success');
      }
    });
  }
}
