import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { take, catchError } from 'rxjs/operators';
import { environment } from './src/environments/environment';
import { UnifiedApplication } from './src/app/core/models/unified-application.model';
import { MyLicensesComponent } from './src/app/features/licensee/my-licenses/my-licenses.component';
import { TimerConfigService } from './src/app/core/services/timer-config.service';

export class RenewalEligibilityChecker {
  dialog!: MatDialog;
  timerConfigService!: TimerConfigService;
  http!: HttpClient;
  cdr!: ChangeDetectorRef;
  renewalWarnings: any[] = [];

  getTypeLabel(type: string): string {
    switch (type) {
      case 'license-renewal': return 'License Renewal';
      case 'new-license': return 'New License';
      case 'salesman-barman': return 'Salesman/Barman';
      case 'company-registration': return 'Company Registration';
      default: return type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  }

  private formatDDMMYYYY(date: Date): string {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  openMyLicensesForRenewal(): void {
    this.dialog.open(MyLicensesComponent, {
      width: '1200px',
      maxHeight: '90vh'
    });
  }

  private extractValidUpToDate(raw: any): Date | null {
    const value = raw?.valid_up_to ?? raw?.validUpTo ?? raw?.valid_upto ?? raw?.valid_until ?? raw?.validUntil ?? null;
    if (!value) return null;
    
    if (value instanceof Date) return value;
    
    const str = String(value).trim();
    if (!str) return null;
    
    const dmY = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str);
    if (dmY) {
      const dt = new Date(Number(dmY[3]), Number(dmY[2]) - 1, Number(dmY[1]), 23, 59, 59);
      return Number.isFinite(dt.getTime()) ? dt : null;
    }
    
    const dt = new Date(str);
    return Number.isFinite(dt.getTime()) ? dt : null;
  }

  private extractLicenseId(app: UnifiedApplication): string | null {
    const raw = app.raw || {};
    const possibleFields = [
      raw.license_id,
      raw.licenseId,
      raw.license?.id,
      raw.license?.license_id,
      raw.issued_license_id,
      raw.issuedLicenseId
    ];
    for (const field of possibleFields) {
      if (field && typeof field === 'string') {
        return field;
      }
    }
    return null;
  }

  checkRenewalEligibility(approvedWithoutRenewal: UnifiedApplication[]): void {
    const fallbackSeconds = 90 * 24 * 60 * 60;
    
    forkJoin({
      timer: this.timerConfigService.getTimerConfig('LICENSE_RENEWAL_REMINDER_TIMER', fallbackSeconds).pipe(take(1)),
      renewalConfig: this.http.get<any>(`${environment.apiBaseUrl}/masters/core/renewal-application-config/`).pipe(catchError(() => of(null)))
    }).subscribe(({ timer, renewalConfig }) => {
      let newWarnings: any[] = [];
      const windowMs = Math.max(0, Number(timer?.delay_ms ?? 0) || 0);
      if (!windowMs) return;

      approvedWithoutRenewal.forEach(app => {
        const raw = app.raw || {};
        let validUpTo = this.extractValidUpToDate(raw);
        
        if (!validUpTo && renewalConfig) {
          const month = renewalConfig.renewal_month || 3;
          const day = renewalConfig.renewal_day || 31;
          const time = renewalConfig.renewal_time || '23:59:59';
          const timeParts = time.split(':');
          
          const now = new Date();
          let year = now.getFullYear();
          if (now.getMonth() + 1 > month || (now.getMonth() + 1 === month && now.getDate() > day)) {
              year++;
          }
          validUpTo = new Date(year, month - 1, day, Number(timeParts[0]||23), Number(timeParts[1]||59), Number(timeParts[2]||59));
        }

        if (!validUpTo) return;

        const validMs = validUpTo.getTime();
        const now = Date.now();
        const eligibleFrom = validMs - windowMs;

        if (now >= eligibleFrom) {
          const licenseId = this.extractLicenseId(app);
          if (licenseId) {
            const finalDateStr = this.formatDDMMYYYY(validUpTo);
            newWarnings.push({
              licenseId,
              type: this.getTypeLabel(app.type || ''),
              establishmentName: app.establishmentName || app.applicantFullName || 'N/A',
              validUpTo,
              finalDateStr
            });
          }
        }
      });
      
      this.renewalWarnings = newWarnings;
      
      try {
        if (this.cdr) {
          this.cdr.detectChanges();
        }
      } catch(e) {}
    });
  }
}
