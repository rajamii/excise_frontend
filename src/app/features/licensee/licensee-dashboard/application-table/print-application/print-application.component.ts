import { Component, Inject } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { LicenseService } from '../../../../../core/services/license.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-print-application',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './print-application.component.html',
  styleUrl: './print-application.component.scss'
})
export class PrintApplicationComponent {
  application: any;
  loadingPrintInfo = false;
  printing = false;
  paying = false;

  constructor(
    public dialogRef: MatDialogRef<PrintApplicationComponent>,
    private licenseApplicationService: LicenseApplicationService,
    private licenseService: LicenseService,
    private router: Router,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.application = data.application;
    this.refreshPrintInfo();
  }

  private get raw(): any {
    return this.application?.raw || {};
  }

  private isNumericId(value: unknown): boolean {
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value !== 'string') return false;
    return /^\d+$/.test(value.trim());
  }

  private inferApiTypeFromId(applicationId: string): 'new-license' | 'license-renewal' | 'salesman-barman' | 'company-registration' | '' {
    const id = String(applicationId || '').trim().toUpperCase();
    if (!id) return '';
    if (id.startsWith('NLI/')) return 'new-license';
    if (id.startsWith('LIC/')) return 'license-renewal';
    if (id.startsWith('SBM/')) return 'salesman-barman';
    if (id.startsWith('RSBM/')) return 'license-renewal';
    if (id.startsWith('COMP/')) return 'company-registration';
    if (id.startsWith('NA/')) return 'new-license';
    if (id.startsWith('LA/')) return 'license-renewal';
    if (id.startsWith('SB/')) return 'salesman-barman';
    return '';
  }

  private getLicenseResolveId(): string {
    // Backend `masters/license/*` endpoints can resolve by `license_id` OR by `source_object_id` (application id).
    return (
      this.getMasterLicenseId() ||
      this.getFinalLicenseId() ||
      this.getPrintApiId() ||
      ''
    ).trim();
  }

  private getPrintApiId(): string {
    const candidates = [
      this.application?.id,
      this.raw?.id,
      this.raw?.pk,
      this.raw?.application_pk,
      this.raw?.applicationIdPk
    ];

    for (const c of candidates) {
      if (this.isNumericId(c)) return String(c);
    }

    // Fallback to "application_id" style values if backend uses lookup_field.
    return this.getFinalLicenseId();
  }

  private getFinalLicenseId(): string {
    return (
      this.application?.application_id ||
      this.application?.applicationId ||
      this.raw?.application_id ||
      this.raw?.applicationId ||
      ''
    );
  }

  private getMasterLicenseId(): string {
    return String(
      this.application?.license_id ||
      this.application?.licenseId ||
      this.application?.license ||
      this.application?.license_no ||
      this.application?.licenseNo ||
      this.raw?.license_id ||
      this.raw?.licenseId ||
      this.raw?.license ||
      this.raw?.license_no ||
      this.raw?.licenseNo ||
      this.getFinalLicenseId() ||
      ''
    ).trim();
  }

  // Kept for template compatibility (used in print-application.component.html)
  getApplicationId(): string {
    return this.getFinalLicenseId() || this.getPrintApiId();
  }

  getApplicationType(): string {
    const inferred = this.inferApiTypeFromId(this.getFinalLicenseId());
    return inferred || this.application?.type || this.raw?.type || 'license-renewal';
  }

  getPrintCount(): number {
    const value =
      this.application?.print_count ??
      this.application?.printCount ??
      this.raw?.print_count ??
      this.raw?.printCount ??
      0;

    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  getIsPrintFeePaid(): boolean {
    const value =
      this.application?.is_print_fee_paid ??
      this.application?.isPrintFeePaid ??
      this.raw?.is_print_fee_paid ??
      this.raw?.isPrintFeePaid ??
      false;

    return Boolean(value);
  }

  canPrint(): boolean {
    const type = this.getApplicationType();
    if (type === 'salesman-barman' || type === 'company-registration' || type === 'company-collaboration') {
      return true;
    }
    const count = this.getPrintCount();
    if (count < 5) return true;
    return this.getIsPrintFeePaid();
  }

  needsPayment(): boolean {
    const type = this.getApplicationType();
    if (type === 'salesman-barman' || type === 'company-registration' || type === 'company-collaboration') {
      return false;
    }
    return this.getPrintCount() >= 5 && !this.getIsPrintFeePaid();
  }

  private refreshPrintInfo(): void {
    const licenseId = this.getLicenseResolveId();
    if (!licenseId) return;

    this.loadingPrintInfo = true;
    this.licenseService.getLicenseDetail(licenseId).subscribe({
      next: (res: any) => {
        const updatedCount = res?.print_count ?? res?.printCount;
        const updatedPaid = res?.is_print_fee_paid ?? res?.isPrintFeePaid;
        if (updatedCount !== undefined) {
          this.application.print_count = updatedCount;
          if (this.raw) this.raw.print_count = updatedCount;
        }
        if (updatedPaid !== undefined) {
          this.application.is_print_fee_paid = updatedPaid;
          if (this.raw) this.raw.is_print_fee_paid = updatedPaid;
        }
        this.loadingPrintInfo = false;
      },
      error: () => {
        this.loadingPrintInfo = false;
      }
    });
  }

  onPrint(): void {
    if (this.printing) return;

    if (!this.canPrint()) {
      Swal.fire('Payment Required', 'You have reached the free print limit. Please pay ₹500 to print a duplicate copy.', 'warning');
      return;
    }

    const finalLicenseId = this.getFinalLicenseId();
    const appType = this.getApplicationType();

    if (appType === 'company-registration' || appType === 'company-collaboration') {
      this.dialogRef.close(true);
      void this.router.navigate(['/final-license'], {
        queryParams: {
          applicationId: finalLicenseId,
          type: appType,
          returnUrl: this.data?.returnUrl || '',
        }
      });
      return;
    }

    let printObservable;

    // Route to correct print endpoint based on application type
    switch (appType) {
      case 'salesman-barman':
      case 'new-license':
      case 'license-renewal':
      default:
        {
          const licenseId = this.getLicenseResolveId();
          if (!licenseId) {
            Swal.fire('Error', 'License/Application ID not found', 'error');
            return;
          }

          // Print count + fee logic is tracked in `licenses` table.
          // Backend resolves `license_id` OR `source_object_id` (application id).
          printObservable = this.licenseService.printLicense(licenseId);
        }
        break;
    }

    this.printing = true;
    printObservable.subscribe({
      next: (res: any) => {
        const updatedCount = res?.print_count ?? res?.printCount;
        const prePrintToken = String(res?.nonce || res?.verificationId || Date.now());
        if (updatedCount !== undefined) {
          this.application.print_count = updatedCount;
          if (this.raw) this.raw.print_count = updatedCount;
        }

        // License applications should go to the final license view after recording a print.
        if (['new-license', 'license-renewal', 'salesman-barman'].includes((appType || '').toLowerCase())) {
          const inferredType = this.inferApiTypeFromId(finalLicenseId || '');
          this.dialogRef.close(true);
          void this.router.navigate(['/final-license'], {
            queryParams: {
              applicationId: finalLicenseId,
              type: inferredType || appType,
              returnUrl: this.data?.returnUrl || '',
              prePrintToken,
            }
          });
        } else {
          this.dialogRef.close(true);
          Swal.fire('Printed', 'License printed successfully.', 'success');
        }
        this.printing = false;
      },
      error: (err: any) => {
        this.printing = false;
        console.error('Print API error:', err);
        const errorMsg = err?.error?.detail ||
          err?.error?.error ||
          err?.error?.message ||
          'Failed to print license.';

        // If the master License record is not found yet, don't block user from viewing the final license details.
        // This avoids getting stuck on "No License matches the given query."
        const appTypeLower = String(appType || '').toLowerCase();
        if ((appTypeLower === 'new-license' || appTypeLower === 'license-renewal' || appTypeLower === 'salesman-barman') && Number(err?.status) === 404) {
          const inferredType = this.inferApiTypeFromId(finalLicenseId || '');
          this.dialogRef.close(true);
          void this.router.navigate(['/final-license'], {
            queryParams: {
              applicationId: finalLicenseId,
              type: inferredType || appType,
              returnUrl: this.data?.returnUrl || '',
            }
          });
          Swal.fire('Info', 'License details opened. Print counter is not available for this license yet.', 'info');
          return;
        }
        Swal.fire('Error', errorMsg, 'error');
      }
    });
  }

  onPay(): void {
    const masterLicenseId = this.getLicenseResolveId();
    if (!masterLicenseId) {
      Swal.fire('Error', 'License ID not found', 'error');
      return;
    }

    if (!this.needsPayment()) {
      Swal.fire('Info', 'No payment required at the moment.', 'info');
      return;
    }

    if (this.paying) return;
    this.paying = true;

    this.licenseService.payPrintFee(masterLicenseId).subscribe({
      next: (res: any) => {
        const updatedPaid = res?.is_print_fee_paid ?? res?.isPrintFeePaid;
        if (updatedPaid !== undefined) {
          this.application.is_print_fee_paid = updatedPaid;
          if (this.raw) this.raw.is_print_fee_paid = updatedPaid;
        } else {
          this.application.is_print_fee_paid = true;
          if (this.raw) this.raw.is_print_fee_paid = true;
        }
        this.paying = false;
        Swal.fire('Paid', 'Print fee recorded. You can print one duplicate copy now.', 'success');
      },
      error: (err: any) => {
        this.paying = false;
        const errorMsg =
          err?.error?.detail ||
          err?.error?.error ||
          err?.error?.message ||
          'Failed to record print fee.';
        Swal.fire('Error', errorMsg, 'error');
      }
    });
  }
}
