import { Component, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import {
  AdminService,
  CreateOICOfficerPayload,
  OICApprovedEstablishment,
  OICOfficerRecord
} from '../../../admin.service';
import { MaterialModule } from '../../../../../shared/material.module';

@Component({
  selector: 'app-oic-manage',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent implements OnInit {
  establishments: OICApprovedEstablishment[] = [];
  oicCountByApplicationId: Record<string, number> = {};
  oicOfficersByApplicationId: Record<string, OICOfficerRecord[]> = {};
  isLoading = false;
  isSaving = false;
  submitAttempted = false;
  isEditMode = false;

  form: CreateOICOfficerPayload = {
    approvedApplicationId: '',
    name: '',
    email: '',
    phoneNumber: ''
  };

  constructor(
    private adminService: AdminService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.isEditMode = !!this.data?.id;
    if (this.data) {
      this.form = {
        approvedApplicationId: String(this.data.applicationId || ''),
        name: String(this.data.name || ''),
        email: String(this.data.email || ''),
        phoneNumber: String(this.data.phoneNumber || '')
      };
    }
    this.loadEstablishments();
  }

  loadEstablishments(): void {
    this.isLoading = true;
    forkJoin({
      establishments: this.adminService.getOICApprovedEstablishments(),
      officers: this.adminService.getOICOfficers()
    }).subscribe({
      next: ({ establishments, officers }) => {
        const raw = Array.isArray(establishments) ? establishments : [];
        this.establishments = raw.filter((est: any) => {
          const cat = String(est?.categoryName || '').toLowerCase();
          return !cat || cat.includes('manufacturing') || cat.includes('brewery') || cat.includes('distiller');
        });
        this.oicCountByApplicationId = this.buildOicCountMap(officers);
        this.oicOfficersByApplicationId = this.buildOicOfficerMap(officers);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load approved establishments:', error);
        this.establishments = [];
        this.oicCountByApplicationId = {};
        this.oicOfficersByApplicationId = {};
        this.isLoading = false;
      }
    });
  }

  private buildOicCountMap(rows: OICOfficerRecord[] | null | undefined): Record<string, number> {
    const countMap: Record<string, number> = {};

    for (const row of Array.isArray(rows) ? rows : []) {
      const applicationId = String(row?.applicationId || '').trim();
      if (!applicationId) {
        continue;
      }
      countMap[applicationId] = (countMap[applicationId] || 0) + 1;
    }

    return countMap;
  }

  private buildOicOfficerMap(rows: OICOfficerRecord[] | null | undefined): Record<string, OICOfficerRecord[]> {
    const officerMap: Record<string, OICOfficerRecord[]> = {};

    for (const row of Array.isArray(rows) ? rows : []) {
      const applicationId = String(row?.applicationId || '').trim();
      if (!applicationId) {
        continue;
      }

      if (!officerMap[applicationId]) {
        officerMap[applicationId] = [];
      }
      officerMap[applicationId].push(row);
    }

    return officerMap;
  }

  getOicCount(item: OICApprovedEstablishment): number {
    return this.oicCountByApplicationId[String(item.applicationId || '').trim()] || 0;
  }

  hasExistingOic(item: OICApprovedEstablishment): boolean {
    return this.getOicCount(item) > 0;
  }

  getSelectedEstablishment(): OICApprovedEstablishment | undefined {
    return this.establishments.find(item => item.applicationId === this.form.approvedApplicationId);
  }

  selectedEstablishmentHasExistingOic(): boolean {
    const selected = this.getSelectedEstablishment();
    return !!selected && this.hasExistingOic(selected);
  }

  getSelectedEstablishmentOicCount(): number {
    const selected = this.getSelectedEstablishment();
    return selected ? this.getOicCount(selected) : 0;
  }

  getSelectedEstablishmentLabel(): string {
    const selected = this.getSelectedEstablishment();
    return selected ? this.getEstablishmentOptionLabel(selected) : '';
  }

  shouldShowOicDetailsButton(): boolean {
    return this.getSelectedEstablishmentOicCount() > 2;
  }

  private formatDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '-';
    }

    return parsed.toLocaleString();
  }

  viewExistingOicDetails(): void {
    const selected = this.getSelectedEstablishment();
    if (!selected) {
      return;
    }

    const officers = this.oicOfficersByApplicationId[String(selected.applicationId || '').trim()] || [];
    const rows = officers
      .map((officer, index) => {
        const createdAt = this.formatDate(
          officer.created_at ||
          officer.createdAt ||
          officer.officer_created_at ||
          officer.officerCreatedAt ||
          ''
        );

        return `
          <tr>
            <td style="padding:8px 10px;border-bottom:1px solid #e8eef9;">${index + 1}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e8eef9;">${officer.name || '-'}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e8eef9;">${officer.username || '-'}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e8eef9;">${createdAt}</td>
          </tr>
        `;
      })
      .join('');

    Swal.fire({
      title: 'Mapped OIC Details',
      html: `
        <div style="text-align:left">
          <p style="margin:0 0 12px;color:#42557f;font-size:14px;">
            <strong>${selected.establishmentName}</strong> already has ${officers.length} OIC mapped.
          </p>
          <div style="max-height:320px;overflow:auto;border:1px solid #e3eaf8;border-radius:10px;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead style="position:sticky;top:0;background:#f5f8ff;">
                <tr>
                  <th style="padding:9px 10px;text-align:left;border-bottom:1px solid #dbe5f7;">#</th>
                  <th style="padding:9px 10px;text-align:left;border-bottom:1px solid #dbe5f7;">Name</th>
                  <th style="padding:9px 10px;text-align:left;border-bottom:1px solid #dbe5f7;">Username</th>
                  <th style="padding:9px 10px;text-align:left;border-bottom:1px solid #dbe5f7;">Created At</th>
                </tr>
              </thead>
              <tbody>${rows || '<tr><td colspan="4" style="padding:12px 10px;">No details found.</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      `,
      width: 760,
      confirmButtonText: 'Close'
    });
  }

  getEstablishmentOptionLabel(item: OICApprovedEstablishment): string {
    const baseLabel = `${item.establishmentName} (${item.licenseId})`;
    const count = this.getOicCount(item);
    return count > 0 ? `${baseLabel} [Already entered (${count})]` : baseLabel;
  }

  onSave(): void {
    this.submitAttempted = true;
    if (!this.form.approvedApplicationId || !this.form.name || !this.form.email || !this.form.phoneNumber) {
      return;
    }

    this.isSaving = true;
    const request = this.isEditMode && this.data?.id
      ? this.adminService.updateOICOfficer(this.data.id, this.form)
      : this.adminService.createOICOfficer(this.form);

    request.subscribe({
      next: (response) => {
        this.isSaving = false;
        Swal.fire('Success', this.isEditMode ? 'Officer updated successfully.' : 'Officer created successfully.', 'success');
        this.dialogRef.close({
          refresh: true,
          credentials: response?.credentials || null
        });
      },
      error: (error) => {
        this.isSaving = false;
        const backendError = error?.error;
        let message = backendError?.detail || 'Failed to create officer.';

        if (!backendError?.detail && backendError && typeof backendError === 'object') {
          const fieldMessages = Object.entries(backendError)
            .map(([field, value]) => {
              const text = Array.isArray(value) ? value.join(', ') : String(value);
              return `${field}: ${text}`;
            })
            .join('\n');
          if (fieldMessages) {
            message = fieldMessages;
          }
        }
        Swal.fire('Error', message, 'error');
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
