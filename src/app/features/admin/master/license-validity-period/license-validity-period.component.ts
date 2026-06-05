import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MaterialModule } from '../../../../shared/material.module';
import { AdminService } from '../../admin.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NgForm } from '@angular/forms';
import Swal from 'sweetalert2';
import { DecimalPipe, NgIf } from '@angular/common';

@Component({
  selector: 'app-license-validity-period',
  standalone: true,
  imports: [MaterialModule, NgIf, DecimalPipe],
  templateUrl: './license-validity-period.component.html',
  styleUrl: './license-validity-period.component.scss'
})
export class LicenseValidityPeriodComponent implements OnInit {

  @ViewChild('editDialogTpl') editDialogTpl!: TemplateRef<any>;
  private dialogRef?: MatDialogRef<any>;

  /** Live config from the server */
  config: any = {
    renewalMonth: 3,
    renewalDay: 31,
    renewalTime: '23:59:59'
  };

  /** Working copy used inside the dialog */
  editConfig: any = {};

  isLoading = true;
  isSaving = false;

  private readonly MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  constructor(
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadConfig();
  }

  loadConfig(): void {
    this.isLoading = true;
    this.adminService.getRenewalApplicationConfig().subscribe({
      next: (res) => {
        if (res) { this.config = res; }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load config', err);
        Swal.fire('Error', 'Failed to load License Validity Period configuration.', 'error');
        this.isLoading = false;
      }
    });
  }

  // ─── Dialog helpers ───────────────────────────────────────────────────────

  openEditDialog(): void {
    // Deep copy so dialog edits don't mutate the table row until saved
    this.editConfig = { ...this.config };
    this.dialogRef = this.dialog.open(this.editDialogTpl, {
      width: '540px',
      maxWidth: '95vw',
      panelClass: 'lvp-dialog-panel',
      disableClose: true
    });
  }

  closeDialog(): void {
    this.dialogRef?.close();
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  onSave(form: NgForm): void {
    if (form.invalid) { return; }
    this.isSaving = true;

    this.adminService.updateRenewalApplicationConfig(this.editConfig).subscribe({
      next: (res) => {
        this.config = res ?? this.editConfig;
        this.isSaving = false;
        this.closeDialog();
        Swal.fire({
          title: 'Updated!',
          text: `License expiry set to ${this.getMonthName(this.config.renewalMonth)} ${this.config.renewalDay}${this.getDaySuffix(this.config.renewalDay)} at ${this.config.renewalTime}.`,
          icon: 'success',
          confirmButtonColor: '#1976d2'
        });
      },
      error: (err) => {
        console.error('Failed to save config', err);
        this.isSaving = false;
        Swal.fire({
          title: 'Error!',
          text: 'Failed to update License Validity Period.',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  // ─── Display helpers ──────────────────────────────────────────────────────

  getMonthName(month: number): string {
    return this.MONTH_NAMES[month] ?? '—';
  }

  getDaySuffix(day: number): string {
    if (day >= 11 && day <= 13) { return 'th'; }
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  getPreviewDate(): string {
    const m = this.config.renewalMonth;
    const d = this.config.renewalDay;
    const t = this.config.renewalTime;
    if (!m || !d || !t) { return '—'; }
    return `${this.getMonthName(m)} ${d}${this.getDaySuffix(d)}, ${t}`;
  }
}
