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

            // ── Fee & location data ───────────────────────────────────────────
            const locationName: string = String(
              raw.location_name ?? raw.locationName ?? raw.location_description ?? raw.locationDescription ?? ''
            ).trim();
            const districtName: string = String(
              raw.site_district_name ?? raw.siteDistrictName ?? raw.district_name ?? raw.districtName ?? ''
            ).trim();
            const locationDisplay = [locationName, districtName].filter(Boolean).join(', ') || null;

            // yearly_license_fee is the TOTAL stored fee including previously-selected additional charges.
            // To get the base location fee, subtract the additional charges that were previously baked in.
            const storedTotalFee: number = Number(
              raw.yearly_license_fee ?? raw.yearlyLicenseFee ??
              raw.license_fee_amount ?? raw.licenseFeeAmount ?? 0
            );
            const renewalAmount: number = Number(
              raw.renewal_amount ?? raw.renewalAmount ?? 0
            );
            const lateFee: number = Number(raw.late_fee ?? raw.lateFee ?? 0);
            // Security deposit is NOT charged at renewal — excluded intentionally

            // Subtract previously-included additional charges to get the pure base location fee
            const prevPachwai  = pachwaiChecked      ? 3000 : 0;
            const prevDraught  = draughtBeerChecked  ? 5000 : 0;
            const locationFee: number = storedTotalFee - prevPachwai - prevDraught;

            // Estimated total is dynamic: base location fee + whatever the user selects now + late fee
            // (renewalAmount is added if present as a separate renewal processing fee)
            const additionalInitial = prevPachwai + prevDraught; // current selection
            const fixedBase = locationFee + renewalAmount + lateFee;
            const fixedTotal = fixedBase + additionalInitial; // = storedTotalFee + renewalAmount + lateFee

            // Build fee breakdown rows (only show non-zero)
            const feeRows: string[] = [];
            if (locationFee > 0) {
              feeRows.push(`
                <div class="rl-fee-row">
                  <span class="rl-fee-row-label">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    Location Fee
                  </span>
                  <span class="rl-fee-row-amt">₹${locationFee.toLocaleString('en-IN')}</span>
                </div>`);
            }
            if (renewalAmount > 0) {
              feeRows.push(`
                <div class="rl-fee-row">
                  <span class="rl-fee-row-label">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/><polyline points="1 20 1 14 7 14"/></svg>
                    Renewal Fee
                  </span>
                  <span class="rl-fee-row-amt">₹${renewalAmount.toLocaleString('en-IN')}</span>
                </div>`);
            }
            if (lateFee > 0) {
              feeRows.push(`
                <div class="rl-fee-row">
                  <span class="rl-fee-row-label rl-fee-row-label--late">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Late Fee
                  </span>
                  <span class="rl-fee-row-amt rl-fee-row-amt--late">₹${lateFee.toLocaleString('en-IN')}</span>
                </div>`);
            }
            if (feeRows.length > 1) {
              const breakdownTotal = locationFee + renewalAmount + lateFee;
              feeRows.push(`
                <div class="rl-fee-row rl-fee-row--total">
                  <span class="rl-fee-row-label rl-fee-row-label--total">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    Subtotal
                  </span>
                  <span class="rl-fee-row-amt rl-fee-row-amt--total">₹${breakdownTotal.toLocaleString('en-IN')}</span>
                </div>`);
            }

            const feeBreakdownHtml = (feeRows.length > 0 || locationDisplay) ? `
              <div class="rl-divider"></div>
              <div class="rl-field-group rl-fee-breakdown-group">
                <label class="rl-field-label">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  Fee Breakdown
                </label>
                ${locationDisplay ? `
                  <div class="rl-location-chip">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    ${locationDisplay}
                  </div>` : ''}
                <div class="rl-fee-rows">
                  ${feeRows.length > 0 ? feeRows.join('') : '<div class="rl-fee-row-empty">Fees will be calculated on submission</div>'}
                </div>
              </div>` : '';

            Swal.fire({
              title: '',
              html: `
                <div class="rl-modal">

                  <!-- Header -->
                  <div class="rl-header">
                    <div class="rl-header-icon">
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="23 4 23 10 17 10"/>
                        <polyline points="1 20 1 14 7 14"/>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                      </svg>
                    </div>
                    <div class="rl-header-text">
                      <h2 class="rl-title">Renew License</h2>
                      <p class="rl-subtitle">Review and confirm your renewal options</p>
                    </div>
                  </div>

                  <!-- License ID Banner -->
                  <div class="rl-license-banner">
                    <div class="rl-license-banner-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                    </div>
                    <span class="rl-license-label">License ID</span>
                    <code class="rl-license-id">${renewalId}</code>
                  </div>

                  <!-- Body -->
                  <div class="rl-body">

                    <!-- Mode of Operation -->
                    <div class="rl-field-group">
                      <label class="rl-field-label" for="swal-mode-of-operation">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                        Mode of Operation
                      </label>
                      <div class="rl-select-wrap">
                        <select id="swal-mode-of-operation" class="rl-select">
                          ${modeOptionsHtml}
                        </select>
                        <span class="rl-select-arrow">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                        </span>
                      </div>

                      <!-- SBM Warning -->
                      <div id="swal-sbm-warning" class="rl-warning" style="display:none;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        <div>
                          <p class="rl-warning-title">Warning</p>
                          <p class="rl-warning-text">Choosing "Self" will terminate your active/approved Salesman/Barman registration. No revert back will be allowed after you proceed.</p>
                        </div>
                      </div>
                    </div>

                    <!-- Additional Charges -->
                    ${hasAdditionalCharges ? `
                      <div class="rl-divider"></div>
                      <div class="rl-field-group">
                        <label class="rl-field-label">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                          Additional Charges
                        </label>
                        <div class="rl-checks-grid">
                          <label class="rl-check-card" id="rl-pachwai-card">
                            <input type="checkbox" id="swal-pachwai" class="rl-check-input" ${pachwaiChecked ? 'checked' : ''}>
                            <span class="rl-check-box">
                              <svg class="rl-check-tick" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                            </span>
                            <div class="rl-check-content">
                              <span class="rl-check-name">Pachwai</span>
                              <span class="rl-check-fee">+₹3,000</span>
                            </div>
                          </label>

                          <label class="rl-check-card" id="rl-draught-card">
                            <input type="checkbox" id="swal-draught-beer" class="rl-check-input" ${draughtBeerChecked ? 'checked' : ''}>
                            <span class="rl-check-box">
                              <svg class="rl-check-tick" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                            </span>
                            <div class="rl-check-content">
                              <span class="rl-check-name">Draught Beer</span>
                              <span class="rl-check-fee">+₹5,000</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    ` : ''}

                    <!-- Fee Breakdown (location + base fees) -->
                    ${feeBreakdownHtml}

                  </div>

                  <!-- Live Fee Summary Bar -->
                  <div class="rl-fee-summary">
                    <div class="rl-fee-summary-left">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      <div>
                        <div class="rl-fee-summary-label">Estimated Total</div>
                        <div class="rl-fee-summary-sublabel">Recalculated by server on submit</div>
                      </div>
                    </div>
                    <div class="rl-fee-total-wrap">
                      <span class="rl-fee-currency">₹</span>
                      <span class="rl-fee-total" id="rl-fee-total">${fixedTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                </div>
              `,
              icon: undefined,
              showCancelButton: true,
              confirmButtonColor: '#7c3aed',
              cancelButtonColor: '#64748b',
              confirmButtonText: `
                <span style="display:inline-flex;align-items:center;gap:7px;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/><polyline points="1 20 1 14 7 14"/></svg>
                  Submit &amp; Renew
                </span>`,
              cancelButtonText: 'Cancel',
              customClass: {
                popup: 'rl-swal-popup',
                confirmButton: 'rl-confirm-btn',
                cancelButton: 'rl-cancel-btn',
                actions: 'rl-swal-actions',
              },
              padding: 0,
              didOpen: () => {
                // Wire up check-card visual toggling + live fee total
                const updateFeeTotal = () => {
                  const pachwaiEl = document.getElementById('swal-pachwai') as HTMLInputElement;
                  const draughtEl = document.getElementById('swal-draught-beer') as HTMLInputElement;
                  const totalEl = document.getElementById('rl-fee-total');
                  if (totalEl) {
                    const selectedAdditional = (pachwaiEl?.checked ? 3000 : 0) + (draughtEl?.checked ? 5000 : 0);
                    // fixedBase = locationFee + renewalAmount + lateFee (no additional)
                    const grand = fixedBase + selectedAdditional;
                    totalEl.textContent = grand.toLocaleString('en-IN');
                  }
                };

                ['rl-pachwai-card', 'rl-draught-card'].forEach(cardId => {
                  const card = document.getElementById(cardId);
                  if (!card) return;
                  const input = card.querySelector('input') as HTMLInputElement;
                  if (!input) return;
                  const update = () => {
                    if (input.checked) card.classList.add('is-checked');
                    else card.classList.remove('is-checked');
                    updateFeeTotal();
                  };
                  update();
                  input.addEventListener('change', update);
                });

                const selectEl = document.getElementById('swal-mode-of-operation') as HTMLSelectElement;
                const warningEl = document.getElementById('swal-sbm-warning') as HTMLDivElement;
                if (selectEl && warningEl) {
                  const checkWarning = () => {
                    if (selectEl.value === 'Self' && (hasSalesmanSbm || hasBarmanSbm)) {
                      warningEl.style.display = 'flex';
                    } else {
                      warningEl.style.display = 'none';
                    }

                    if (selectEl.value === 'Salesman' && !hasSalesmanSbm) {
                      Swal.showValidationMessage('Please register/fill the salesman application first to opt for salesman.');
                      const validationMsgEl = Swal.getValidationMessage();
                      if (validationMsgEl) {
                        validationMsgEl.style.cssText = 'background:#fff5f5;color:#e53e3e;border:1px solid #fed7d7;border-radius:8px;padding:10px 14px;font-size:0.85rem;font-weight:600;margin:0 28px 0;';
                      }
                      const confirmBtn = Swal.getConfirmButton();
                      if (confirmBtn) { confirmBtn.setAttribute('disabled', 'true'); confirmBtn.style.opacity = '0.5'; confirmBtn.style.cursor = 'not-allowed'; }
                    } else if (selectEl.value === 'Barman' && !hasBarmanSbm) {
                      Swal.showValidationMessage('Please register/fill the barman application first to opt for barman.');
                      const validationMsgEl = Swal.getValidationMessage();
                      if (validationMsgEl) {
                        validationMsgEl.style.cssText = 'background:#fff5f5;color:#e53e3e;border:1px solid #fed7d7;border-radius:8px;padding:10px 14px;font-size:0.85rem;font-weight:600;margin:0 28px 0;';
                      }
                      const confirmBtn = Swal.getConfirmButton();
                      if (confirmBtn) { confirmBtn.setAttribute('disabled', 'true'); confirmBtn.style.opacity = '0.5'; confirmBtn.style.cursor = 'not-allowed'; }
                    } else {
                      Swal.resetValidationMessage();
                      const confirmBtn = Swal.getConfirmButton();
                      if (confirmBtn) { confirmBtn.removeAttribute('disabled'); confirmBtn.style.opacity = '1'; confirmBtn.style.cursor = 'pointer'; }
                    }
                  };
                  selectEl.addEventListener('change', checkWarning);
                  checkWarning();
                }
              },
              preConfirm: () => {
                const mode = (document.getElementById('swal-mode-of-operation') as HTMLSelectElement)?.value || 'Self';
                const pachwai = (document.getElementById('swal-pachwai') as HTMLInputElement)?.checked || false;
                const draughtBeer = (document.getElementById('swal-draught-beer') as HTMLInputElement)?.checked || false;
                
                if (mode === 'Salesman' && !hasSalesmanSbm) {
                  Swal.showValidationMessage('Please register/fill the salesman application first to opt for salesman.');
                  return false;
                }
                if (mode === 'Barman' && !hasBarmanSbm) {
                  Swal.showValidationMessage('Please register/fill the barman application first to opt for barman.');
                  return false;
                }

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
