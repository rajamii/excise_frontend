import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, Subject } from 'rxjs';
import { catchError, map, tap, shareReplay } from 'rxjs/operators';

import { EnaRequisitionService } from '../../core/services/ena-requisition.service';
import { SupplyChainService } from '../../features/licensee/supplyChain/services/supplychain.service';
import { HologramDataService } from '../../features/licensee/supplyChain/services/hologram-data.service';
import { DistributorPermitService } from '../../core/services/distributor-permit.service';
import { LicenseApplicationService } from '../../core/services/license-application.service';
import { ReadApiCacheInterceptor } from '../../core/interceptors/read-api-cache.interceptor';
import { environment } from '../../../environments/environment';

type PendingCountsBySection = Record<string, number>;
type BadgeAudience = 'licensee' | 'officer';
type BadgeMode = 'light' | 'full';

@Injectable({ providedIn: 'root' })
export class SidebarPendingBadgeService {
  private readonly cacheTtlMs = 60_000;
  private countsCache = new Map<string, { counts: PendingCountsBySection; fetchedAt: number }>();
  private readonly apiBase = `${environment.apiBaseUrl}/transactional`;

  private refreshNeededSource = new Subject<void>();
  refreshNeeded$ = this.refreshNeededSource.asObservable();

  triggerRefresh(): void {
    console.log('🔄 BADGE SERVICE: Clearing cache and triggering sidebar refresh');
    this.countsCache.clear();
    this.distributorPermitService.clearCache();
    if (this.licenseApplicationService) {
      this.licenseApplicationService.invalidateAllDashboardCaches();
    }
    ReadApiCacheInterceptor.clearCache();
    this.refreshNeededSource.next();
  }

  constructor(
    private http: HttpClient,
    private enaRequisitionService: EnaRequisitionService,
    private supplyChainService: SupplyChainService,
    private hologramService: HologramDataService,
    private distributorPermitService: DistributorPermitService,
    private licenseApplicationService: LicenseApplicationService
  ) {
    this.hologramService.requestUpdate$.subscribe(() => {
      console.log('🔄 BADGE SERVICE: Received hologram request update notification, triggering sidebar refresh');
      this.triggerRefresh();
    });
    this.hologramService.dailyRegisterUpdate$.subscribe(() => {
      console.log('🔄 BADGE SERVICE: Received daily register update notification, triggering sidebar refresh');
      this.triggerRefresh();
    });
    this.hologramService.arrivalUpdate$.subscribe(() => {
      console.log('🔄 BADGE SERVICE: Received hologram arrival update notification, triggering sidebar refresh');
      this.triggerRefresh();
    });
  }

  private getCurrentUserKey(): string {
    try {
      const accountRaw = localStorage.getItem('account') || localStorage.getItem('currentUser') || localStorage.getItem('user');
      if (accountRaw) {
        const parsed = JSON.parse(accountRaw);
        return String(parsed?.id || parsed?.username || parsed?.email || 'anon').trim();
      }
    } catch (e) {}
    return 'anon';
  }

  refresh(
    sections: string[],
    force = false,
    options?: { audience?: BadgeAudience; mode?: BadgeMode }
  ): Observable<PendingCountsBySection> {
    const userKey = this.getCurrentUserKey();
    const normalized = this.normalizeSections(sections);
    const audience: BadgeAudience = options?.audience ?? 'officer';
    const mode: BadgeMode = options?.mode ?? 'light';
    const key = `${userKey}:${audience}:${mode}:${normalized.join('|')}`;

    if (!force) {
      const cached = this.countsCache.get(key);
      if (cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
        return of(cached.counts);
      }
    } else {
      this.countsCache.delete(key);
      ReadApiCacheInterceptor.clearCache();
    }

    const tasks: Record<string, Observable<number>> = {};
    for (const section of normalized) {
      const imflTab = this.mapDistributorPermitBadgeTab(section);
      const isDashboardSection =
        section === 'new-license' ||
        section === 'license-renewal' ||
        section === 'license-renewal-application' ||
        section === 'salesman-barman-registration' ||
        section === 'salesman-barman' ||
        section === 'company-registration' ||
        section === 'company-collaboration' ||
        section === 'special-permit';

      if (imflTab) {
        const detail$ = this.fetchDistributorPermitDashboardCounts(imflTab, audience, force).pipe(shareReplay(1));
        tasks[section] = detail$.pipe(map(d => d.total));
        tasks[`${section}:payment`] = detail$.pipe(map(d => d.payment));
      } else if (isDashboardSection) {
        const urlMap: Record<string, string> = {
          'new-license': `${this.apiBase}/new_license_application/dashboard-counts/`,
          'license-renewal': `${this.apiBase}/license_renewal_application/dashboard-counts/`,
          'license-renewal-application': `${this.apiBase}/license_renewal_application/dashboard-counts/`,
          'salesman-barman-registration': `${this.apiBase}/salesman_barman/dashboard-counts/`,
          'salesman-barman': `${this.apiBase}/salesman_barman/dashboard-counts/`,
          'company-registration': `${this.apiBase}/company-registration/dashboard-counts/`,
          'company-collaboration': `${this.apiBase}/company-collaboration/dashboard-counts/`,
          'special-permit': `${this.apiBase}/special-permit/dashboard-counts/`
        };
        const url = urlMap[section];
        const detail$ = this.fetchDashboardCountsDetail(url, audience, force).pipe(shareReplay(1));

        tasks[section] = detail$.pipe(map(d => d.total));
        tasks[`${section}:payment`] = detail$.pipe(map(d => d.payment));
      } else {
        // For requisition and hologram we need both a pending count and a payment count.
        // Share a single HTTP fetch via shareReplay(1) so the two derived tasks don't
        // each fire their own request.
        if (audience === 'licensee' && section === 'requisition') {
          const reqs$ = this.enaRequisitionService.getRequisitions().pipe(
            map((response) => this.toArray(response)),
            shareReplay(1),
            catchError(() => of([] as any[]))
          );
          tasks[section] = reqs$.pipe(
            map((items) => this.countRequisitionAwaitingPayment(items)),
            catchError(() => of(0))
          );
          tasks[`${section}:payment`] = reqs$.pipe(
            map((items) => this.countRequisitionAwaitingPayment(items)),
            catchError(() => of(0))
          );
        } else if (audience === 'licensee' && section === 'hologram') {
          const holos$ = this.hologramService.getProcurements().pipe(
            map((items) => this.toArray(items)),
            shareReplay(1),
            catchError(() => of([] as any[]))
          );
          tasks[section] = holos$.pipe(
            map((items) => this.countHologramPendingReview(items)),
            catchError(() => of(0))
          );
          tasks[`${section}:payment`] = holos$.pipe(
            map((items) => this.countHologramAwaitingPayment(items)),
            catchError(() => of(0))
          );
        } else {
          tasks[section] = this.fetchPendingCount(section, audience, mode).pipe(catchError(() => of(0)));
        }
      }
    }

    return forkJoin(tasks).pipe(
      tap((counts) => {
        this.countsCache.set(key, {
          counts,
          fetchedAt: Date.now()
        });
      })
    );
  }

  private fetchDashboardCountsDetail(url: string, audience: BadgeAudience, force = false): Observable<{ total: number; payment: number }> {
    let finalUrl = url;
    if (force) {
      const sep = finalUrl.includes('?') ? '&' : '?';
      finalUrl = `${finalUrl}${sep}_t=${Date.now()}`;
    }
    return this.http.get<any>(finalUrl).pipe(
      map((counts) => {
        const pending = Number(counts?.pending || 0);
        if (audience !== 'licensee') return { total: pending, payment: 0 };

        const objection = Number(counts?.objection || 0);
        const awaitingPayment = Number(
          counts?.awaitingPayment ??
            counts?.awaiting_payment ??
            counts?.paymentPending ??
            counts?.payment_pending ??
            0
        );

        return {
          total: awaitingPayment + objection,
          payment: awaitingPayment
        };
      }),
      catchError(() => of({ total: 0, payment: 0 }))
    );
  }

  private fetchDistributorPermitDashboardCounts(
    tab: 'requisition' | 'revalidation' | 'cancellation',
    audience: BadgeAudience,
    force = false
  ): Observable<{ total: number; payment: number }> {
    return this.distributorPermitService.getDashboardCounts(tab, force).pipe(
      map((counts) => {
        const pending = Number(counts?.pending || 0);
        if (audience !== 'licensee') return { total: pending, payment: 0 };

        const objection = Number(counts?.objection || 0);
        const awaitingPayment = Number(counts?.awaitingPayment ?? counts?.awaiting_payment ?? 0);
        return { total: awaitingPayment + objection, payment: awaitingPayment };
      }),
      catchError(() => of({ total: 0, payment: 0 }))
    );
  }

  private mapDistributorPermitBadgeTab(section: string): 'requisition' | 'revalidation' | 'cancellation' | null {
    switch (section) {
      case 'distributor-permit':
      case 'imfl-permit':
      case 'distributor-permit-requisition':
      case 'imfl-requisition':
        return 'requisition';
      case 'distributor-permit-revalidation':
      case 'imfl-revalidation':
        return 'revalidation';
      case 'distributor-permit-cancellation':
      case 'imfl-cancellation':
        return 'cancellation';
      default:
        return null;
    }
  }

  private normalizeSections(sections: string[]): string[] {
    const unique = new Set<string>();
    for (const raw of sections || []) {
      const normalized = String(raw || '').trim().toLowerCase();
      if (normalized) unique.add(normalized);
    }
    return Array.from(unique).sort();
  }

  private fetchPendingCount(section: string, audience: BadgeAudience, mode: BadgeMode): Observable<number> {
    switch (section) {
      case 'new-license':
        return this.fetchDashboardCount(`${this.apiBase}/new_license_application/dashboard-counts/`, audience);

      case 'salesman-barman-registration':
      case 'salesman-barman':
        return this.fetchDashboardCount(`${this.apiBase}/salesman_barman/dashboard-counts/`, audience);

      case 'company-registration':
        return this.fetchDashboardCount(`${this.apiBase}/company-registration/dashboard-counts/`, audience);

      case 'company-collaboration':
        return this.fetchDashboardCount(`${this.apiBase}/company-collaboration/dashboard-counts/`, audience);

      case 'license-renewal':
      case 'license-renewal-application':
        return this.fetchDashboardCount(`${this.apiBase}/license_renewal_application/dashboard-counts/`, audience);

      case 'special-permit':
        return this.fetchDashboardCount(`${this.apiBase}/special-permit/dashboard-counts/`, audience);

      case 'distributor-permit':
      case 'imfl-permit':
      case 'distributor-permit-requisition':
      case 'imfl-requisition':
        return this.fetchDistributorPermitDashboardCounts('requisition', audience).pipe(map(d => d.total));

      case 'imfl-requisition-cases':
        return this.distributorPermitService.getCasesProcessed().pipe(
          map((items: any) => {
            const list = Array.isArray(items) ? items : (items?.results || []);
            return list.filter((c: any) => String(c.status).toLowerCase() === 'under_review').length;
          }),
          catchError(() => of(0))
        );

      case 'distributor-permit-revalidation':
      case 'imfl-revalidation':
        return this.fetchDistributorPermitDashboardCounts('revalidation', audience).pipe(map(d => d.total));

      case 'distributor-permit-cancellation':
      case 'imfl-cancellation':
        return this.fetchDistributorPermitDashboardCounts('cancellation', audience).pipe(map(d => d.total));

      case 'requisition':
        if (audience === 'licensee') {
          return this.enaRequisitionService.getRequisitions().pipe(
            map((response) => this.toArray(response)),
            map((items) => this.countRequisitionAwaitingPayment(items))
          );
        }
        return this.enaRequisitionService.getRequisitions().pipe(
          map((response) => this.toArray(response)),
          map((items) => this.countActionableWithStatusFallback(items, ['APPROVE', 'REJECT', 'FORWARD', 'VERIFY']))
        );

      case 'revalidation':
        if (audience === 'licensee') {
          return this.supplyChainService.getRevalidationData().pipe(
            map((items) => this.toArray(items)),
            map((items) => this.countLicenseePendingItems(items))
          );
        }
        return this.supplyChainService.getRevalidationData().pipe(
          map((items) => this.toArray(items)),
          map((items) => this.countActionable(items, ['APPROVE', 'REJECT', 'FORWARD', 'VERIFY']))
        );

      case 'cancellation':
        if (audience === 'licensee') {
          return this.supplyChainService.getCancellationData().pipe(
            map((items) => this.toArray(items)),
            map((items) => this.countLicenseePendingItems(items))
          );
        }
        return this.supplyChainService.getCancellationData().pipe(
          map((items) => this.toArray(items)),
          map((items) => this.countActionableWithStatusFallback(items, ['APPROVE', 'REJECT', 'FORWARD', 'VERIFY', 'APPROVEPAYSLIP', 'REJECTPAYSLIP']))
        );

      case 'transit':
        if (mode === 'light') return of(0);
        if (audience === 'licensee') {
          return this.supplyChainService.getTransitPermits().pipe(
            map((items) => this.toArray(items)),
            map((items) => this.uniqueByBillNo(items)),
            map((items) => this.countLicenseePendingItems(items))
          );
        }
        return this.supplyChainService.getTransitPermits().pipe(
          map((items) => this.toArray(items)),
          map((items) => this.uniqueByBillNo(items)),
          map((items) => this.countActionable(items, ['APPROVE', 'REJECT', 'FORWARD', 'VERIFY', 'TERMINATE', 'CANCEL']))
        );

      case 'transit-applications':
        if (mode === 'light') return of(0);
        return this.supplyChainService.getTransitPermits().pipe(
          map((items) => this.toArray(items)),
          map((items) => this.uniqueByBillNo(items)),
          map((items) => this.countActionable(items, ['APPROVE', 'REJECT', 'FORWARD', 'VERIFY', 'TERMINATE', 'CANCEL']))
        );

      // Hologram procurement workflow (used by IT cell / commissioner depending on role config)
      case 'hologram':
        if (mode === 'light') return of(0);
        if (audience === 'licensee') {
          return this.hologramService.getProcurements().pipe(
            map((items) => this.toArray(items)),
            map((items) => this.countHologramPendingReview(items))
          );
        }
        return this.hologramService.getProcurements().pipe(
          map((items) => this.toArray(items)),
          map((items) => this.countActionableWithStatusFallback(items, ['VERIFY', 'FORWARD', 'APPROVE', 'REJECT']))
        );

      case 'hologram-request':
        if (mode === 'light') return of(0);
        return this.hologramService.getRequests().pipe(
          map((items) => this.toArray(items)),
          map((items) => audience === 'licensee'
            ? this.countLicenseePendingItems(items)
            : items.filter((x) => {
                const category = this.mapHologramRequestToCategory(x);
                return category === 'PENDING' && !this.isUsageDatePast(x);
              }).length
          )
        );

      // OIC daily hologram register: pending means allocated requests that still have no daily-register entries saved.
      case 'hologram-daily-entry':
        if (mode === 'light') return of(0);
        if (audience === 'licensee') return of(0);
        return forkJoin({
          requests: this.hologramService.getRequests().pipe(map((items) => this.toArray(items))),
          dailyRegister: this.hologramService.getDailyRegisterEntries().pipe(map((items) => this.toArray(items)))
        }).pipe(
          map(({ requests, dailyRegister }) => {
            const savedRefSet = new Set<string>();
            for (const entry of dailyRegister) {
              const refNo = String(entry?.reference_no ?? entry?.referenceNo ?? '').trim();
              if (refNo) savedRefSet.add(refNo.toUpperCase());
            }

            // Only requests that have been allocated (status in-use / approved / completed) are actionable for Daily Entry.
            const actionableStatuses = new Set(['IN_USE', 'APPROVED', 'COMPLETED']);
            let pending = 0;
            for (const req of requests) {
              const status = String(req?.status ?? '')
                .toUpperCase()
                .replace(/\s+/g, '_');
              if (!actionableStatuses.has(status)) continue;

              const reqRef = String(req?.ref_no ?? req?.refNo ?? req?.reference_no ?? req?.referenceNo ?? '').trim();
              if (!reqRef) continue;
              if (!savedRefSet.has(reqRef.toUpperCase())) pending += 1;
            }
            return pending;
          })
        );

      // OIC hologram procurement register view (carton assignment / arrival confirmations).
      case 'hologram-register':
        return this.hologramService.getProcurements().pipe(
          map((items) => this.toArray(items)),
          map((items) => this.countOicHologramProcurementPending(items)),
          catchError(() => of(0))
        );

      case 'itcell-hologram':
        if (mode === 'light') return of(0);
        return this.hologramService.getProcurements().pipe(
          map((items) => this.toArray(items).filter((x) => this.requiresItCellReview(String(x?.status || '')))),
          map((items) => this.countActionable(items, ['VERIFY', 'FORWARD', 'REJECT', 'APPROVE'])),
          catchError(() => of(0))
        );

      // OIC hologram requests page (badge should show anything not finalized)
      case 'oic-hologram-requests':
        if (mode === 'light') return of(0);
        return this.hologramService.getRequests().pipe(
          map((items) => this.toArray(items)),
          map((items) =>
            items.filter((x) => {
              // Match the UI "Pending Review" bucket, not "Under Process".
              const category = this.mapHologramRequestToCategory(x);
              if (category !== 'PENDING') return false;

              // If usage date is in the past and it still looks pending, treat as rejected-by-timeout.
              if (this.isUsageDatePast(x)) return false;

              return true;
            }).length
          ),
          catchError(() => of(0))
        );

      case 'bl-details':
        // ENA arrival bulk-liter submissions awaiting OIC review.
        return this.enaRequisitionService.getRequisitionArrivalDetailsByStatus('PENDING').pipe(
          map((response) => (Array.isArray(response?.data) ? response.data : [])),
          map((items) => items.length),
          catchError(() => of(0))
        );

      default:
        return of(0);
    }
  }

  private fetchLicenseeActionableFromListByStatus(url: string): Observable<number> {
    return this.http.get<any>(url).pipe(
      map((payload) => {
        const objection = this.toArray(payload?.objection).length;
        const pending = this.toArray(payload?.pending);
        const awaitingPayment = pending.filter((x) => this.isAwaitingPaymentStage(x)).length;
        return objection + awaitingPayment;
      }),
      catchError(() => of(0))
    );
  }

  private isAwaitingPaymentStage(item: any): boolean {
    const stage = String(
      item?.current_stage_name ??
        item?.currentStageName ??
        item?.current_stage ??
        item?.currentStage ??
        item?.status ??
        ''
    ).toLowerCase();
    const normalized = stage.replace(/[^a-z0-9]/g, '');
    return normalized === 'awaitingpayment' || (normalized.includes('awaiting') && normalized.includes('payment'));
  }

  private fetchDashboardCount(url: string, audience: BadgeAudience): Observable<number> {
    return this.http.get<any>(url).pipe(
      map((counts) => {
        const pending = Number(counts?.pending || 0);
        if (audience !== 'licensee') return pending;

        const objection = Number(counts?.objection || 0);
        const awaitingPayment = Number(
          counts?.awaitingPayment ??
            counts?.awaiting_payment ??
            counts?.paymentPending ??
            counts?.payment_pending ??
            0
        );

        // Licensee badge should reflect only actionable items:
        // - awaiting payment
        // - objections to be resolved
        return awaitingPayment + objection;
      }),
      catchError(() => of(0))
    );
  }

  private toArray(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.results)) return response.results;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.pending)) return response.pending;
    return [];
  }

  private toUpperActions(value: any): string[] {
    const list = Array.isArray(value) ? value : [];
    return list.map((x) => String(x || '').trim().toUpperCase()).filter(Boolean);
  }

  private extractAllowedActions(item: any): string[] {
    const allowed =
      item?.allowedActions ??
      item?.allowed_actions ??
      item?.allowed_action ??
      item?.actions ??
      item?.currentStageEntryActions ??
      item?.current_stage_entry_actions ??
      [];

    return this.toUpperActions(allowed);
  }

  public countActionable(items: any[], actionableActions: string[]): number {
    const actionable = new Set(this.toUpperActions(actionableActions));
    const isFinalish = (item: any): boolean => {
      // Prefer explicit final-stage markers when available.
      const explicitFinal =
        item?.currentStageIsFinal ??
        item?.current_stage_is_final ??
        item?.isFinalStage ??
        item?.is_final_stage ??
        item?.isFinal ??
        item?.is_final ??
        null;
      if (explicitFinal === true || explicitFinal === 1) return true;
      if (typeof explicitFinal === 'string') {
        const token = explicitFinal.trim().toLowerCase();
        if (token === 'true' || token === '1' || token === 'yes' || token === 'y') return true;
      }

      const approvalStatusToken = this.normalizeStageToken(
        item?.approval_status ?? item?.approvalStatus ?? item?.review_status ?? item?.reviewStatus ?? ''
      );
      if (approvalStatusToken === 'approved' || approvalStatusToken === 'rejected') {
        return true;
      }

      const statusCodeToken = this.normalizeStageToken(item?.status_code ?? item?.statusCode ?? '');
      // Transit permit workflow uses status codes like TRP_03 (approved), TRP_04 (cancelled/rejected).
      if (statusCodeToken === 'approved' || statusCodeToken === 'rejected') {
        return true;
      }
      if (statusCodeToken === 'trp03' || statusCodeToken === 'trp04') {
        return true;
      }

      const statusToken = this.normalizeStageToken(
        item?.status ?? item?.current_stage_name ?? item?.currentStageName ?? ''
      );
      if (!statusToken) return false;
      return (
        statusToken.includes('approved') ||
        statusToken.includes('rejected') ||
        statusToken.includes('cancelled') ||
        statusToken.includes('canceled') ||
        statusToken.includes('terminate') ||
        statusToken.includes('terminated') ||
        statusToken.includes('complete') ||
        statusToken.includes('completed')
      );
    };

    const hasAnyActions = (items || []).some((item) => this.extractAllowedActions(item).length > 0);
    if (hasAnyActions) {
      return (items || []).filter((item) => {
        if (isFinalish(item)) return false;
        const actions = this.extractAllowedActions(item);
        return actions.some((action) => actionable.has(action));
      }).length;
    }

    // Fallback when backend doesn't return allowed actions consistently.
    return (items || []).filter((item) => {
      const statusText = String(item?.status || item?.current_stage_name || item?.currentStageName || '').toLowerCase();
      if (isFinalish(item)) return false;
      return statusText.includes('pending') || statusText.includes('under') || statusText.includes('submitted');
    }).length;
  }

  /**
   * Like countActionable but also adds items whose status indicates they are routed
   * to an officer's stage even when the backend hasn't set allowedActions.
   * Used for Permit Section and Commissioner sidebar badge counts.
   */
  public countActionableWithStatusFallback(items: any[], actionableActions: string[]): number {
    const actionable = new Set(this.toUpperActions(actionableActions));

    // First pass: items with matching allowedActions
    const countedByActions = (items || []).filter((item) => {
      const actions = this.extractAllowedActions(item);
      return actions.some((action) => actionable.has(action));
    });
    const countedIds = new Set(countedByActions.map((item) => item?.id));

    // Second pass: items with no allowedActions but status clearly routes to this officer
    const countedByStatus = (items || []).filter((item) => {
      if (countedIds.has(item?.id)) return false; // already counted
      const st = this.normalizeStageToken(item?.status ?? item?.current_stage_name ?? item?.currentStageName ?? '');
      if (!st) return false;
      if (st.includes('approv') || st.includes('reject') || st.includes('cancel') ||
          st.includes('complete') || st.includes('terminate')) return false;
      // Plain PENDING (just submitted, awaiting first officer review)
      if (st === 'pending') return true;
      // Forwarded back to Permit Section for payslip action
      if (st.includes('permitsection') &&
          (st.includes('forward') || st.includes('payslip') || st.includes('submit'))) return true;
      // Forwarded to Commissioner for review
      if (st.includes('commissioner') && st.includes('forward')) return true;
      // IT Cell: forwarded to IT Cell for review (e.g. "UNDER IT CELL REVIEW")
      if (st.includes('itcell') || st.includes('itreview') || st.includes('submittedhp')) return true;
      return false;
    });

    return countedByActions.length + countedByStatus.length;
  }

  private normalizeStageToken(value: any): string {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /** Count items that are in a non-final, non-draft state for a licensee's own view.
   *  Shows items that are submitted/pending/under-process (i.e. awaiting officer action). */
  public countLicenseePendingItems(items: any[]): number {
    return (items || []).filter((item) => {
      const raw = String(
        item?.status ?? item?.current_stage_name ?? item?.currentStageName ?? ''
      ).toLowerCase().replace(/[^a-z0-9]/g, '');
      // Count anything that is in-flight: pending, submitted, forwarded, underprocess, inreview
      // Exclude final states: approved, rejected, cancelled, draft
      if (!raw) return false;
      if (raw.includes('approved') || raw.includes('rejected') ||
          raw.includes('cancelled') || raw.includes('draft')) return false;
      return raw.includes('pending') || raw.includes('submit') ||
             raw.includes('forward') || raw.includes('underprocess') ||
             raw.includes('inreview') || raw.includes('review') ||
             raw.includes('process') || raw.includes('verify');
    }).length;
  }

  public countRequisitionPendingReview(items: any[], forCommissioner = false): number {
    // For commissioner: only count items where the backend has explicitly granted
    // an action (APPROVE/REJECT). This fires only when the application has reached
    // the commissioner's stage — not for every in-flight requisition.
    if (forCommissioner) {
      return (items || []).filter((item) => {
        const actions: string[] = item?.allowedActions ?? item?.allowed_actions ?? [];
        return Array.isArray(actions) && actions.includes('APPROVE');
      }).length;
    }

    return (items || []).filter((item) => {
      const raw = String(
        item?.status ?? item?.current_stage_name ?? item?.currentStageName ?? ''
      ).toLowerCase().replace(/[^a-z0-9]/g, '');
      // Exclude final states: approved, rejected, cancelled, draft
      if (!raw) return false;
      if (raw.includes('approved') || raw.includes('rejected') ||
          raw.includes('cancelled') || raw.includes('draft')) return false;

      // Exclude Awaiting Payment stage (stageId 29 or approved commissioner status)
      const stageId = Number(item?.current_stage ?? item?.currentStage ?? item?.stage_id ?? item?.stageId ?? -1);
      if (stageId === 29 || raw.includes('approvedcommissioner')) return false;

      // Count if it's pending review or forwarded/submitted status (including payslip states)
      return raw.includes('pending') || raw.includes('submit') ||
             raw.includes('forward') || raw.includes('underprocess') ||
             raw.includes('inreview') || raw.includes('review') ||
             raw.includes('process') || raw.includes('verify') ||
             raw.includes('payslip');
    }).length;
  }

  public countHologramPendingReview(items: any[]): number {
    return (items || []).filter((item) => {
      const raw = String(
        item?.status ?? item?.current_stage_name ?? item?.currentStageName ?? ''
      ).toLowerCase().replace(/[^a-z0-9]/g, '');
      // Exclude final states: approved, rejected, cancelled, draft
      if (!raw) return false;
      if (raw.includes('approved') || raw.includes('rejected') ||
          raw.includes('cancelled') || raw.includes('draft')) return false;

      // Exclude Awaiting Payment stage (stageId 78)
      const stageId = Number(item?.current_stage ?? item?.currentStage ?? item?.stage_id ?? item?.stageId ?? -1);
      if (stageId === 78) return false;

      // Count if it's pending review or forwarded/submitted status
      return raw.includes('pending') || raw.includes('submit') ||
             raw.includes('forward') || raw.includes('underprocess') ||
             raw.includes('inreview') || raw.includes('review') ||
             raw.includes('process') || raw.includes('verify');
    }).length;
  }

  /**
   * Count requisition items that require payment from the licensee.
   * Only stage 29 "Approved Commissioner" triggers the badge — the licensee
   * must make payment at this stage before the permit is issued.
   * Once payment is made the item moves to a post-payment stage (forwarded payslip,
   * approved payslip, etc.) and the badge must be cleared.
   */
  public countRequisitionAwaitingPayment(items: any[]): number {
    return (items || []).filter((item) => {
      const actions = this.extractAllowedActions(item);
      if (actions.includes('PAY')) return true;

      const status = String(item?.status ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const stageName = String(
        item?.current_stage_name ?? item?.currentStageName ?? ''
      ).toLowerCase().replace(/[^a-z0-9]/g, '');
      const combined = `${status} ${stageName}`;

      // Exclude non-actionable licensee stages
      const nonPaymentMarkers = [
        'pending', 'submit', 'submitted', 'forwardedcommissioner', 'forwardedoic',
        'forwardedpayslip', 'approvedpayslip', 'rejectedpayslip', 'paymentcompleted',
        'paymentdone', 'permitsection', 'approved', 'rejected', 'cancelled', 'draft'
      ];
      if (nonPaymentMarkers.some(m => combined.includes(m))) return false;

      // Exclude if a payment reference already exists
      const hasPaymentRef = Boolean(
        item?.payment_id || item?.paymentId ||
        item?.payment_date || item?.paymentDate ||
        item?.transaction_id || item?.transactionId
      );
      if (hasPaymentRef) return false;

      // Match by stage ID (most reliable)
      const stageId = Number(item?.current_stage ?? item?.currentStage ?? item?.stage_id ?? item?.stageId ?? -1);
      if (stageId === 29) return true;

      // Fallback: match by status/stage name containing "approved commissioner"
      return combined.includes('approvedcommissioner') || combined.includes('awaitingpayment');
    }).length;
  }

  /**
   * Count hologram procurement items that require payment from the licensee.
   * Only stage 78 "Approved by Commissioner" triggers the badge.
   * Clears once payment is made (Payment Completed / Cartoon Assigned).
   */
  public countHologramAwaitingPayment(items: any[]): number {
    return (items || []).filter((item) => {
      const status = String(item?.status ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const stageName = String(
        item?.current_stage_name ?? item?.currentStageName ?? ''
      ).toLowerCase().replace(/[^a-z0-9]/g, '');
      const combined = `${status} ${stageName}`;

      const paymentStatus = String(item?.paymentStatus ?? item?.payment_status ?? '').toLowerCase();
      const isPaid = paymentStatus === 'completed' || paymentStatus === 'success' || paymentStatus === 'paid' || item?.paymentCompleted === true;
      const paymentDetails = item?.paymentDetails || item?.payment_details || {};
      const hasPaidDetails = Boolean(paymentDetails?.paid_at || paymentDetails?.transaction_id || String(paymentDetails?.status || '').toLowerCase() === 'completed');

      // Exclude post-payment stages or completed payments
      if (isPaid || hasPaidDetails || combined.includes('paymentcompleted') || combined.includes('cartoonassigned') || combined.includes('cartonassigned') || combined.includes('paymentdone')) {
        return false;
      }

      // Match by stage ID (most reliable)
      const stageId = Number(item?.current_stage ?? item?.currentStage ?? item?.stage_id ?? item?.stageId ?? -1);
      if (stageId === 78) return true;

      // Fallback: match by status/stage name
      return combined.includes('approvedbycommissioner') || combined.includes('commissionerapproved');
    }).length;
  }

  private countOicHologramProcurementPending(items: any[]): number {
    const rows = Array.isArray(items) ? items : [];

    const hasAnyActions = rows.some((row) => this.extractAllowedActions(row).length > 0);
    if (hasAnyActions) {
      const actionable = new Set(['ASSIGN_CARTONS', 'UPDATE_ARRIVAL']);
      return rows.filter((row) => {
        const actions = this.extractAllowedActions(row);
        const hasAssignCartons = actions.includes('ASSIGN_CARTONS');
        const hasUpdateArrival = actions.includes('UPDATE_ARRIVAL');
        if (!hasAssignCartons && !hasUpdateArrival) return false;

        const details = row?.carton_details ?? row?.cartoon_details ?? row?.cartonDetails ?? row?.cartoonDetails ?? [];
        const hasDetails = Array.isArray(details) && details.length > 0;

        // Align with UI expectations:
        // - ASSIGN_CARTONS -> pending when cartons are not yet assigned
        // - UPDATE_ARRIVAL -> pending when cartons exist (arrival update happens after assignment)
        if (hasAssignCartons && !hasDetails) return true;
        if (hasUpdateArrival && hasDetails) return true;
        return false;
      }).length;
    }

    // Fallback when backend doesn't return allowed actions consistently.
    return rows.filter((row) => {
      const statusToken = this.normalizeStageToken(row?.status);
      const stageId = Number(row?.stage_id ?? row?.stageId ?? row?.current_stage ?? row?.currentStage ?? 0);
      const isPaymentDone = stageId === 80 || (statusToken && statusToken.includes('paymentcompleted')) || String(row?.payment_status || row?.paymentStatus || '').toLowerCase() === 'completed';

      const details = row?.carton_details ?? row?.cartoon_details ?? row?.cartonDetails ?? row?.cartoonDetails ?? [];
      const hasDetails = Array.isArray(details) && details.length > 0;

      // Stage 80 / Payment Completed without arrived cartons IS pending OIC update arrival action!
      if (isPaymentDone && !hasDetails) return true;

      // Completed / arrived or rejected.
      if (isPaymentDone && hasDetails) return false;
      if (statusToken.includes('cartonassigned') || statusToken.includes('cartoonassigned')) return false;
      if (statusToken.includes('rejected') || statusToken.includes('reject')) return false;

      // Pending-ish: waiting for OIC procurement register work.
      return statusToken.includes('approved') || statusToken.includes('pending') || statusToken.includes('under');
    }).length;
  }

  private requiresItCellReview(status: string): boolean {
    const statusLower = String(status || '').toLowerCase();
    return (
      statusLower.includes('submitted') ||
      statusLower.includes('under_it_cell_review') ||
      statusLower.includes('pending_verification')
    );
  }

  private isHologramRequestFinal(request: any): boolean {
    const isFinal = Boolean(request?.currentStageIsFinal ?? request?.current_stage_is_final ?? false);
    if (isFinal) return true;

    const stageText = String(request?.currentStageName || request?.current_stage_name || request?.status || '').toUpperCase();
    if (stageText.includes('REJECT')) return true;
    if (stageText.includes('APPROV')) return true;
    if (stageText.includes('COMPLETE')) return true;

    const entryActions = this.toUpperActions(request?.currentStageEntryActions || request?.current_stage_entry_actions || []);
    if (entryActions.includes('REJECT') && isFinal) return true;

    return false;
  }

  private isUsageDatePast(request: any): boolean {
    const usageDate = String(request?.usage_date || request?.usageDate || '').trim();
    if (!usageDate) return false;

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const usageKey = usageDate.slice(0, 10);
    return usageKey < todayKey;
  }

  private mapHologramRequestToCategory(request: any): 'PENDING' | 'UNDER_PROCESS' | 'APPROVED' | 'REJECTED' {
    if (!request || typeof request !== 'object') {
      const stageText = String(request || '').toUpperCase();
      if (stageText.includes('REJECT')) return 'REJECTED';
      if (stageText.includes('COMPLETE') || stageText.includes('APPROV')) return 'APPROVED';
      return 'PENDING';
    }

    const isInitial = Boolean(request?.currentStageIsInitial ?? request?.current_stage_is_initial ?? false);
    const isFinal = Boolean(request?.currentStageIsFinal ?? request?.current_stage_is_final ?? false);
    const entryActions = this.toUpperActions(request?.currentStageEntryActions || request?.current_stage_entry_actions || []);
    const allowedActions = this.extractAllowedActions(request);

    if (isFinal && entryActions.includes('REJECT')) return 'REJECTED';
    if (isFinal) return 'APPROVED';

    // Pending-review bucket: either initial stage OR backend says OIC can take action.
    if (allowedActions.includes('ISSUE') || allowedActions.includes('APPROVE') || allowedActions.includes('REJECT')) return 'PENDING';
    if (isInitial) return 'PENDING';

    return 'UNDER_PROCESS';
  }

  private uniqueByBillNo(items: any[]): any[] {
    const seen = new Set<string>();
    return (items || []).filter((item) => {
      const billNo = String(item?.bill_no ?? item?.billNo ?? '').trim();
      if (!billNo) return true;
      if (seen.has(billNo)) return false;
      seen.add(billNo);
      return true;
    });
  }
}
