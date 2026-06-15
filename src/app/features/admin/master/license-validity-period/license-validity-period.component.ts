import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MaterialModule } from '../../../../shared/material.module';
import { AdminService } from '../../admin.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NgForm } from '@angular/forms';
import Swal from 'sweetalert2';
import { DecimalPipe, NgIf, NgFor, CommonModule } from '@angular/common';

@Component({
  selector: 'app-license-validity-period',
  standalone: true,
  imports: [MaterialModule, NgIf, NgFor, DecimalPipe, CommonModule],
  templateUrl: './license-validity-period.component.html',
  styleUrl: './license-validity-period.component.scss'
})
export class LicenseValidityPeriodComponent implements OnInit {

  @ViewChild('editDialogTpl') editDialogTpl!: TemplateRef<any>;
  @ViewChild('editTimerDialogTpl') editTimerDialogTpl!: TemplateRef<any>;
  private dialogRef?: MatDialogRef<any>;
  private timerDialogRef?: MatDialogRef<any>;

  /** Live config from the server */
  config: any = {
    renewalMonth: 3,
    renewalDay: 31,
    renewalTime: '23:59:59'
  };

  timerConfig: any = {
    code: 'LICENSE_RENEWAL_REMINDER_TIMER',
    description: '',
    delayValue: 30,
    delayUnit: 'minute',
    isActive: true
  };

  /** Working copy used inside the dialogs */
  editConfig: any = {};
  editTimerConfig: any = {};

  editTimerMonth: number = 1;
  editTimerDay: number = 1;
  editTimerYear: number = 2027;

  isLoading = true;
  isSaving = false;
  isTimerSaving = false;

  availableUnits = ['second', 'minute', 'hour', 'day', 'week', 'month', 'year'];

  monthsList = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' }
  ];

  daysList = Array.from({ length: 31 }, (_, i) => i + 1);

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
        
        this.adminService.getTimerConfig('LICENSE_RENEWAL_REMINDER_TIMER').subscribe({
          next: (timerRes) => {
            if (timerRes) {
              this.timerConfig = {
                code: timerRes.code,
                description: timerRes.description,
                delayValue: timerRes.delayValue !== undefined ? timerRes.delayValue : timerRes.delay_value,
                delayUnit: timerRes.delayUnit !== undefined ? timerRes.delayUnit : timerRes.delay_unit,
                isActive: timerRes.isActive !== undefined ? timerRes.isActive : timerRes.is_active
              };
            }
            this.isLoading = false;
          },
          error: (err) => {
            console.error('Failed to load timer config', err);
            this.isLoading = false;
          }
        });
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

  openEditTimerDialog(): void {
    this.editTimerConfig = { ...this.timerConfig };

    const m = this.config.renewalMonth || 3;
    const d = this.config.renewalDay || 31;

    // Default fallback
    this.editTimerMonth = m;
    this.editTimerDay = d;
    this.editTimerYear = 2026 + (this.editTimerConfig.delayValue || 1);

    if (this.editTimerConfig.delayUnit === 'month') {
      const baseDate = new Date(2026, m - 1, d);
      baseDate.setMonth(baseDate.getMonth() - (this.editTimerConfig.delayValue || 1));
      this.editTimerMonth = baseDate.getMonth() + 1;
      this.editTimerDay = baseDate.getDate();
    } else if (this.editTimerConfig.delayUnit === 'year') {
      this.editTimerYear = 2026 + (this.editTimerConfig.delayValue || 1);
    }

    this.timerDialogRef = this.dialog.open(this.editTimerDialogTpl, {
      width: '540px',
      maxWidth: '95vw',
      panelClass: 'lvp-dialog-panel',
      disableClose: true
    });
  }

  onTimerUnitChange(): void {
    const unit = this.editTimerConfig.delayUnit;
    if (unit === 'month') {
      this.updateMonthDelayValue();
    } else if (unit === 'year') {
      this.updateYearDelayValue();
    } else {
      if (!this.editTimerConfig.delayValue || this.editTimerConfig.delayValue < 1) {
        this.editTimerConfig.delayValue = 30; // default fallback
      }
    }
  }

  updateMonthDelayValue(): void {
    const expiryMonth = this.config.renewalMonth || 3;
    const selectedMonth = this.editTimerMonth;
    
    let diff = expiryMonth - selectedMonth;
    if (diff < 0) {
      diff += 12;
    }
    if (diff === 0) {
      diff = 12;
    }
    this.editTimerConfig.delayValue = diff;
  }

  updateYearDelayValue(): void {
    const currentYear = 2026;
    let selectedYear = this.editTimerYear;
    if (selectedYear < currentYear) {
      selectedYear = currentYear + 1;
      this.editTimerYear = selectedYear;
    }
    this.editTimerConfig.delayValue = selectedYear - currentYear;
  }

  closeTimerDialog(): void {
    this.timerDialogRef?.close();
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

  onSaveTimer(form: NgForm): void {
    if (form.invalid) { return; }
    this.isTimerSaving = true;

    const payload = {
      code: this.editTimerConfig.code,
      delay_value: this.editTimerConfig.delayValue,
      delayValue: this.editTimerConfig.delayValue,
      delay_unit: this.editTimerConfig.delayUnit,
      delayUnit: this.editTimerConfig.delayUnit,
      is_active: this.editTimerConfig.isActive,
      isActive: this.editTimerConfig.isActive
    };

    this.adminService.updateTimerConfig(payload).subscribe({
      next: (res) => {
        if (res) {
          this.timerConfig = {
            code: res.code,
            description: res.description,
            delayValue: res.delayValue !== undefined ? res.delayValue : res.delay_value,
            delayUnit: res.delayUnit !== undefined ? res.delayUnit : res.delay_unit,
            isActive: res.isActive !== undefined ? res.isActive : res.is_active
          };
        } else {
          this.timerConfig = { ...this.editTimerConfig };
        }
        this.isTimerSaving = false;
        this.closeTimerDialog();
        Swal.fire({
          title: 'Updated!',
          text: `License renewal window starts ${this.timerConfig.delayValue} ${this.timerConfig.delayUnit}(s) before expiry.`,
          icon: 'success',
          confirmButtonColor: '#1976d2'
        });
      },
      error: (err) => {
        console.error('Failed to save timer config', err);
        this.isTimerSaving = false;
        Swal.fire({
          title: 'Error!',
          text: 'Failed to update License Renewal eligibility window.',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  getDurationExplanation(value: number, unit: string): string {
    if (!value || value <= 0) return '';
    const u = String(unit || '').toLowerCase().trim();
    
    if (u === 'second' || u === 'seconds') {
      if (value >= 2592000) {
        return `Equivalent to approx. ${(value / 2592000).toFixed(1)} month(s)`;
      }
      if (value >= 86400) {
        return `Equivalent to approx. ${(value / 86400).toFixed(1)} day(s)`;
      }
      if (value >= 3600) {
        return `Equivalent to approx. ${(value / 3600).toFixed(1)} hour(s)`;
      }
      if (value >= 60) {
        return `Equivalent to approx. ${(value / 60).toFixed(1)} minute(s)`;
      }
      return `${value} second(s)`;
    }

    if (u === 'minute' || u === 'minutes') {
      if (value >= 43200) {
        const months = (value / 43200).toFixed(1);
        const days = (value / 1440).toFixed(1);
        return `Equivalent to approx. ${months} month(s) (${days} days)`;
      }
      if (value >= 1440) {
        const days = (value / 1440).toFixed(1);
        return `Equivalent to approx. ${days} day(s)`;
      }
      if (value >= 60) {
        const hours = (value / 60).toFixed(1);
        return `Equivalent to approx. ${hours} hour(s)`;
      }
      return `${value} minute(s)`;
    }
    
    if (u === 'hour' || u === 'hours') {
      if (value >= 720) {
        const months = (value / 720).toFixed(1);
        const days = (value / 24).toFixed(1);
        return `Equivalent to approx. ${months} month(s) (${days} days)`;
      }
      if (value >= 24) {
        const days = (value / 24).toFixed(1);
        return `Equivalent to approx. ${days} day(s)`;
      }
      return `${value} hour(s)`;
    }
    
    if (u === 'day' || u === 'days') {
      if (value >= 30) {
        const months = (value / 30).toFixed(1);
        return `Equivalent to approx. ${months} month(s)`;
      }
      return `${value} day(s)`;
    }
    
    if (u === 'week' || u === 'weeks') {
      const days = value * 7;
      if (days >= 30) {
        const months = (days / 30).toFixed(1);
        return `${days} days (approx. ${months} month(s))`;
      }
      return `${days} days`;
    }
    
    if (u === 'month' || u === 'months') {
      const days = value * 30;
      return `${days} days (approx. ${value} month(s))`;
    }
    
    if (u === 'year' || u === 'years') {
      const months = value * 12;
      const days = value * 365;
      return `${months} months (${days} days)`;
    }
    
    return `${value} ${unit}(s)`;
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

  getRenewalOpenDateTimeExplanation(): string {
    return this.getRenewalOpenDateTimeExplanationFor(this.timerConfig.delayValue, this.timerConfig.delayUnit);
  }

  getRenewalOpenDateTimeExplanationFor(value: number, unit: string): string {
    const m = this.config.renewalMonth;
    const d = this.config.renewalDay;
    const t = this.config.renewalTime;
    if (!m || !d || !t) { return '—'; }

    const timeParts = t.split(':');
    const hours = parseInt(timeParts[0] || '0', 10);
    const minutes = parseInt(timeParts[1] || '0', 10);
    const seconds = parseInt(timeParts[2] || '0', 10);

    // Month in JS Date is 0-indexed (0 = Jan, 11 = Dec)
    const baseDate = new Date(2026, m - 1, d, hours, minutes, seconds);
    const u = String(unit || '').toLowerCase().trim();

    if (!value || value <= 0) {
      return this.formatDateWithTime(baseDate);
    }

    const targetDate = new Date(baseDate);

    if (u === 'second' || u === 'seconds') {
      targetDate.setSeconds(targetDate.getSeconds() - value);
    } else if (u === 'minute' || u === 'minutes') {
      targetDate.setMinutes(targetDate.getMinutes() - value);
    } else if (u === 'hour' || u === 'hours') {
      targetDate.setHours(targetDate.getHours() - value);
    } else if (u === 'day' || u === 'days') {
      targetDate.setDate(targetDate.getDate() - value);
    } else if (u === 'week' || u === 'weeks') {
      targetDate.setDate(targetDate.getDate() - (value * 7));
    } else if (u === 'month' || u === 'months') {
      targetDate.setMonth(targetDate.getMonth() - value);
    } else if (u === 'year' || u === 'years') {
      targetDate.setFullYear(targetDate.getFullYear() - value);
    }

    return this.formatDateWithTime(targetDate);
  }

  private formatDateWithTime(date: Date): string {
    const monthName = this.getMonthName(date.getMonth() + 1);
    const day = date.getDate();
    const suffix = this.getDaySuffix(day);
    
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');

    return `${monthName} ${day}${suffix}, ${hh}:${mm}:${ss}`;
  }
}

