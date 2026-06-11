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
  private allAppsResult: any = null;

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
      if (url.startsWith('/final-license')) this.closeDialog();
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

        // SOP: Block Salesman/Barman renewal if New/Main license renewal is active/required but not initiated
        if (resolvedType === 'salesman-barman') {
          const newLicenseApps = this.dataSource.data.filter(item => this.resolveApplicationType(item) === 'new-license');
          for (const newLicenseApp of newLicenseApps) {
            let newLicValidUpTo = this.extractValidUpToDate(newLicenseApp.raw || {});
            if (!newLicValidUpTo && renewalConfig) {
              const month = renewalConfig.renewal_month || 3;
              const day = renewalConfig.renewal_day || 31;
              const now = new Date();
              let year = now.getFullYear();
              if (now.getMonth() + 1 > month || (now.getMonth() + 1 === month && now.getDate() > day)) {
                  year++;
              }
              newLicValidUpTo = new Date(year, month - 1, day, 23, 59, 59);
            }

            if (newLicValidUpTo) {
              const isNewLicEligible = this.isRenewalAllowed(newLicValidUpTo, timer);
              const newLicId = this.extractLicenseId(newLicenseApp.raw || {}, newLicenseApp);
              const hasActiveRenewal = newLicId ? this.activeRenewalLicenseIds.has(this.normalizeLicenseId(newLicId)) : false;

              if (isNewLicEligible && !hasActiveRenewal) {
                Swal.fire({
                  icon: 'error',
                  title: 'Renewal Blocked',
                  html: `
                    <p>Renewal of Salesman/Barman registration is not allowed.</p>
                    <p>Please renew your <strong>New License (${newLicId || 'Main License'})</strong> first.</p>
                  `
                });
                return;
              }
            }
          }
        }

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

        const appType = this.resolveApplicationType(app);
        if (appType === 'new-license') {
          // Robust category ID resolution
          let catId = 0;
          if (raw.license_category_id) {
            catId = Number(raw.license_category_id);
          } else if (raw.licenseCategoryId) {
            catId = Number(raw.licenseCategoryId);
          } else if (raw.license_category) {
            if (typeof raw.license_category === 'object' && raw.license_category !== null) {
              catId = Number(raw.license_category.id ?? raw.license_category.pk ?? 0);
            } else {
              catId = Number(raw.license_category);
            }
          } else if (raw.licenseCategory) {
            if (typeof raw.licenseCategory === 'object' && raw.licenseCategory !== null) {
              catId = Number(raw.licenseCategory.id ?? raw.licenseCategory.pk ?? 0);
            } else {
              catId = Number(raw.licenseCategory);
            }
          }

          // Robust category Name resolution
          let catName = '';
          if (raw.license_category_name) {
            catName = String(raw.license_category_name).toLowerCase();
          } else if (raw.licenseCategoryName) {
            catName = String(raw.licenseCategoryName).toLowerCase();
          } else if (raw.license_category && typeof raw.license_category === 'object') {
            catName = String(raw.license_category.name ?? raw.license_category.license_category ?? '').toLowerCase();
          } else if (app.licenseCategoryName) {
            catName = String(app.licenseCategoryName).toLowerCase();
          }

          const isManufacturingOrHomestay = 
            catId === 1 || 
            catName.includes('manufacturing') || 
            catId === 9 || 
            catName.includes('homestay');

          if (isManufacturingOrHomestay) {
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
                this.processRenewal(renewalId!, 'new-license');
              }
            });
          } else {
            const lastModeRaw = String(raw.mode_of_operation ?? raw.modeOfOperation ?? 'Self').trim();
            let lastMode = 'Self';
            if (lastModeRaw.toLowerCase() === 'salesman') lastMode = 'Salesman';
            else if (lastModeRaw.toLowerCase() === 'barman') lastMode = 'Barman';

            const salesmanOnlyIds = [14, 10, 6, 12];
            const barmanOnlyIds = [13, 3, 4, 5, 7, 8, 11];

            let allowedModes: string[] = [];
            if (
              salesmanOnlyIds.includes(catId) || 
              catName.includes('retail shop') || 
              catName.includes('departmental store') || 
              catName.includes('pachwai') || 
              catName.includes('salesman')
            ) {
              allowedModes = ['Self', 'Salesman'];
            } else if (
              barmanOnlyIds.includes(catId) || 
              catName.includes('bar') || 
              catName.includes('hotel') || 
              catName.includes('club') || 
              catName.includes('casino') || 
              catName.includes('barman')
            ) {
              allowedModes = ['Self', 'Barman'];
            } else {
              allowedModes = ['Self', 'Salesman', 'Barman'];
            }

            if (!allowedModes.includes(lastMode)) {
              lastMode = 'Self';
            }

            // Check if there are existing SBM licenses linked to this main license across all groups (including failed/pending)
            let hasSalesmanSbm = false;
            let hasBarmanSbm = false;

            const allGroups = this.allAppsResult ? [
              ...(this.allAppsResult.applied || []),
              ...(this.allAppsResult.pending || []),
              ...(this.allAppsResult.objection || []),
              ...(this.allAppsResult.approved || []),
              ...(this.allAppsResult.awaitingPayment || []),
              ...(this.allAppsResult.rejected || [])
            ] : [];

            const sbmApps = allGroups.filter(item => this.resolveApplicationType(item) === 'salesman-barman');
            for (const sbm of sbmApps) {
              const sbmRaw = sbm.raw || {};
              const linkedAppId = String(
                sbmRaw.newLicenseApplicationId ?? 
                sbmRaw.new_license_application_id ?? 
                sbmRaw.newLicenseApplication ?? 
                sbmRaw.new_license_application ?? 
                ''
              ).trim().toUpperCase();
              
              const linkedLicenseId = String(
                sbmRaw.licenseIdDisplay ?? 
                sbmRaw.license_id_display ?? 
                sbmRaw.renewalOfLicenseId ?? 
                sbmRaw.renewal_of_license_id ?? 
                sbmRaw.license ?? 
                sbmRaw.licenseId ?? 
                sbmRaw.license_id ?? 
                ''
              ).trim().toUpperCase();
              
              const isLinked = (linkedAppId && linkedAppId === app.applicationId.toUpperCase()) || 
                               (linkedLicenseId && linkedLicenseId === renewalId.toUpperCase());

              if (isLinked) {
                const sbmRole = String(sbmRaw.role || '').toLowerCase();
                if (sbmRole.includes('salesman')) {
                  hasSalesmanSbm = true;
                } else if (sbmRole.includes('barman')) {
                  hasBarmanSbm = true;
                }
              }
            }

            // Gracefully map SBM role if it doesn't match the category's constraint
            if (hasSalesmanSbm && allowedModes.includes('Salesman')) {
              // already matches
            } else if (hasBarmanSbm && allowedModes.includes('Barman')) {
              // already matches
            } else if (hasSalesmanSbm && allowedModes.includes('Barman') && !allowedModes.includes('Salesman')) {
              hasBarmanSbm = true;
            } else if (hasBarmanSbm && allowedModes.includes('Salesman') && !allowedModes.includes('Barman')) {
              hasSalesmanSbm = true;
            }

            // Override default selection if SBM application is present
            if (hasSalesmanSbm && allowedModes.includes('Salesman')) {
              lastMode = 'Salesman';
            } else if (hasBarmanSbm && allowedModes.includes('Barman')) {
              lastMode = 'Barman';
            }

            if (!allowedModes.includes(lastMode)) {
              lastMode = 'Self';
            }

            const modeOptionsHtml = allowedModes.map(mode => {
              const selected = mode === lastMode ? 'selected' : '';
              let label = mode;
              if (mode === 'Salesman' && hasSalesmanSbm) {
                label = 'Salesman ✓';
              } else if (mode === 'Barman' && hasBarmanSbm) {
                label = 'Barman ✓';
              }
              return `<option value="${mode}" ${selected}>${label}</option>`;
            }).join('');

            const hasAdditionalCharges = [10, 12, 14].includes(catId) || 
                                         catName.includes('pachwai') || 
                                         catName.includes('draught beer') || 
                                         catName.includes('draught_beer') || 
                                         catName.includes('retail shop');

            const pachwaiChecked = !!(raw.pachwai ?? raw.pachwai_flag ?? raw.pachwai_selected);
            const draughtBeerChecked = !!(raw.draught_beer ?? raw.draught_beer_flag ?? raw.draught_beer_selected ?? raw.draughtBeer);

            Swal.fire({
              title: 'Renew License Options',
              html: `
                <div style="text-align: left; font-family: 'Inter', sans-serif; padding: 5px 10px;">
                  <p style="margin-bottom: 20px; color: #4a5568; font-size: 0.95rem; line-height: 1.5;">
                    Please review and select the options below for renewing license <strong>${renewalId}</strong>.
                    Your renewal fees will be calculated based on these selections.
                  </p>

                  <!-- Mode of Operation Dropdown -->
                  <div style="margin-bottom: 20px;">
                    <label for="swal-mode-of-operation" style="display: block; font-weight: 600; color: #2d3748; margin-bottom: 8px; font-size: 0.9rem;">
                      Mode of Operation
                    </label>
                    <select id="swal-mode-of-operation" style="
                      display: block; 
                      width: 100%; 
                      padding: 10px 12px; 
                      font-size: 0.9rem; 
                      border: 1px solid #cbd5e0; 
                      border-radius: 6px; 
                      background-color: #fff;
                      color: #2d3748;
                      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                      outline: none;
                      transition: border-color 0.2s;
                    " onfocus="this.style.borderColor='#4299e1'" onblur="this.style.borderColor='#cbd5e0'">
                      ${modeOptionsHtml}
                    </select>
                  </div>

                  <!-- Additional Charges Checkboxes (only if eligible) -->
                  ${hasAdditionalCharges ? `
                    <div style="margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                      <label style="display: block; font-weight: 600; color: #2d3748; margin-bottom: 12px; font-size: 0.9rem;">
                        Additional Charges
                      </label>
                      
                      <div style="margin-bottom: 10px; display: flex; align-items: center; cursor: pointer;">
                        <input type="checkbox" id="swal-pachwai" ${pachwaiChecked ? 'checked' : ''} style="
                          width: 18px; 
                          height: 18px; 
                          margin-right: 12px; 
                          cursor: pointer;
                          accent-color: #3182ce;
                        ">
                        <label for="swal-pachwai" style="cursor: pointer; font-size: 0.9rem; color: #4a5568; font-weight: 500;">
                          Pachwai <span style="color: #718096; font-size: 0.8rem;">(Additional ₹3,000)</span>
                        </label>
                      </div>
                      
                      <div style="margin-bottom: 10px; display: flex; align-items: center; cursor: pointer;">
                        <input type="checkbox" id="swal-draught-beer" ${draughtBeerChecked ? 'checked' : ''} style="
                          width: 18px; 
                          height: 18px; 
                          margin-right: 12px; 
                          cursor: pointer;
                          accent-color: #3182ce;
                        ">
                        <label for="swal-draught-beer" style="cursor: pointer; font-size: 0.9rem; color: #4a5568; font-weight: 500;">
                          Draught Beer <span style="color: #718096; font-size: 0.8rem;">(Additional ₹5,000)</span>
                        </label>
                      </div>
                    </div>
                  ` : ''}
                </div>
              `,
              icon: 'info',
              showCancelButton: true,
              confirmButtonColor: '#3085d6',
              cancelButtonColor: '#d33',
              confirmButtonText: 'Submit & Renew',
              cancelButtonText: 'Cancel',
              preConfirm: () => {
                const mode = (document.getElementById('swal-mode-of-operation') as HTMLSelectElement)?.value || 'Self';
                const pachwai = (document.getElementById('swal-pachwai') as HTMLInputElement)?.checked || false;
                const draughtBeer = (document.getElementById('swal-draught-beer') as HTMLInputElement)?.checked || false;
                
                return {
                  mode_of_operation: mode,
                  pachwai: pachwai,
                  draught_beer: draughtBeer
                };
              }
            }).then((result) => {
              if (result.isConfirmed) {
                this.processRenewal(renewalId!, 'new-license', result.value);
              }
            });
          }
        } else {
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
              this.processRenewal(renewalId!, appType);
            }
          });
        }
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
        this.allAppsResult = result;
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

  canPrintLicense(application: UnifiedApplication): boolean {
    return this.resolveApplicationType(application) !== 'salesman-barman';
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

  private processRenewal(renewalId: string, type: UnifiedApplication['type'], options?: any): void {
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
      renewalObservable = this.licenseApplicationService.initiateLicenseRenewalApplication(renewalId, options);
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
          confirmButtonText: 'Back',
          confirmButtonColor: '#3085d6',
          allowOutsideClick: false
        }).then(() => { 
          this.closeDialog();
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
