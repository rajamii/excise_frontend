import { Component, Inject } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { SalesmanBarmanRegistrationService } from '../../../../../core/services/salesman-barman-registration.service';
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

  constructor(
    public dialogRef: MatDialogRef<PrintApplicationComponent>,
    private licenseApplicationService: LicenseApplicationService,
    private salesmanBarmanService: SalesmanBarmanRegistrationService,
    private router: Router,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.application = data.application;
  }

  private get raw(): any {
    return this.application?.raw || {};
  }

  private isNumericId(value: unknown): boolean {
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value !== 'string') return false;
    return /^\d+$/.test(value.trim());
  }

  private inferApiTypeFromId(applicationId: string): 'new-license' | 'license-renewal' | '' {
    const id = String(applicationId || '').trim().toUpperCase();
    if (!id) return '';
    if (id.startsWith('NLI/')) return 'new-license';
    if (id.startsWith('LIC/')) return 'license-renewal';
    if (id.startsWith('NA/')) return 'new-license';
    if (id.startsWith('LA/')) return 'license-renewal';
    return '';
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

  // Kept for template compatibility (used in print-application.component.html)
  getApplicationId(): string {
    return this.getFinalLicenseId() || this.getPrintApiId();
  }

  getApplicationType(): string {
    return this.application?.type || this.raw?.type || 'license-renewal';
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

  canPrint(): boolean {
    return true;
  }

  onPrint(): void {
    const printApiId = this.getPrintApiId();
    const finalLicenseId = this.getFinalLicenseId();
    const appType = this.getApplicationType();

    // For license applications, open Final License screen dynamically (as requested).
    // This avoids backend "No LicenseApplication matches" errors from the print endpoint.
    if ((appType || '').toLowerCase() === 'new-license' || (appType || '').toLowerCase() === 'license-renewal') {
      if (!finalLicenseId) {
        Swal.fire('Error', 'Application ID not found', 'error');
        return;
      }

      const inferredType = this.inferApiTypeFromId(finalLicenseId);
      this.dialogRef.close(true);
      void this.router.navigate(['/licensee/final-license'], {
        queryParams: {
          applicationId: finalLicenseId,
          type: inferredType || appType,
          returnUrl: this.data?.returnUrl || '',
        }
      });
      return;
    }

    if (!printApiId) {
      console.error('No application ID found');
      Swal.fire('Error', 'Application ID not found', 'error');
      return;
    }

    let printObservable;

    // Route to correct print endpoint based on application type
    switch (appType) {
      case 'salesman-barman':
        
        printObservable = this.salesmanBarmanService.printRegistration(printApiId);
        break;

      case 'new-license':
        
        printObservable = this.licenseApplicationService.printNewLicense(printApiId);
        break;

      case 'license-renewal':
      default:
        
        printObservable = this.licenseApplicationService.printLicense(printApiId);
        break;
    }

    printObservable.subscribe({
      next: (res: any) => {
        const updatedCount = res?.print_count ?? res?.printCount;
        if (updatedCount !== undefined) {
          this.application.print_count = updatedCount;
          if (this.raw) this.raw.print_count = updatedCount;
        }

        this.dialogRef.close(true);
        Swal.fire('Printed', 'License printed successfully.', 'success');
      },
      error: (err: any) => {
        console.error('Print API error:', err);
        const errorMsg = err?.error?.detail ||
          err?.error?.error ||
          err?.error?.message ||
          'Failed to print license.';
        Swal.fire('Error', errorMsg, 'error');
      }
    });
  }

  onPay(): void {
    Swal.fire('Payment', 'Payment feature coming soon', 'info');
  }
}
