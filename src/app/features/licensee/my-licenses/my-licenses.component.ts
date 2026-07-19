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
import { RenewalConfigService } from '../../../core/services/renewal-config.service';
import { forkJoin } from 'rxjs';
import { MasterService } from '../../../core/services/master.service';

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
    private masterService: MasterService,
    private renewalConfigService: RenewalConfigService,
    private dialog: MatDialog,
    private router: Router
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

    const app$ = this.unifiedDashboardService.getApplicationDetail(application.applicationId, resolvedType).pipe(
          catchError(() => of(application))
        );

    app$
      .pipe(
        take(1),
        switchMap((app) =>
          forkJoin({
            app: of(app),
            timer: this.timerConfigService.getTimerConfig(this.renewalReminderTimerCode, fallbackSeconds).pipe(take(1)),
            renewalConfig: this.renewalConfigService.getConfig().pipe(take(1))
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
          
          let windowMs = 0;
          if (timer && timer.delay_seconds > 0) {
            windowMs = Math.max(0, Number(timer.delay_ms ?? 0) || 0);
          } else {
            const validityDays = timer?.validity_period_days ?? null;
            if (validityDays !== null && Number.isFinite(Number(validityDays)) && Number(validityDays) > 0) {
              windowMs = Number(validityDays) * 24 * 60 * 60 * 1000;
            }
          }
          
          const openDate = new Date(validUpTo.getTime() - windowMs);
          
          Swal.fire({
            icon: 'error',
            title: 'Invalid Renewal Request',
            html: `
              <p>Renewal not allowed yet. License valid until <strong>${this.formatDDMMYYYY(validUpTo)}</strong>.</p>
              <p style="margin-top:10px;">🗓️ <strong>Renewal opens on:</strong> ${this.formatDDMMYYYY(openDate)}</p>
              <p style="margin-top:10px;background:#dcfce7;border-left:4px solid #16a34a;border-radius:8px;padding:10px 14px;color:#166534;font-size:0.88em;font-weight:600;">✅ You can renew within the last ${windowLabel} or after expiry.</p>
            `,
            background: '#fff5f5',
            color: '#1e293b',
            confirmButtonText: 'OK, Got it',
            confirmButtonColor: '#dc2626',
            customClass: {
              popup:          'swal-renewal-invalid',
              title:          'swal-renewal-invalid-title',
              htmlContainer:  'swal-renewal-invalid-html',
              confirmButton:  'swal-renewal-invalid-btn',
              icon:           'swal-renewal-invalid-icon',
            }
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
              title: '',
              html: `
                <div class="rl-modal">
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
                      <p class="rl-subtitle">Review and confirm your renewal</p>
                    </div>
                  </div>

                  <div class="rl-license-banner">
                    <div class="rl-license-banner-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                    </div>
                    <span class="rl-license-label">License ID</span>
                    <code class="rl-license-id">${renewalId}</code>
                  </div>

                  <div class="rl-body">
                    <div class="rl-info-row">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1c2b78" stroke-width="2.5"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><polyline points="16 3 12 7 8 3"/></svg>
                      <span class="rl-info-label">Type</span>
                      <span class="rl-info-value">${this.getTypeLabel(app)}</span>
                    </div>
                    <div class="rl-confirm-note">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0891b2" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      Are you sure you want to proceed with the renewal of this license?
                    </div>
                  </div>
                </div>
              `,
              showCancelButton: true,
              showConfirmButton: true,
              confirmButtonText: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:6px;vertical-align:middle"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>Yes, Renew',
              cancelButtonText: 'Cancel',
              customClass: {
                popup:         'rl-swal-popup',
                confirmButton: 'rl-swal-confirm',
                cancelButton:  'rl-swal-cancel',
                actions:       'rl-swal-actions',
              },
              buttonsStyling: false,
              focusConfirm: false,
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
                const stageName = String(sbm.currentStageName || sbm.currentStage || sbmRaw.current_stage?.name || sbmRaw.current_stage_name || '').toLowerCase();
                const isRejected = stageName === 'rejected' || sbm.currentStage === '105' || sbmRaw.current_stage_id === 105;
                if (!isRejected) {
                  if (sbmRole.includes('salesman')) {
                    hasSalesmanSbm = true;
                  } else if (sbmRole.includes('barman')) {
                    hasBarmanSbm = true;
                  }
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
            const selectedFee = raw.license_fee_selection ?? raw.licenseFeeSelection ?? {};
            const unwrapId = (value: any): any => {
              if (!value || typeof value !== 'object') return value;
              return value.id ?? value.pk ?? value.value ?? value.location_code ?? value.locationCode ?? null;
            };
            const toAmount = (value: any): number => {
              const normalized = String(value ?? '').replace(/,/g, '').trim();
              const amount = Number(normalized);
              return Number.isFinite(amount) ? amount : 0;
            };
            const locationName: string = String(
              raw.location_name ??
              raw.locationName ??
              raw.location_description ??
              raw.locationDescription ??
              selectedFee.location_description ??
              selectedFee.locationDescription ??
              ''
            ).trim();
            const districtName: string = String(
              raw.site_district_name ??
              raw.siteDistrictName ??
              raw.district_name ??
              raw.districtName ??
              selectedFee.district_name ??
              selectedFee.districtName ??
              ''
            ).trim();
            const locationDisplay = [locationName, districtName].filter(Boolean).join(', ') || null;

            // yearly_license_fee is the TOTAL stored fee including previously-selected additional charges.
            // To get the base location fee, subtract the additional charges that were previously baked in.
            const storedTotalFee: number = toAmount(
              raw.yearly_license_fee ?? raw.yearlyLicenseFee ??
              raw.license_fee_amount ?? raw.licenseFeeAmount ??
              raw.license_fee ?? raw.licenseFee ??
              selectedFee.license_fee ?? selectedFee.licenseFee ??
              raw.fee_amount ?? 0
            );
            const renewalAmount: number = toAmount(
              raw.renewal_amount ?? raw.renewalAmount ??
              selectedFee.renewal_amount ?? selectedFee.renewalAmount ?? 0
            );
            const lateFee: number = toAmount(
              raw.late_fee ?? raw.lateFee ??
              selectedFee.late_fee ?? selectedFee.lateFee ?? 0
            );
            // Security deposit is NOT charged at renewal — excluded intentionally

            const selectedFeeId = toAmount(
              raw.selected_license_fee_id ??
              raw.selectedLicenseFeeId ??
              selectedFee.id ??
              0
            );
            const feeSubcategoryId = toAmount(
              unwrapId(raw.license_subcategory_id) ??
              unwrapId(raw.license_sub_category_id) ??
              unwrapId(raw.licenseSubcategoryId) ??
              unwrapId(raw.licenseSubCategoryId) ??
              unwrapId(raw.license_subcategory) ??
              unwrapId(raw.license_sub_category) ??
              unwrapId(raw.licenseSubcategory) ??
              unwrapId(raw.licenseSubCategory) ??
              selectedFee.license_subcategory_id ??
              selectedFee.licenseSubcategoryId ??
              0
            );
            const feeLocationCode = String(
              unwrapId(raw.location_code) ??
              unwrapId(raw.locationCode) ??
              unwrapId(raw.location) ??
              selectedFee.location_code ??
              selectedFee.locationCode ??
              ''
            ).trim();

            // Subtract previously-included additional charges to get the pure base location fee
            const prevPachwai  = pachwaiChecked      ? 3000 : 0;
            const prevDraught  = draughtBeerChecked  ? 5000 : 0;
            let locationFee: number = Math.max(0, storedTotalFee - prevPachwai - prevDraught);
            if (resolvedType === 'company-registration' && locationFee <= 0) {
              locationFee = 5000;
            }

            // Estimated total is dynamic: base location fee + whatever the user selects now + late fee
            // (renewalAmount is added if present as a separate renewal processing fee)
            const additionalInitial = prevPachwai + prevDraught; // current selection
            let dynamicLocationFee = locationFee;
            const getFixedBase = () => dynamicLocationFee + renewalAmount + lateFee;
            const fixedTotal = getFixedBase() + additionalInitial; // = storedTotalFee + renewalAmount + lateFee

            // Keep the base fee row visible so the popup always shows the
            // location-fee portion, even if the backend payload currently
            // resolves the amount as 0.
            const feeRows: string[] = [];
            const feeLabel = resolvedType === 'company-registration'
              ? 'Company Registration Fee'
              : 'Location Fee';
            feeRows.push(`
              <div class="rl-fee-row">
                <span class="rl-fee-row-label">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  ${feeLabel}
                </span>
                <span class="rl-fee-row-amt" id="rl-location-fee-amount">₹${dynamicLocationFee.toLocaleString('en-IN')}</span>
              </div>`);
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
              const breakdownTotal = getFixedBase();
              feeRows.push(`
                <div class="rl-fee-row rl-fee-row--total">
                  <span class="rl-fee-row-label rl-fee-row-label--total">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    Subtotal
                  </span>
                  <span class="rl-fee-row-amt rl-fee-row-amt--total" id="rl-fee-subtotal">₹${breakdownTotal.toLocaleString('en-IN')}</span>
                </div>`);
            }

            const feeBreakdownHtml = `
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
              </div>`;

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
                    <div class="rl-field-group" ${resolvedType === 'company-registration' ? 'style="display:none;"' : ''}>
                      <label class="rl-field-label">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                        Mode of Operation
                      </label>
                      <!-- Hidden real select (used by confirm logic) -->
                      <select id="swal-mode-of-operation" style="display:none;">
                        ${modeOptionsHtml}
                      </select>
                      <!-- Custom radio cards -->
                      <div class="rl-mode-grid" id="rl-mode-grid">
                        ${allowedModes.map(mode => {
                          let label = mode;
                          let badge = '';
                          if (mode === 'Salesman' && hasSalesmanSbm) { label = 'Salesman'; badge = '<span class="rl-mode-badge">Registered ✓</span>'; }
                          else if (mode === 'Barman' && hasBarmanSbm) { label = 'Barman'; badge = '<span class="rl-mode-badge">Registered ✓</span>'; }
                          const isSelected = mode === lastMode;
                          return `
                            <label class="rl-mode-card ${isSelected ? 'is-selected' : ''}" data-mode="${mode}">
                              <span class="rl-mode-check-box">
                                <svg class="rl-mode-tick" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                              </span>
                              <span class="rl-mode-label">${label}</span>
                              ${badge}
                            </label>`;
                        }).join('')}
                      </div>

                      <!-- SBM Warning -->
                      <div id="swal-sbm-warning" class="rl-warning" style="display:none;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        <div>
                          <p class="rl-warning-title">Warning</p>
                          <p class="rl-warning-text">Choosing "Self" will terminate your active/approved Salesman/Barman registration. No revert back will be allowed after you proceed.</p>
                        </div>
                      </div>

                      <!-- Custom inline validation error (replaces Swal.showValidationMessage to avoid state lock) -->
                      <div id="rl-custom-error" style="display:none; align-items:center; gap:8px; margin-top:10px; padding:10px 14px; background:#fff5f5; color:#c53030; border:1px solid #fed7d7; border-radius:8px; font-size:0.85rem; font-weight:600;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span id="rl-custom-error-text"></span>
                      </div>
                    </div>

                    <!-- Additional Charges -->
                    ${(hasAdditionalCharges && resolvedType !== 'company-registration') ? `
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

                  <!-- Actions Footer -->
                  <div style="display: flex; justify-content: center; padding: 20px 28px 26px; gap: 12px; background: #ffffff;">
                    <button type="button" id="custom-confirm-btn" style="min-width: 140px; outline: none; border: none; cursor: pointer; border-radius: 12px; padding: 11px 24px; font-size: 14px; font-weight: 700; letter-spacing: 0.2px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35); background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; display: inline-flex; align-items: center; justify-content: center; gap: 7px;">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/><polyline points="1 20 1 14 7 14"/></svg>
                      Submit &amp; Renew
                    </button>
                    <button type="button" id="custom-cancel-btn" style="min-width: 120px; outline: none; border: 1.5px solid #e2e8f0; cursor: pointer; border-radius: 12px; padding: 11px 24px; font-size: 14px; font-weight: 600; background: #f1f5f9; color: #475569; display: inline-flex; align-items: center; justify-content: center;">Cancel</button>
                  </div>

                </div>
              `,
              icon: undefined,
              showConfirmButton: false,
              showCancelButton: false,
              allowOutsideClick: true,
              allowEscapeKey: true,
              customClass: {
                popup: 'rl-swal-popup',
              },
              padding: 0,
              didOpen: () => {
                // Helper: show/hide custom inline error (never touches Swal internals)
                const showError = (msg: string) => {
                  const el = document.getElementById('rl-custom-error') as HTMLElement | null;
                  const txt = document.getElementById('rl-custom-error-text') as HTMLElement | null;
                  if (el && txt) { txt.textContent = msg; el.style.display = 'flex'; }
                };
                const clearError = () => {
                  const el = document.getElementById('rl-custom-error') as HTMLElement | null;
                  if (el) { el.style.display = 'none'; }
                };

                // ── Live fee total ────────────────────────────────────────────
                const updateFeeTotal = () => {
                  const pachwaiEl = document.getElementById('swal-pachwai') as HTMLInputElement;
                  const draughtEl = document.getElementById('swal-draught-beer') as HTMLInputElement;
                  const totalEl   = document.getElementById('rl-fee-total');
                  if (totalEl) {
                    const selectedAdditional = (pachwaiEl?.checked ? 3000 : 0) + (draughtEl?.checked ? 5000 : 0);
                    totalEl.textContent = (getFixedBase() + selectedAdditional).toLocaleString('en-IN');
                  }
                };

                // ── Additional charge cards ───────────────────────────────────
                const updateFeeBreakdown = () => {
                  const subtotalEl = document.getElementById('rl-fee-subtotal');
                  if (subtotalEl) {
                    subtotalEl.textContent = `₹${getFixedBase().toLocaleString('en-IN')}`;
                  }
                };

                const applyAssignedFee = (fee: any) => {
                  const assignedFee = toAmount(
                    fee?.licenseFee ??
                    fee?.license_fee ??
                    fee?.fee ??
                    fee?.amount ??
                    fee?.yearly_license_fee ??
                    fee?.yearlyLicenseFee
                  );
                  if (assignedFee <= 0) return;
                  dynamicLocationFee = assignedFee;
                  const amountEl = document.getElementById('rl-location-fee-amount');
                  if (amountEl) {
                    amountEl.textContent = `₹${dynamicLocationFee.toLocaleString('en-IN')}`;
                  }
                  updateFeeBreakdown();
                  updateFeeTotal();
                };

                const normalizeText = (value: any) => String(value ?? '').trim().toLowerCase();
                const applyAssignedFeeFromMasterList = (response: any) => {
                  const list = Array.isArray(response)
                    ? response
                    : (Array.isArray(response?.results) ? response.results : []);
                  if (!list.length) return;

                  const normalizedLocation = normalizeText(locationName);
                  const normalizedDistrict = normalizeText(districtName);
                  const normalizedCategory = normalizeText(catName);

                  const matches = list.filter((fee: any) => {
                    const feeCategoryId = toAmount(
                      fee?.license_category ??
                      fee?.licenseCategory ??
                      fee?.license_category_id ??
                      fee?.licenseCategoryId ??
                      fee?.license_category?.id ??
                      fee?.license_category?.pk ??
                      fee?.licenseCategory?.id ??
                      fee?.licenseCategory?.pk
                    );
                    const feeCategoryName = normalizeText(
                      fee?.license_category_name ??
                      fee?.licenseCategoryName ??
                      fee?.category_name ??
                      fee?.categoryName ??
                      fee?.license_category?.license_category ??
                      fee?.license_category?.name ??
                      fee?.licenseCategory?.licenseCategory ??
                      fee?.licenseCategory?.name
                    );
                    const feeLocation = normalizeText(
                      fee?.location_description ??
                      fee?.locationDescription ??
                      fee?.location_name ??
                      fee?.locationName ??
                      fee?.location?.location_description ??
                      fee?.location?.locationDescription ??
                      fee?.location?.name
                    );
                    const feeDistrict = normalizeText(fee?.district_name ?? fee?.districtName);

                    const categoryMatches = (catId > 0 && feeCategoryId === catId) ||
                      (!!normalizedCategory && !!feeCategoryName && (
                        feeCategoryName === normalizedCategory ||
                        feeCategoryName.includes(normalizedCategory) ||
                        normalizedCategory.includes(feeCategoryName)
                      ));
                    const locationMatches = !normalizedLocation || !feeLocation ||
                      feeLocation === normalizedLocation ||
                      feeLocation.includes(normalizedLocation) ||
                      normalizedLocation.includes(feeLocation);
                    const districtMatches = !normalizedDistrict || !feeDistrict ||
                      feeDistrict === normalizedDistrict ||
                      feeDistrict.includes(normalizedDistrict) ||
                      normalizedDistrict.includes(feeDistrict);

                    return categoryMatches && locationMatches && districtMatches;
                  });

                  if (matches.length) {
                    applyAssignedFee(matches[0]);
                  }
                };

                const loadAssignedFeeFromMasterList = () => {
                  this.masterService.getLicenseFees()
                    .pipe(take(1), catchError(() => of([])))
                    .subscribe(applyAssignedFeeFromMasterList);
                };

                if (selectedFeeId > 0) {
                  this.masterService.getLicenseFee(selectedFeeId)
                    .pipe(take(1), catchError(() => of(null)))
                    .subscribe((fee) => {
                      const feeAny = fee as any;
                      if (feeAny && toAmount(feeAny?.licenseFee ?? feeAny?.license_fee ?? feeAny?.fee ?? feeAny?.amount) > 0) {
                        applyAssignedFee(feeAny);
                      } else {
                        loadAssignedFeeFromMasterList();
                      }
                    });
                } else if (catId > 0 && feeSubcategoryId > 0 && feeLocationCode) {
                  this.masterService.lookupLicenseFee(catId, feeSubcategoryId, feeLocationCode)
                    .pipe(take(1), catchError(() => of(null)))
                    .subscribe((fee) => {
                      const feeAny = fee as any;
                      if (feeAny && toAmount(feeAny?.licenseFee ?? feeAny?.license_fee ?? feeAny?.fee ?? feeAny?.amount) > 0) {
                        applyAssignedFee(feeAny);
                      } else {
                        loadAssignedFeeFromMasterList();
                      }
                    });
                } else {
                  loadAssignedFeeFromMasterList();
                }

                ['rl-pachwai-card', 'rl-draught-card'].forEach(cardId => {
                  const card  = document.getElementById(cardId);
                  if (!card) return;
                  const input = card.querySelector('input') as HTMLInputElement;
                  if (!input) return;
                  const update = () => {
                    card.classList.toggle('is-checked', input.checked);
                    updateFeeTotal();
                  };
                  update();
                  input.addEventListener('change', update);
                });

                // ── Mode of operation radio cards ────────────────────────────
                const selectEl  = document.getElementById('swal-mode-of-operation') as HTMLSelectElement;
                const warningEl = document.getElementById('swal-sbm-warning') as HTMLDivElement;
                const grid      = document.getElementById('rl-mode-grid');
                const confirmBtn = document.getElementById('custom-confirm-btn') as HTMLButtonElement | null;
                const cancelBtn  = document.getElementById('custom-cancel-btn') as HTMLButtonElement | null;

                const updateModeState = (mode: string) => {
                  // Show SBM termination warning when Self is chosen and user has active SBM
                  if (warningEl) {
                    warningEl.style.display = (mode === 'Self' && (hasSalesmanSbm || hasBarmanSbm)) ? 'flex' : 'none';
                  }
                  // Show/hide inline error — never calls Swal.showValidationMessage
                  if (mode === 'Salesman' && !hasSalesmanSbm) {
                    showError('Please register the salesman application first before selecting Salesman mode.');
                    if (confirmBtn) { confirmBtn.style.opacity = '0.5'; confirmBtn.style.cursor = 'not-allowed'; }
                  } else if (mode === 'Barman' && !hasBarmanSbm) {
                    showError('Please register the barman application first before selecting Barman mode.');
                    if (confirmBtn) { confirmBtn.style.opacity = '0.5'; confirmBtn.style.cursor = 'not-allowed'; }
                  } else {
                    clearError();
                    if (confirmBtn) { confirmBtn.style.opacity = '1'; confirmBtn.style.cursor = 'pointer'; }
                  }
                };

                if (grid && selectEl) {
                  grid.querySelectorAll<HTMLElement>('.rl-mode-card').forEach(card => {
                    card.addEventListener('click', () => {
                      const mode = card.dataset['mode'] ?? '';
                      selectEl.value = mode;
                      grid.querySelectorAll('.rl-mode-card').forEach(c => c.classList.remove('is-selected'));
                      card.classList.add('is-selected');
                      updateModeState(mode);
                    });
                  });
                  // Initial state check — only touches custom DOM, never SweetAlert2 internals
                  updateModeState(selectEl.value);
                }

                // ── Cancel button ────────────────────────────────────────────
                if (cancelBtn) {
                  cancelBtn.addEventListener('click', () => {
                    Swal.close();
                    // Defensive cleanup in case Swal.close() doesn't fully clean up
                    setTimeout(() => {
                      try {
                        document.body.classList.remove('swal2-shown', 'swal2-height-auto');
                        document.documentElement.classList.remove('swal2-shown');
                        document.querySelectorAll('.swal2-container').forEach(el => (el as HTMLElement).remove());
                      } catch { /* ignore */ }
                    }, 50);
                  });
                }

                // ── Confirm button ───────────────────────────────────────────
                if (confirmBtn) {
                  confirmBtn.addEventListener('click', () => {
                    const mode = selectEl?.value || 'Self';
                    const pachwai = (document.getElementById('swal-pachwai') as HTMLInputElement)?.checked || false;
                    const draughtBeer = (document.getElementById('swal-draught-beer') as HTMLInputElement)?.checked || false;

                    if (mode === 'Salesman' && !hasSalesmanSbm) {
                      showError('Please register/fill the salesman application first to opt for Salesman.');
                      return;
                    }
                    if (mode === 'Barman' && !hasBarmanSbm) {
                      showError('Please register/fill the barman application first to opt for Barman.');
                      return;
                    }

                    Swal.close();
                    this.processRenewal(renewalId!, 'new-license', {
                      mode_of_operation: mode,
                      pachwai: pachwai,
                      draught_beer: draughtBeer
                    });
                  });
                }
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
    if (explicit === 'license-renewal' || explicit === 'new-license' || explicit === 'salesman-barman' || explicit === 'company-registration' || explicit === 'company-collaboration') {
      return explicit;
    }

    const id = String((application as any)?.applicationId || '').trim().toUpperCase();
    if (id.startsWith('NLI/')) return 'new-license';
    if (id.startsWith('LIC/')) return 'license-renewal';
    if (id.startsWith('LRA/')) return 'license-renewal';
    if (id.startsWith('RCR/')) return 'license-renewal';
    if (id.startsWith('RSBM/')) return 'license-renewal';
    if (id.startsWith('RCOL/')) return 'license-renewal';
    if (id.startsWith('SBM/')) return 'salesman-barman';
    if (id.startsWith('CCOL/')) return 'company-collaboration';
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

    let windowMs = 0;
    if (timer && timer.delay_seconds > 0) {
      windowMs = Math.max(0, Number(timer.delay_ms ?? 0) || 0);
    } else {
      const validityDays = timer?.validity_period_days ?? null;
      if (validityDays !== null && Number.isFinite(Number(validityDays)) && Number(validityDays) > 0) {
        windowMs = Number(validityDays) * 24 * 60 * 60 * 1000;
      }
    }

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
    if (seconds > 0) {
      if (seconds % (24 * 60 * 60) === 0) {
        const days = seconds / (24 * 60 * 60);
        return `${days} day${days === 1 ? '' : 's'}`;
      }
      if (seconds % (60 * 60) === 0) {
        const hours = seconds / (60 * 60);
        return `${hours} hour${hours === 1 ? '' : 's'}`;
      }
      if (seconds % 60 === 0) {
        const minutes = seconds / 60;
        return `${minutes} minute${minutes === 1 ? '' : 's'}`;
      }
      return `${seconds} second${seconds === 1 ? '' : 's'}`;
    }

    const validityDays = timer?.validity_period_days ?? null;
    if (validityDays !== null && Number.isFinite(Number(validityDays)) && Number(validityDays) > 0) {
      return `${validityDays} days`;
    }

    return '0 days';
  }

  loadMyLicenses(forceRefresh = false): void {
    this.isLoading = true;
    this.unifiedDashboardService.getUnifiedApplicationsByStatus(forceRefresh, undefined, true).subscribe({
      next: (result: any) => {
        this.allAppsResult = result;
        const approvedApps = result.approved || [];
        this.activeRenewalLicenseIds = this.collectActiveRenewalLicenseIds(result);
        
        // Filter out LRA (License Renewal), RCR (Company Renewal), RCOL (Company Collaboration Renewal) and RSBM (Renewed Salesman Barman) applications,
        // as well as DP (Dry Day Permit) and SP (Special Permit) applications.
        const filteredApps = approvedApps.filter((app: UnifiedApplication) => {
          const id = String(app.applicationId || '').trim().toUpperCase();
          return !id.startsWith('LRA/') && !id.startsWith('RCR/') && !id.startsWith('RCOL/') && !id.startsWith('RSBM/') && !id.startsWith('DP/') && !id.startsWith('SP/');
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

  getTypeLabel(application: any): string {
    const type = typeof application === 'string' ? application : (application?.type || '');
    const raw = (typeof application === 'object' && application !== null) ? (application.raw || {}) : {};
    
    if (type === 'salesman-barman') {
      return raw.role || 'Salesman/Barman';
    }
    if (type === 'company-collaboration') {
      return 'Company Collaboration';
    }
    if (type === 'company-registration') {
      return 'Company Registration';
    }
    return (application?.licenseCategoryName || raw.license_category_name || 'License');
  }

  getDisplayName(application: UnifiedApplication): string {
    const raw = application.raw || {};
    return application.establishmentName || raw.brand_owner_name || raw.brandOwnerName || application.applicantFullName || 'N/A';
  }

  viewApplication(application: UnifiedApplication): void {
    const dialogRef = this.dialog.open(ViewApplicationComponent, {
      width: '550px',
      maxHeight: '100%',
      data: { unifiedApp: application, tableType: 'approved' }
    });
    dialogRef.afterClosed().subscribe((result: boolean | undefined) => {
      if (result === true) this.loadMyLicenses(true);
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
    
    // Hide renew button if there's already an active/pending renewal application for this license
    const normalized = this.normalizeLicenseId(licenseId);
    if (this.activeRenewalLicenseIds.has(normalized)) {
      return false;
    }
    return true;
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

    // STRATEGY 0: Check for any field containing 'CR/' or 'COMP/' directly for company registration
    if (application.type === 'company-registration') {
      for (const key of ['license_id', 'licenseId', 'license', 'renewalOf', 'renewal_of', 'renewalOfLicenseId', 'renewal_of_license_id']) {
        if (raw[key]) {
          const val = String(typeof raw[key] === 'object' ? (raw[key].license_id || raw[key].id || '') : raw[key]).trim();
          if (val.startsWith('CR/') || val.startsWith('COMP/')) {
            console.log(`  ✅ Found company registration license ID in key "${key}":`, val);
            return val;
          }
        }
      }
    }

    // STRATEGY 0.1: Check for any field containing 'CC/' or 'CCOL/' directly for company collaboration
    if (application.type === 'company-collaboration') {
      for (const key of ['license_id', 'licenseId', 'license', 'renewalOf', 'renewal_of', 'renewalOfLicenseId', 'renewal_of_license_id']) {
        if (raw[key]) {
          const val = String(typeof raw[key] === 'object' ? (raw[key].license_id || raw[key].id || '') : raw[key]).trim();
          if (val.startsWith('CC/') || val.startsWith('CCOL/')) {
            console.log(`  ✅ Found company collaboration license ID in key "${key}":`, val);
            return val;
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
      } else if (appId.startsWith('COMP/')) {
        // District code for CR in database is 1101
        derivedLicenseId = appId.replace('COMP/', 'CR/1101/');
      } else if (appId.startsWith('CCOL/')) {
        // District code for CC in database is 1101
        derivedLicenseId = appId.replace('CCOL/', 'CC/1101/');
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
      case 'company-registration':
        return 'CR/';
      case 'company-collaboration':
        return 'CC/';
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
    } else if (type === 'new-license' || type === 'company-registration' || type === 'company-collaboration') {
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
            <div style="
              margin: -16px -24px 0;
              padding: 0 0 20px;
              background: linear-gradient(180deg, #dcfce7 0%, #f0fdf4 100%);
              border-bottom: 1px solid #a7f3d0;
              text-align: center;
            ">
              <p style="margin:0 0 16px;font-size:13.5px;color:#166534;font-weight:500;padding: 0 20px;">
                Your license renewal application has been created and submitted.
              </p>

              <!-- App ID badge -->
              <div style="
                display:inline-flex;
                align-items:center;
                gap:10px;
                background:#ffffff;
                border:1.5px solid #6ee7b7;
                border-radius:12px;
                padding:10px 18px;
                box-shadow:0 2px 8px rgba(16,185,129,0.12);
                flex-wrap:wrap;
                justify-content:center;
              ">
                <span style="
                  font-size:9px;
                  font-weight:800;
                  color:#065f46;
                  text-transform:uppercase;
                  letter-spacing:1px;
                  white-space:nowrap;
                ">✅ New Application ID</span>
                <code style="
                  font-family:'Fira Code',monospace;
                  font-size:13.5px;
                  font-weight:700;
                  color:#047857;
                  background:#ecfdf5;
                  border:1.5px solid #6ee7b7;
                  padding:4px 14px;
                  border-radius:8px;
                  letter-spacing:0.5px;
                ">${newAppId}</code>
              </div>
            </div>

            <!-- Tracking note -->
            <p style="
              margin:18px 0 0;
              font-size:12px;
              color:#059669;
              display:flex;
              align-items:center;
              justify-content:center;
              gap:6px;
            ">
              <span>🗂️</span>
              Track the status of your renewal in your dashboard.
            </p>
          `,
          background: '#f0fdf4',
          color: '#065f46',
          confirmButtonText: 'Close',
          confirmButtonColor: '#059669',
          allowOutsideClick: true,
          customClass: {
            title: 'swal-renewal-success-title',
            icon:  'swal-renewal-success-icon',
          }
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
          const errBody = error.error || {};
          const detail = errBody?.detail || errBody?.message || '';
          if (errBody?.window_not_open) {
            // Renewal window not yet open — show a dedicated info dialog
            const windowStart = errBody?.renewal_window_starts_on
              ? new Date(errBody.renewal_window_starts_on).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : null;
            const validUpTo = errBody?.license_valid_up_to
              ? new Date(errBody.license_valid_up_to).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : null;
            errorTitle = 'Renewal Window Not Open';
            errorMessage = `
              <p>${detail}</p>
              ${windowStart ? `<p style="margin-top:10px;">🗓️ <strong>Renewal opens:</strong> ${windowStart}</p>` : ''}
              ${validUpTo ? `<p>📅 <strong>License expires:</strong> ${validUpTo}</p>` : ''}
              <p style="margin-top:10px;font-size:0.88em;color:#666;">You will be able to renew once the renewal window opens.</p>
            `;
          } else {
            errorTitle = 'Invalid Renewal Request';
            errorMessage = detail || 'The renewal request is not valid. Please check the license details.';
          }

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
