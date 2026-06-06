import { Component, OnDestroy, OnInit } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialogRef } from '@angular/material/dialog';
import { UnifiedDashboardService } from '../../../core/services/unified-dashboard.service';
import { LicenseApplicationService } from '../../../core/services/license-application.service';
import { SalesmanBarmanRegistrationService } from '../../../core/services/salesman-barman-registration.service';
import { UnifiedApplication } from '../../../core/models/unified-application.model';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ViewApplicationComponent } from '../licensee-dashboard/application-table/view-application/view-application.component';
import { PrintApplicationComponent } from '../licensee-dashboard/application-table/print-application/print-application.component';
import { NavigationStart, Router } from '@angular/router';
import { of, Subscription } from 'rxjs';
import { catchError, filter, map, switchMap, take } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { TimerConfig, TimerConfigService } from '../../../core/services/timer-config.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-my-licenses',
  standalone: true,
  imports: [MaterialModule, CommonModule],
  templateUrl: './my-licenses.component.html',
  styleUrl: './my-licenses.component.scss'
})
export class MyLicensesComponent implements OnInit, OnDestroy {
  dataSource = new MatTableDataSource<UnifiedApplication>();
  displayedColumns: string[] = ['slNo', 'applicationId', 'type', 'establishmentName', 'approvalDate', 'actions'];
  isLoading = false;
  private routerSub?: Subscription;
  private readonly renewalReminderTimerCode = 'LICENSE_RENEWAL_REMINDER_TIMER';
  private activeRenewalLicenseIds = new Set<string>();

  constructor(
    public dialogRef: MatDialogRef<MyLicensesComponent>,
    private unifiedDashboardService: UnifiedDashboardService,
    private licenseApplicationService: LicenseApplicationService,
    private salesmanBarmanService: SalesmanBarmanRegistrationService,
    private timerConfigService: TimerConfigService,
    private dialog: MatDialog,
    private router: Router,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    // Auto-close this dialog when navigating to final license screen
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe((event: any) => {
      const url = String(event?.url || '');
      if (url.startsWith('/licensee/final-license')) this.closeDialog();
    });

    this.loadMyLicenses();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private renewLicenseUsingTimer(application: UnifiedApplication): void {
    const fallbackSeconds = 90 * 24 * 60 * 60;
    const summaryValidUpTo = this.extractValidUpToDate(application.raw || {});
    const resolvedType = this.resolveApplicationType(application);

    const app$ = summaryValidUpTo
      ? of(application)
      : this.unifiedDashboardService.getApplicationDetail(application.applicationId, resolvedType).pipe(
          catchError(() => of(application))
        );

    app$
      .pipe(
        take(1),
        switchMap((app) =>
          forkJoin({
            app: of(app),
            timer: this.timerConfigService.getTimerConfig(this.renewalReminderTimerCode, fallbackSeconds).pipe(take(1)),
            renewalConfig: this.http.get<any>(`${environment.apiBaseUrl}/masters/core/renewal-application-config/`).pipe(catchError(() => of(null)), take(1))
          })
        )
      )
      .subscribe(({ app, timer, renewalConfig }) => {
        const raw = app.raw || {};
        let validUpTo = this.extractValidUpToDate(raw) || summaryValidUpTo;

        if (!validUpTo && renewalConfig) {
          const month = renewalConfig.renewal_month || 3;
          const day = renewalConfig.renewal_day || 31;
          const now = new Date();
          let year = now.getFullYear();
          if (now.getMonth() + 1 > month || (now.getMonth() + 1 === month && now.getDate() > day)) {
              year++;
          }
          validUpTo = new Date(year, month - 1, day, 23, 59, 59);
        }

        if (validUpTo && !this.isRenewalAllowed(validUpTo, timer)) {
          const windowLabel = this.getTimerWindowLabel(timer);
          Swal.fire({
            icon: 'error',
            title: 'Invalid Renewal Request',
            html: `
              <p>Renewal not allowed yet. License valid until ${this.formatDDMMYYYY(validUpTo)}.</p>
              <p>You can renew within the last ${windowLabel} or after expiry.</p>
            `
          });
          return;
        }

        const renewalId = this.extractLicenseId(raw, app);
        if (!renewalId) {
          Swal.fire({
            icon: 'error',
            title: 'Cannot Renew',
            html: `
              <p><strong>This license cannot be renewed yet.</strong></p>
              <p>Possible reasons:</p>
              <ul style="text-align: left; margin: 10px 20px;">
                <li>The license has not been issued yet</li>
                <li>The application is still under approval</li>
                <li>License data is incomplete</li>
              </ul>
              <p style="margin-top: 10px;"><small>Application ID: ${app.applicationId}</small></p>
            `
          });
          return;
        }

        Swal.fire({
          title: 'Renew License?',
          html: `
            <div style="text-align: left; padding: 10px;">
              <p>Are you sure you want to renew this license?</p>
              <p><strong>License ID:</strong> ${renewalId}</p>
              <p><strong>Type:</strong> ${this.getTypeLabel(app)}</p>
            </div>
          `,
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Yes, Renew License'
        }).then((result) => {
          if (result.isConfirmed) {
            this.processRenewal(renewalId!, this.resolveApplicationType(app));
          }
        });
      });
  }

  private resolveApplicationType(application: UnifiedApplication): UnifiedApplication['type'] {
    const explicit = (application as any)?.type;
    if (explicit === 'license-renewal' || explicit === 'new-license' || explicit === 'salesman-barman' || explicit === 'company-registration') {
      return explicit;
    }

    const id = String((application as any)?.applicationId || '').trim().toUpperCase();
    if (id.startsWith('NLI/')) return 'new-license';
    if (id.startsWith('LIC/')) return 'license-renewal';
    if (id.startsWith('LRA/')) return 'license-renewal';
    if (id.startsWith('RSBM/')) return 'license-renewal';
    if (id.startsWith('SBM/')) return 'salesman-barman';
    return 'new-license';
  }

  private extractValidUpToDate(raw: any): Date | null {
    const value =
      raw?.valid_up_to ??
      raw?.validUpTo ??
      raw?.valid_upto ??
      raw?.valid_until ??
      raw?.validUntil ??
      null;

    if (!value) return null;
    if (value instanceof Date) return value;

    const str = String(value).trim();
    if (!str) return null;

    const dmY = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str);
    if (dmY) {
      const dd = Number(dmY[1]);
      const mm = Number(dmY[2]);
      const yyyy = Number(dmY[3]);
      const dt = new Date(yyyy, mm - 1, dd);
      return Number.isFinite(dt.getTime()) ? dt : null;
    }

    const dt = new Date(str);
    return Number.isFinite(dt.getTime()) ? dt : null;
  }

  private isRenewalAllowed(validUpTo: Date, timer: TimerConfig): boolean {
    const validMs = validUpTo.getTime();
    const now = Date.now();
    if (!Number.isFinite(validMs)) return true;

    const windowMs = Math.max(0, Number(timer?.delay_ms ?? 0) || 0);
    if (!windowMs) return true;

    if (now > validMs) return true;

    const eligibleFrom = validMs - windowMs;
    return now >= eligibleFrom;
  }

  private formatDDMMYYYY(date: Date): string {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = String(date.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  }

  private getTimerWindowLabel(timer: TimerConfig): string {
    const unitRaw = String(timer?.delay_unit ?? '').toLowerCase().trim();
    const value = Number(timer?.delay_value ?? 0);
    if (Number.isFinite(value) && value > 0 && unitRaw) {
      const unit = unitRaw.endsWith('s') ? unitRaw.slice(0, -1) : unitRaw;
      return `${value} ${unit}${value === 1 ? '' : 's'}`;
    }

    const seconds = Math.max(0, Number(timer?.delay_seconds ?? 0) || 0);
    if (!seconds) return '0 days';
    if (seconds % (24 * 60 * 60) === 0) {
      const days = seconds / (24 * 60 * 60);
      return `${days} day${days === 1 ? '' : 's'}`;
    }
    return `${seconds} second${seconds === 1 ? '' : 's'}`;
  }

  loadMyLicenses(): void {
    this.isLoading = true;
    this.unifiedDashboardService.getUnifiedApplicationsByStatus(true).subscribe({
      next: (result: any) => {
        const approvedApps = result.approved || [];
        this.activeRenewalLicenseIds = this.collectActiveRenewalLicenseIds(result);
        
        // Filter out LRA (License Renewal) and RSBM (Renewed Salesman Barman) applications
        const filteredApps = approvedApps.filter((app: UnifiedApplication) => {
          const id = String(app.applicationId || '').trim().toUpperCase();
          return !id.startsWith('LRA/') && !id.startsWith('RSBM/');
        });
        
        // 🔍 DEBUG: Log the first approved app to see structure
        if (filteredApps.length > 0) {
          console.log('📋 Sample approved application:', filteredApps[0]);
          console.log('📋 Sample raw data:', filteredApps[0].raw);
        }
        
        const sortedApps = filteredApps.sort((a: UnifiedApplication, b: UnifiedApplication) => {
          const dateA = this.getApprovalDate(a);
          const dateB = this.getApprovalDate(b);
          return dateB.getTime() - dateA.getTime();
        });
        this.dataSource.data = sortedApps;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading licenses:', error);
        this.isLoading = false;
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load your licenses. Please try again.' });
      }
    });
  }

  getApprovalDate(application: UnifiedApplication): Date {
    if (application.transactions && application.transactions.length > 0) {
      const timestamp = application.transactions[0].timestamp;
      return timestamp ? new Date(timestamp) : new Date();
    }
    return new Date();
  }

  formatApprovalDate(application: UnifiedApplication): string {
    const date = this.getApprovalDate(application);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  getTypeLabel(application: UnifiedApplication): string {
    const raw = application.raw || {};
    if (application.type === 'salesman-barman') {
      return raw.role || 'Salesman/Barman';
    }
    return application.licenseCategoryName || raw.license_category_name || 'License';
  }

  getDisplayName(application: UnifiedApplication): string {
    return application.establishmentName || application.applicantFullName || 'N/A';
  }

  viewApplication(application: UnifiedApplication): void {
    const dialogRef = this.dialog.open(ViewApplicationComponent, {
      width: '550px',
      maxHeight: '100%',
      data: { unifiedApp: application, tableType: 'approved' }
    });
    dialogRef.afterClosed().subscribe((result: boolean | undefined) => {
      if (result === true) this.loadMyLicenses();
    });
  }

  printLicense(application: UnifiedApplication): void {
    const appId = application.applicationId;
    const appType = application.type;
    if (!appId) {
      Swal.fire('Error', 'Could not find application ID', 'error');
      return;
    }
    this.unifiedDashboardService.getApplicationDetail(appId, appType).subscribe({
      next: (fullApp: UnifiedApplication) => {
        this.dialog.open(PrintApplicationComponent, {
          width: '450px',
          data: { application: fullApp, tableType: 'approved', returnUrl: this.router.url }
        });
      },
      error: (err: any) => {
        console.error('Error fetching application details:', err);
        // Fallback: still allow printing flow with the summary row data.
        // Print dialog already handles missing master-license records gracefully.
        this.dialog.open(PrintApplicationComponent, {
          width: '450px',
          data: { application, tableType: 'approved', returnUrl: this.router.url }
        });
      }
    });
  }

  renewLicense(application: UnifiedApplication): void {
    // Dynamic renewal eligibility window (from DB timer config).
    // Falls back to 90 days if timer config is missing/unavailable.
    this.renewLicenseUsingTimer(application);
    return;
    const raw = application.raw || {};
    
    // 🔍 COMPREHENSIVE DEBUG LOGGING
    console.log('=== FULL DEBUG INFO ===');
    console.log('Application ID:', application.applicationId);
    console.log('Type:', application.type);
    console.log('Raw object keys:', Object.keys(raw));
    console.log('Raw object:', raw);
    console.log('======================');
    
    // ✅ CORRECT FIX: Extract the actual license ID from the database
    const renewalId = this.extractLicenseId(raw, application);
    console.log('🔍 Extracted License ID:', renewalId);

    if (!renewalId) {
      Swal.fire({ 
        icon: 'error', 
        title: 'Cannot Renew', 
        html: `
          <p><strong>This license cannot be renewed yet.</strong></p>
          <p>Possible reasons:</p>
          <ul style="text-align: left; margin: 10px 20px;">
            <li>The license has not been issued yet</li>
            <li>The application is still under approval</li>
            <li>License data is incomplete</li>
          </ul>
          <p style="margin-top: 10px;"><small>Application ID: ${application.applicationId}</small></p>
          <p style="margin-top: 10px;"><small>Please check the browser console for detailed debug information.</small></p>
        ` 
      });
      return;
    }

    Swal.fire({
      title: 'Renew License?',
      html: `
        <div style="text-align: left; padding: 10px;">
          <p>Are you sure you want to renew this license?</p>
          <p><strong>License ID:</strong> ${renewalId}</p>
          <p><strong>Type:</strong> ${this.getTypeLabel(application)}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Renew License'
    }).then((result) => {
      if (result.isConfirmed) {
        this.processRenewal(renewalId!, application.type);
      }
    });
  }

  canShowRenewButton(application: UnifiedApplication): boolean {
    const licenseId = this.extractLicenseId(application.raw || {}, application);
    if (!licenseId) return false;
    return !this.activeRenewalLicenseIds.has(this.normalizeLicenseId(licenseId));
  }

  private collectActiveRenewalLicenseIds(result: any): Set<string> {
    const ids = new Set<string>();
    const activeGroups = [
      ...(result?.applied || []),
      ...(result?.pending || []),
      ...(result?.objection || []),
      ...(result?.awaitingPayment || [])
    ];

    for (const app of activeGroups) {
      if (app?.type !== 'license-renewal') continue;
      const raw = app.raw || {};
      const oldLicenseId = String(raw?.old_license_id || raw?.oldLicenseId || '').trim();
      if (oldLicenseId) ids.add(this.normalizeLicenseId(oldLicenseId));
    }

    return ids;
  }

  private normalizeLicenseId(value: string): string {
    return String(value || '').trim().toUpperCase();
  }

  /**
   * ✅ FIXED: Extract the License ID from the raw data
   * According to the database schema:
   * - The license ID is stored in the 'license' field or 'license_id' field
   * - License IDs look like: LA/101/2025-26/0001 (for license renewals)
   * - License IDs look like: NA/101/2025-26/0001 (for new licenses)
   * - License IDs look like: SB/101/2025-26/0001 (for salesman-barman)
   * - These are DIFFERENT from application IDs which have LIC/, NLI/, SBM/ prefixes
   */
  private extractLicenseId(raw: any, application: UnifiedApplication): string | null {
    console.log('🔍 extractLicenseId called with:', { raw, application });
    
    const appId = String(application.applicationId || raw.application_id || raw.applicationId || '').trim().toUpperCase();
    const expectedPrefix = appId.startsWith('RSBM/') ? 'SB/' : this.getExpectedLicensePrefix(application.type);
    console.log('  Expected license prefix:', expectedPrefix);
    
    // CRITICAL: For approved applications, check renewalOf field first
    // This is where the ACTUAL license that was issued is stored
    if (raw.renewalOf || raw.renewal_of || raw.renewalOfLicenseId || raw.renewal_of_license_id) {
      const renewalValue = raw.renewalOf || raw.renewal_of || raw.renewalOfLicenseId || raw.renewal_of_license_id;
      console.log('  Found renewalOf field:', renewalValue);
      
      if (typeof renewalValue === 'string' && renewalValue.startsWith(expectedPrefix)) {
        console.log('  ✅ Using renewalOf as license ID:', renewalValue);
        return renewalValue;
      }
      
      // If renewalOf is an object with license_id
      if (typeof renewalValue === 'object' && renewalValue !== null) {
        if (renewalValue.license_id) {
          const licenseId = String(renewalValue.license_id);
          if (licenseId.startsWith(expectedPrefix)) {
            console.log('  ✅ Found license_id in renewalOf object:', licenseId);
            return licenseId;
          }
        }
        if (renewalValue.id) {
          const licenseId = String(renewalValue.id);
          if (licenseId.startsWith(expectedPrefix)) {
            console.log('  ✅ Found id in renewalOf object:', licenseId);
            return licenseId;
          }
        }
      }
    }

    // STRATEGY 1: Check for 'license' field (most common)
    if (raw.license) {
      const licenseValue = raw.license;
      
      // If it's a direct string
      if (typeof licenseValue === 'string') {
        const licenseId = licenseValue.trim();
        if (licenseId.startsWith(expectedPrefix)) {
          console.log('  ✅ Found license as string:', licenseId);
          return licenseId;
        }
      }
      
      // If it's an object with nested license_id
      if (typeof licenseValue === 'object' && licenseValue !== null) {
        if (licenseValue.license_id) {
          const licenseId = String(licenseValue.license_id);
          if (licenseId.startsWith(expectedPrefix)) {
            console.log('  ✅ Found license_id in object:', licenseId);
            return licenseId;
          }
        }
        if (licenseValue.id) {
          const licenseId = String(licenseValue.id);
          if (licenseId.startsWith(expectedPrefix)) {
            console.log('  ✅ Found id in object:', licenseId);
            return licenseId;
          }
        }
      }
    }

    // STRATEGY 2: Check for license_id field directly
    if (raw.license_id) {
      const licenseId = String(raw.license_id).trim();
      if (licenseId.startsWith(expectedPrefix)) {
        console.log('  ✅ Found raw.license_id:', licenseId);
        return licenseId;
      }
    }

    // STRATEGY 3: Check for licenseId (camelCase)
    if (raw.licenseId) {
      const licenseId = String(raw.licenseId).trim();
      if (licenseId.startsWith(expectedPrefix)) {
        console.log('  ✅ Found raw.licenseId:', licenseId);
        return licenseId;
      }
    }

    // STRATEGY 4: Check if there's a license object with an ID
    if (raw.license_object && typeof raw.license_object === 'object') {
      if (raw.license_object.license_id) {
        const licenseId = String(raw.license_object.license_id);
        if (licenseId.startsWith(expectedPrefix)) {
          console.log('  ✅ Found license_object.license_id:', licenseId);
          return licenseId;
        }
      }
    }

    // STRATEGY 5: For approved applications, the license should exist
    // Try to construct it from the application ID pattern
    // LIC/101/2025-26/0001 -> LA/101/2025-26/0001
    // NLI/101/2025-26/0001 -> NA/101/2025-26/0001
    // SBM/101/2025-26/0001 -> SB/101/2025-26/0001
    if (appId) {
      console.log('  Attempting to derive license ID from application ID:', appId);
      let derivedLicenseId = null;
      
      if (appId.startsWith('LIC/')) {
        derivedLicenseId = appId.replace('LIC/', 'LA/');
      } else if (appId.startsWith('NLI/')) {
        derivedLicenseId = appId.replace('NLI/', 'NA/');
      } else if (appId.startsWith('SBM/')) {
        derivedLicenseId = appId.replace('SBM/', 'SB/');
      }
      
      if (derivedLicenseId) {
        console.log('  ⚠️ Derived license ID (fallback):', derivedLicenseId);
        console.log('  ⚠️ WARNING: This is a fallback mechanism. The license ID should be in raw data.');
        return derivedLicenseId;
      }
    }

    console.log('  ❌ No valid license ID found');
    return null;
  }

  /**
   * Get the expected license ID prefix based on application type
   */
  private getExpectedLicensePrefix(type: UnifiedApplication['type']): string {
    switch (type) {
      case 'license-renewal':
        return 'LA/';
      case 'new-license':
        return 'NA/';
      case 'salesman-barman':
        return 'SB/';
      default:
        return '';
    }
  }

  private processRenewal(renewalId: string, type: UnifiedApplication['type']): void {
    Swal.fire({ 
      title: 'Processing Renewal...', 
      html: '<p>Please wait while we initiate your license renewal.</p>',
      allowOutsideClick: false, 
      didOpen: () => { Swal.showLoading(); } 
    });

    let renewalObservable;
    
    if (type === 'salesman-barman') {
      console.log('🔄 Using Salesman/Barman renewal endpoint');
      renewalObservable = this.salesmanBarmanService.renewLicense(renewalId);
    } else if (type === 'license-renewal') {
      console.log('🔄 Using License Renewal (old) endpoint');
      renewalObservable = this.licenseApplicationService.renewLicense(renewalId);
    } else if (type === 'new-license') {
      console.log('🔄 Using License Renewal Application (LRA) endpoint');
      renewalObservable = this.licenseApplicationService.initiateLicenseRenewalApplication(renewalId);
    } else {
      Swal.fire({ 
        icon: 'info', 
        title: 'Not Available', 
        text: `Renewal for license type "${type}" is not yet implemented.` 
      });
      return;
    }

    renewalObservable.subscribe({
      next: (response: any) => {
        console.log('✅ Renewal response:', response);
        
        const newAppId =
          response?.application?.application_id ||
          response?.application?.applicationId ||
          response?.applicationId ||
          response?.application_id ||
          response?.applicationId ||
          'N/A';
        
        Swal.fire({ 
          icon: 'success', 
          title: 'Renewal Initiated Successfully!', 
          html: `
            <div style="text-align: left; padding: 10px;">
              <p>Your license renewal application has been created and submitted.</p>
              <p><strong>New Application ID:</strong> ${newAppId}</p>
              <p style="margin-top: 15px; font-size: 0.9em; color: #666;">
                You can track the status of your renewal application in your dashboard.
              </p>
            </div>
          `, 
          confirmButtonText: 'Go to Dashboard',
          showCancelButton: true,
          cancelButtonText: 'Stay Here'
        }).then((result) => { 
          if (result.isConfirmed) { 
            this.closeDialog();
            // ✅ FIXED: Navigate to the correct licensee dashboard route
            this.router.navigate(['/licensee/dashboard'], { queryParams: { section: 'license-renewal' } });
          } else {
            this.loadMyLicenses();
          }
        });
      },
      error: (error: any) => {
        console.error('❌ Renewal error:', error);
        
        let errorTitle = 'Renewal Failed';
        let errorMessage = 'Failed to renew license. Please try again.';
        
        if (error.status === 404) {
          errorTitle = 'License Not Found';
          errorMessage = `
            <p>The license with ID "${renewalId}" could not be found.</p>
            <p><small>This might mean:</small></p>
            <ul style="text-align: left; margin: 10px 20px; font-size: 0.9em;">
              <li>The license has not been issued yet</li>
              <li>The ID is incorrect</li>
              <li>The license has been revoked or expired</li>
            </ul>
            <p style="font-size: 0.85em; color: #999;">Attempted ID: ${renewalId}</p>
          `;
        } else if (error.status === 400) {
          errorTitle = 'Invalid Renewal Request';
          const detail = error.error?.detail || error.error?.message || '';
          errorMessage = detail || 'The renewal request is not valid. Please check the license details.';
        } else if (error.status === 403) {
          errorTitle = 'Permission Denied';
          errorMessage = 'You do not have permission to renew this license.';
        } else if (error.error?.detail) {
          errorMessage = error.error.detail;
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        Swal.fire({ 
          icon: 'error', 
          title: errorTitle, 
          html: errorMessage
        });
      }
    });
  }

  closeDialog(): void { 
    this.dialogRef.close(); 
  }
  
  hasData(): boolean { 
    return this.dataSource.data && this.dataSource.data.length > 0; 
  }
}
