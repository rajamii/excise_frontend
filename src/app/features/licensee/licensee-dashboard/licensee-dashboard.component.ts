// licensee-dashboard.component.ts - FIXED VERSION with company-registration support
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { MaterialModule } from '../../../shared/material.module';
import { MatTableDataSource } from '@angular/material/table';
import { DashboardCount } from '../../../core/models/dashboard.model';
import { ApplicationTableComponent } from './application-table/application-table.component';
import { forkJoin, Subscription, of } from 'rxjs';
import { finalize, filter, switchMap, catchError, take } from 'rxjs/operators';
import { UnifiedDashboardService } from '../../../core/services/unified-dashboard.service';
import { UnifiedApplication } from '../../../core/models/unified-application.model';
import { SalesmanBarmanRegistrationService } from '../../../core/services/salesman-barman-registration.service';
import { DashboardConfigService } from '../../../core/services/dashboard-config.service';
import { SidebarPendingBadgeService } from '../../../shared/services/sidebar-pending-badge.service';
import { TimerConfigService } from '../../../core/services/timer-config.service';
import { RenewalConfigService } from '../../../core/services/renewal-config.service';
import { ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MyLicensesComponent } from '../my-licenses/my-licenses.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-licensee-dashboard',
  standalone: true,
  imports: [
    MaterialModule,
    ApplicationTableComponent
  ],
  templateUrl: './licensee-dashboard.component.html',
  styleUrl: './licensee-dashboard.component.scss'
})
export class LicenseeDashboardComponent implements OnInit, OnDestroy {
  dashboardCounts: DashboardCount & { awaitingPayment?: number } = {
    applied: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    awaitingPayment: 0
  };

  awaitingPaymentBreakdown = {
    newLicense: 0,
    licenseRenewal: 0,
    salesmanBarman: 0,
    companyRegistration: 0,
    specialPermit: 0
  };

  isLoading = false;

  appliedDataSource = new MatTableDataSource<UnifiedApplication>();
  pendingDataSource = new MatTableDataSource<UnifiedApplication>();
  approvedDataSource = new MatTableDataSource<UnifiedApplication>();
  rejectedDataSource = new MatTableDataSource<UnifiedApplication>();

  displayedColumns: string[] = ['slNo', 'id', 'currentStage', 'remarks', 'performedBy', 'actions'];
  activeTable: 'default' | 'applied' | 'pending' | 'rejected' = 'default';

  renewalWarnings: {
    licenseId: string,
    type: string,
    establishmentName: string,
    validUpTo: Date,
    finalDateStr: string,
    isExpired: boolean
  }[] = [];

  private routerSubscription?: Subscription;
  private supplyChainSubscription?: Subscription;
  supplyChainPendingCounts: Record<string, number> = {};

  constructor(
    private salesmanBarmanService: SalesmanBarmanRegistrationService,
    private unifiedDashboardService: UnifiedDashboardService,
    private dashboardConfigService: DashboardConfigService,
    private sidebarPendingBadgeService: SidebarPendingBadgeService,
    private router: Router,
    private timerConfigService: TimerConfigService,
    private renewalConfigService: RenewalConfigService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) { }

  showTable(table: 'applied' | 'pending' | 'rejected') {
    this.activeTable = table;
  }

  goBack() {
    this.activeTable = 'default';
  }

  openFinalLicense(application: UnifiedApplication): void {
    const applicationId =
      application?.applicationId ||
      (application as any)?.raw?.application_id ||
      (application as any)?.raw?.applicationId ||
      '';

    this.router.navigate(['/final-license'], {
      queryParams: {
        applicationId,
        type: application?.type || '',
        returnUrl: this.router.url
      }
    });
  }

  viewApplication(application: UnifiedApplication): void {
    const applicationId =
      application?.applicationId ||
      (application as any)?.raw?.application_id ||
      (application as any)?.raw?.applicationId ||
      '';

    if (!applicationId) return;

    const type = (application as any)?.type || (application as any)?.raw?.type || '';

    this.router.navigate(['/supply-chain-view'], {
      queryParams: {
        id: applicationId,
        ref: applicationId,
        type,
        source: 'licensee'
      }
    });
  }

  ngOnInit(): void {
    this.loadDashboardData();

    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      if (event.url.includes('/dashboard')) {
        this.activeTable = 'default';
        this.loadDashboardData();
      }
    });
  }

    private formatDDMMYYYY(date: Date): string {
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yyyy = date.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }

    openMyLicensesForRenewal(): void {
      const dialogRef = this.dialog.open(MyLicensesComponent, {
        width: '1200px',
        maxHeight: '90vh'
      });

      dialogRef.afterClosed().subscribe(() => {
        this.loadDashboardData();
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

    private checkRenewalEligibility(approvedWithoutRenewal: UnifiedApplication[]): void {
      const fallbackSeconds = 90 * 24 * 60 * 60;

      forkJoin({
        timer: this.timerConfigService.getTimerConfig('LICENSE_RENEWAL_REMINDER_TIMER', fallbackSeconds).pipe(take(1)),
        renewalConfig: this.renewalConfigService.getConfig().pipe(take(1))
      }).subscribe(({ timer, renewalConfig }) => {
        let newWarnings: any[] = [];
        const windowMs = Math.max(0, Number(timer?.delay_ms ?? 0) || 0);
        if (!windowMs) return;

        approvedWithoutRenewal.forEach(app => {
          if (app.type === 'license-renewal') {
            return;
          }
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

          if (!validUpTo) {
            return;
          }

          const validMs = validUpTo.getTime();
          const now = Date.now();
          const eligibleFrom = validMs - windowMs;

          if (now >= eligibleFrom) {
            const licenseId = this.extractLicenseId(app);
            if (licenseId) {
              const finalDateStr = this.formatDDMMYYYY(validUpTo);
              const isExpired = now > validMs;
              newWarnings.push({
                licenseId,
                type: this.getTypeLabel(app.type || ''),
                establishmentName: app.establishmentName || app.applicantFullName || 'N/A',
                validUpTo,
                finalDateStr,
                isExpired
              });
            }
          }
        });
        
        this.renewalWarnings = newWarnings;
        
        try {
          if (this.cdr) {
            this.cdr.detectChanges();
          }
        } catch (e) {
          console.error(e);
        }
      });
    }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.supplyChainSubscription) {
      this.supplyChainSubscription.unsubscribe();
    }
  }

  getSupplyChainPendingCount(section: string): number {
    const key = String(section || '').trim().toLowerCase();
    return Number(this.supplyChainPendingCounts?.[key] || 0);
  }

  getSupplyChainPendingTotal(): number {
    return this.getSupplyChainPendingCount('requisition') + this.getSupplyChainPendingCount('hologram');
  }

  private refreshSupplyChainPendingCounts(): void {
    if (this.supplyChainSubscription) {
      this.supplyChainSubscription.unsubscribe();
    }

    this.supplyChainSubscription = this.sidebarPendingBadgeService
      .refresh(['requisition', 'hologram'], false, { audience: 'licensee', mode: 'full' })
      .subscribe({
        next: (counts) => {
          this.supplyChainPendingCounts = counts || {};
        },
        error: () => {
          this.supplyChainPendingCounts = {};
        }
      });
  }

  loadDashboardData(): void {
    this.isLoading = true;

    this.dashboardConfigService
      .getCurrentUserDashboardConfigCached()
      .pipe(
        switchMap((config) =>
          forkJoin({
            counts: this.unifiedDashboardService.getUnifiedDashboardCounts(config, true),
            applications: this.unifiedDashboardService.getUnifiedApplicationsByStatus(true, config)
          })
        ),
        catchError((error) => {
          console.error('❌ Error loading dashboard config:', error);
          return forkJoin({
            counts: this.unifiedDashboardService.getUnifiedDashboardCounts(undefined, true),
            applications: this.unifiedDashboardService.getUnifiedApplicationsByStatus(true)
          });
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (result) => {
          // DEDUPLICATE ALL APPLICATIONS FIRST
          let filteredApplications = {
            applied: this.deduplicateApplications(result.applications.applied || []),
            pending: this.deduplicateApplications(result.applications.pending || []),
            awaitingPayment: this.deduplicateApplications(result.applications.awaitingPayment || []),
            approved: this.deduplicateApplications(result.applications.approved || []),
            rejected: this.deduplicateApplications(result.applications.rejected || [])
          };

          // MOVE APPROVED LICENSES WITH ACTIVE RENEWALS TO APPLIED
          const renewedLicenseIds = this.getRenewedLicenseIds(
            filteredApplications.applied,
            filteredApplications.pending,
            filteredApplications.awaitingPayment
          );

          // Separate approved licenses into those with renewals and those without
          const approvedWithRenewal: UnifiedApplication[] = [];
          const approvedWithoutRenewal: UnifiedApplication[] = [];

          filteredApplications.approved.forEach((app: UnifiedApplication) => {
            const licenseId = this.extractLicenseId(app);
            const isRenewed = app.type === 'new-license' && licenseId && renewedLicenseIds.has(licenseId);
            
            if (isRenewed) {
              // console.log(`Dashboard: Moving approved license ${licenseId} to Applied - has active renewal`);
              // Mark the license as "being renewed"
              const renewedApp = {
                ...app,
                currentStage: 'renewal_in_progress',
                currentStageName: 'Renewal In Progress'
              };
              approvedWithRenewal.push(renewedApp);
            } else {
              approvedWithoutRenewal.push(app);
            }
          });

          // Combine applied with approved licenses that are being renewed
          const allApplied = [...filteredApplications.applied, ...approvedWithRenewal];

          // Store counts
          this.dashboardCounts = {
            applied: allApplied.length, // Includes renewed licenses
            pending: filteredApplications.pending.length,
            awaitingPayment: filteredApplications.awaitingPayment.length,
            approved: approvedWithoutRenewal.length, // Only licenses without active renewals
            rejected: filteredApplications.rejected.length
          };

          this.awaitingPaymentBreakdown = {
            newLicense: filteredApplications.awaitingPayment.filter(app => app.type === 'new-license').length,
            licenseRenewal: filteredApplications.awaitingPayment.filter(app => app.type === 'license-renewal').length,
            salesmanBarman: filteredApplications.awaitingPayment.filter(app => app.type === 'salesman-barman').length,
            companyRegistration: filteredApplications.awaitingPayment.filter(app => app.type === 'company-registration').length,
            specialPermit: filteredApplications.awaitingPayment.filter(app => app.type === 'special-permit').length
          };

          // console.log(`📊 Dashboard Counts - Applied: ${this.dashboardCounts.applied} (${approvedWithRenewal.length} renewals), Pending: ${this.dashboardCounts.pending}, Awaiting Payment: ${this.dashboardCounts.awaitingPayment}, Approved: ${this.dashboardCounts.approved}, Rejected: ${this.dashboardCounts.rejected}`);

          // Update datasources
          this.updateDataSources({
            applied: allApplied, //  Includes renewed licenses
            pending: [...filteredApplications.pending, ...filteredApplications.awaitingPayment],
            approved: approvedWithoutRenewal, //  Only licenses without renewals
            rejected: filteredApplications.rejected
          });

          this.checkRenewalEligibility(approvedWithoutRenewal);

          // Include actionable supply-chain pending items on dashboard (e.g., requisition payment pending).
          this.refreshSupplyChainPendingCounts();
        },
        error: (error) => {
          console.error('❌ Error loading dashboard data:', error);
          this.dashboardCounts = { applied: 0, pending: 0, awaitingPayment: 0, approved: 0, rejected: 0 };
          this.clearDataSources();
          this.supplyChainPendingCounts = {};
        }
      });
  }

  private deduplicateApplications(applications: UnifiedApplication[]): UnifiedApplication[] {
    const seen = new Map<string, UnifiedApplication>();
    
    applications.forEach(app => {
      const appId = app.applicationId || app.raw?.application_id || app.raw?.applicationId;
      
      if (appId && !seen.has(appId)) {
        seen.set(appId, app);
      } else if (appId) {
        console.warn(`⚠️ Dashboard: Duplicate application removed: ${appId}`);
      }
    });
    
    return Array.from(seen.values());
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
      if (field && typeof field === 'string' && this.isValidLicenseId(field)) {
        return field;
      } else if (field && typeof field === 'object' && (field as any).id) {
        const licenseId = (field as any).id;
        if (this.isValidLicenseId(licenseId)) {
          return licenseId;
        }
      }
    }
        // Fallback: derive from application ID
      const appId = app.applicationId;
      if (appId) {
        if (appId.startsWith('LIC/')) return appId.replace('LIC/', 'LA/');
        if (appId.startsWith('NLI/')) return appId.replace('NLI/', 'LA/');
        if (appId.startsWith('SBM/')) return appId.replace('SBM/', 'SB/');
        if (appId.startsWith('RSBM/')) return appId.replace('RSBM/', 'SB/');
        if (appId.startsWith('COMP/')) return appId.replace('COMP/', 'CR/1101/');
        if (appId.startsWith('CCOL/')) return appId.replace('CCOL/', 'CC/1101/');
        if (appId.startsWith('RCOL/')) return appId.replace('RCOL/', 'CC/1101/');
      }
      return null;
    }

    private isValidLicenseId(licenseId: string): boolean {
    if (!licenseId || typeof licenseId !== 'string') return false;
    const trimmed = licenseId.trim();
    // ✅ ADDED: 'COMP/', 'CREG/', 'CR/', 'CC/', 'CCOL/', 'RCOL/' prefixes for company registration/collaboration
    const validPrefixes = ['LA/', 'NA/', 'SB/', 'CR/', 'LIC/', 'NLI/', 'SBM/', 'COMP/', 'CREG/', 'CC/', 'CCOL/', 'RCOL/'];
    const hasValidPrefix = validPrefixes.some(prefix => trimmed.startsWith(prefix));
    if (!hasValidPrefix) return false;
    const parts = trimmed.split('/');
    return parts.length >= 3 && trimmed.length >= 10;
  }

  private getRenewedLicenseIds(
    applied: UnifiedApplication[], 
    pending: UnifiedApplication[], 
    awaitingPayment: UnifiedApplication[]
  ): Set<string> {
    const renewedIds = new Set<string>();
    
    [...applied, ...pending, ...awaitingPayment].forEach(app => {
      if (app.type !== 'license-renewal') {
        return;
      }
      const raw = app.raw || {};
      
      // PRIORITY 1: Check renewalOf or old license fields
      const renewalOfValue = 
        raw.renewalOf || 
        raw.renewal_of || 
        raw.renewalOfLicenseId || 
        raw.renewal_of_license_id || 
        raw.old_license_id || 
        raw.oldLicenseId || 
        raw.old_license || 
        raw.oldLicense;
      
      if (renewalOfValue) {
        let licenseIdStr = '';
        
        if (typeof renewalOfValue === 'string') {
          licenseIdStr = renewalOfValue;
        } else if (typeof renewalOfValue === 'object' && renewalOfValue !== null) {
          licenseIdStr = renewalOfValue.license_id || renewalOfValue.id || String(renewalOfValue);
        } else {
          licenseIdStr = String(renewalOfValue);
        }
        
        if (licenseIdStr && this.isValidLicenseId(licenseIdStr)) {
          renewedIds.add(licenseIdStr);
          // console.log(`🔄 Dashboard: Found renewed license ID from renewalOf/oldLicense: ${licenseIdStr} (App: ${app.applicationId})`);
          return;
        }
      }
      
      // PRIORITY 2: Check license fields
      const licenseValue = raw.license || raw.license_id || raw.issued_license_id || raw.issuedLicenseId;
      
      if (licenseValue) {
        let licenseIdStr = '';
        
        if (typeof licenseValue === 'string') {
          licenseIdStr = licenseValue;
        } else if (typeof licenseValue === 'object' && licenseValue !== null) {
          licenseIdStr = licenseValue.license_id || licenseValue.id || String(licenseValue);
        } else {
          licenseIdStr = String(licenseValue);
        }
        
        if (licenseIdStr && this.isValidLicenseId(licenseIdStr)) {
          renewedIds.add(licenseIdStr);
          // console.log(`🔄 Dashboard: Found renewed license ID from license field: ${licenseIdStr} (App: ${app.applicationId})`);
        }
      }
      
      // PRIORITY 3: Derive from application ID
      const appId = app.applicationId;
      if (appId) {
        let derivedLicenseId = null;
        
        if (appId.startsWith('LIC/')) {
          derivedLicenseId = appId.replace('LIC/', 'LA/');
        } else if (appId.startsWith('NLI/')) {
          derivedLicenseId = appId.replace('NLI/', 'NA/');
        } else if (appId.startsWith('SBM/')) {
          derivedLicenseId = appId.replace('SBM/', 'SB/');
        } else if (appId.startsWith('COMP/')) {
          derivedLicenseId = appId.replace('COMP/', 'CR/1101/');
        } else if (appId.startsWith('LRA/')) {
          // A renewal application LRA/01/2026-27/... could be renewing an NA/ or LA/ license.
          // Since it's ambiguous, we can add both potential derivations.
          renewedIds.add(appId.replace('LRA/', 'LA/'));
          renewedIds.add(appId.replace('LRA/', 'NA/'));
        } else if (appId.startsWith('RCR/')) {
          renewedIds.add(appId.replace('RCR/', 'CR/'));
        } else if (appId.startsWith('RSBM/')) {
          renewedIds.add(appId.replace('RSBM/', 'SB/'));
        } else if (appId.startsWith('RCOL/')) {
          renewedIds.add(appId.replace('RCOL/', 'CC/'));
        }
        
        if (derivedLicenseId && this.isValidLicenseId(derivedLicenseId)) {
          renewedIds.add(derivedLicenseId);
          // console.log(`🔄 Dashboard: Derived license ID from app ID: ${derivedLicenseId} (App: ${appId})`);
        }
      }
    });
    
    // console.log(`🔄 Dashboard: Total renewed license IDs to hide: ${renewedIds.size}`, Array.from(renewedIds));
    return renewedIds;
  }

  private updateDataSources(result: {
    applied: UnifiedApplication[];
    pending: UnifiedApplication[];
    approved: UnifiedApplication[];
    rejected: UnifiedApplication[];
  }): void {
    this.appliedDataSource.data = result.applied || [];
    this.pendingDataSource.data = result.pending || [];
    this.approvedDataSource.data = result.approved || [];
    this.rejectedDataSource.data = result.rejected || [];
  }

  private clearDataSources(): void {
    this.appliedDataSource.data = [];
    this.pendingDataSource.data = [];
    this.approvedDataSource.data = [];
    this.rejectedDataSource.data = [];
  }

  onPaymentConfirmed(application: UnifiedApplication): void {
      Swal.fire({
      title: 'Confirm Payment Receipt',
      text: `Have you received the payment for application ${application.applicationId}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Payment Received',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed) {
        this.processPayment(application);
      }
    });
  }

  // ✅ ADDED: Helper to get type label
  getTypeLabel(type: string): string {
    switch (type) {
      case 'license-renewal': return 'License Renewal';
      case 'new-license': return 'New License';
      case 'salesman-barman': return 'Salesman/Barman';
      case 'company-registration': return 'Company Registration';
      case 'company-collaboration': return 'Company Collaboration';
      default: return type;
    }
  }

  getAwaitingPaymentBreakdownText(): string {
    const parts: string[] = [];
    if (this.awaitingPaymentBreakdown.newLicense > 0) {
      parts.push(`New License (${this.awaitingPaymentBreakdown.newLicense})`);
    }
    if (this.awaitingPaymentBreakdown.licenseRenewal > 0) {
      parts.push(`Renewal (${this.awaitingPaymentBreakdown.licenseRenewal})`);
    }
    if (this.awaitingPaymentBreakdown.salesmanBarman > 0) {
      parts.push(`Salesman/Barman (${this.awaitingPaymentBreakdown.salesmanBarman})`);
    }
    if (this.awaitingPaymentBreakdown.companyRegistration > 0) {
      parts.push(`Company Registration (${this.awaitingPaymentBreakdown.companyRegistration})`);
    }
    if (this.awaitingPaymentBreakdown.specialPermit > 0) {
      parts.push(`Dry Day Permit (${this.awaitingPaymentBreakdown.specialPermit})`);
    }
    return parts.length > 0 ? parts.join(', ') : 'Fees pending';
  }

  private processPayment(application: UnifiedApplication): void {
    Swal.fire({
      title: 'Processing...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    this.salesmanBarmanService.getNextStages(application.applicationId).subscribe({
      next: (stages: any[]) => {
        const approvalStage = stages.find(s => {
          const stageName = (s.name || s.stage_name || '').toLowerCase();
          const stageId = s.id || s.stage_id;
          return stageName === 'approved' || stageId === 12 || stageId === 16;
        });

        if (!approvalStage) {
          console.error('❌ No approval stage found in:', stages);
          Swal.fire('Error', 'No approval stage found. Available stages: ' + stages.map(s => s.name || s.id).join(', '), 'error');
          return;
        }

        const stageId = approvalStage.id || approvalStage.stage_id;
        this.salesmanBarmanService.advanceStage(application.applicationId, stageId, {
          payment_confirmed: true,
          remarks: 'Payment received and confirmed'
        }).subscribe({
          next: (response) => {
            Swal.fire({
              title: 'Success!',
              text: 'Payment confirmed and application approved.',
              icon: 'success'
            }).then(() => {
              this.loadDashboardData();
            });
          },
          error: (err) => {
            console.error('❌ Error advancing application:', err);
            Swal.fire('Error', err?.error?.detail || 'Failed to process payment.', 'error');
          }
        });
      },
      error: (err) => {
        console.error('❌ Error fetching stages:', err);
        Swal.fire('Error', 'Failed to fetch approval stages: ' + (err?.error?.detail || err?.message || 'Unknown error'), 'error');
      }
    });
  }
}
