import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../../../../../shared/material.module';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-imfl-revalidation',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './imfl-revalidation.component.html',
  styleUrl: './imfl-revalidation.component.scss'
})
export class ImflRevalidationComponent implements OnInit {
  @Input() applications: any[] = [];
  searchQuery = '';
  filteredRows: any[] = [];
  selectedApp: any = null;

  ngOnInit(): void {
    this.applyFilter();
  }

  applyFilter(): void {
    if (!this.searchQuery.trim()) {
      this.filteredRows = [...this.applications];
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredRows = this.applications.filter(app =>
        String(app.referenceNo || app.applicationId || '').toLowerCase().includes(q) ||
        String(app.supplierCompanyName || app.supplierName || '').toLowerCase().includes(q)
      );
    }
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
        Swal.fire('Submitted!', `Revalidation request for ${app.referenceNo || app.applicationId} submitted successfully.`, 'success');
      }
    });
  }
}
