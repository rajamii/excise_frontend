import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { EnaRequisitionService } from '../../core/services/ena-requisition.service';
import { SupplyChainService } from '../../features/licensee/supplyChain/services/supplychain.service';
import { HologramDataService } from '../../features/licensee/supplyChain/services/hologram-data.service';
import { environment } from '../../../environments/environment';

type PendingCountsBySection = Record<string, number>;
type BadgeAudience = 'licensee' | 'officer';

@Injectable({ providedIn: 'root' })
export class SidebarPendingBadgeService {
  private lastKey = '';
  private lastCounts: PendingCountsBySection = {};
  private lastFetchMs = 0;
  private readonly apiBase = `${environment.apiBaseUrl}/transactional`;

  constructor(
    private http: HttpClient,
    private enaRequisitionService: EnaRequisitionService,
    private supplyChainService: SupplyChainService,
    private hologramService: HologramDataService
  ) {}

  refresh(
    sections: string[],
    force = false,
    options?: { audience?: BadgeAudience }
  ): Observable<PendingCountsBySection> {
    const normalized = this.normalizeSections(sections);
    const audience: BadgeAudience = options?.audience ?? 'officer';
    const key = `${audience}:${normalized.join('|')}`;

    if (!force && key === this.lastKey && Date.now() - this.lastFetchMs < 15_000) {
      return of(this.lastCounts);
    }

    const tasks: Record<string, Observable<number>> = {};
    for (const section of normalized) {
      tasks[section] = this.fetchPendingCount(section, audience).pipe(catchError(() => of(0)));
    }

    return forkJoin(tasks).pipe(
      tap((counts) => {
        this.lastKey = key;
        this.lastCounts = counts;
        this.lastFetchMs = Date.now();
      })
    );
  }

  private normalizeSections(sections: string[]): string[] {
    const unique = new Set<string>();
    for (const raw of sections || []) {
      const normalized = String(raw || '').trim().toLowerCase();
      if (normalized) unique.add(normalized);
    }
    return Array.from(unique).sort();
  }

  private fetchPendingCount(section: string, audience: BadgeAudience): Observable<number> {
    switch (section) {
      case 'new-license':
        if (audience === 'licensee') {
          return this.fetchLicenseeActionableFromListByStatus(`${this.apiBase}/new_license_application/list-by-status/`).pipe(
            catchError(() => this.fetchDashboardCount(`${this.apiBase}/new_license_application/dashboard-counts/`, audience))
          );
        }
        return this.fetchDashboardCount(`${this.apiBase}/new_license_application/dashboard-counts/`, audience);

      case 'salesman-barman-registration':
      case 'salesman-barman':
        if (audience === 'licensee') {
          return this.fetchLicenseeActionableFromListByStatus(`${this.apiBase}/salesman_barman/list-by-status/`).pipe(
            catchError(() => this.fetchDashboardCount(`${this.apiBase}/salesman_barman/dashboard-counts/`, audience))
          );
        }
        return this.fetchDashboardCount(`${this.apiBase}/salesman_barman/dashboard-counts/`, audience);

      case 'company-registration':
        return this.fetchDashboardCount(`${this.apiBase}/company-registration/dashboard-counts/`, audience);

      case 'license-renewal':
      case 'license-renewal-application':
        return this.fetchDashboardCount(`${this.apiBase}/license_application/dashboard-counts/`, audience);

      case 'requisition':
        if (audience === 'licensee') {
          return this.enaRequisitionService.getRequisitions().pipe(
            map((response) => this.toArray(response)),
            map((items) => this.countRequisitionAwaitingPayment(items))
          );
        }
        return this.enaRequisitionService.getRequisitions().pipe(
          map((response) => this.toArray(response)),
          map((items) => this.countActionable(items, ['APPROVE', 'REJECT', 'FORWARD', 'VERIFY']))
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
          map((items) => this.countActionable(items, ['APPROVE', 'REJECT', 'FORWARD', 'VERIFY', 'APPROVEPAYSLIP', 'REJECTPAYSLIP']))
        );

      case 'transit-applications':
        return this.supplyChainService.getTransitPermits().pipe(
          map((items) => this.toArray(items)),
          map((items) => this.countActionable(items, ['APPROVE', 'REJECT', 'FORWARD', 'VERIFY', 'TERMINATE', 'CANCEL']))
        );

      // Hologram procurement workflow (used by IT cell / commissioner depending on role config)
      case 'hologram':
        if (audience === 'licensee') {
          return this.hologramService.getProcurements().pipe(
            map((items) => this.toArray(items)),
            map((items) => this.countHologramAwaitingPayment(items))
          );
        }
        return this.hologramService.getProcurements().pipe(
          map((items) => this.toArray(items)),
          map((items) => this.countActionable(items, ['VERIFY', 'FORWARD', 'APPROVE', 'REJECT']))
        );

      case 'hologram-request':
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

      // OIC hologram procurement register view (carton assignment / arrival confirmations).
      case 'hologram-register':
        return this.hologramService.getProcurements().pipe(
          map((items) => this.toArray(items)),
          map((items) => this.countOicHologramProcurementPending(items))
        );

      case 'itcell-hologram':
        return this.hologramService.getProcurements().pipe(
          map((items) => this.toArray(items).filter((x) => this.requiresItCellReview(String(x?.status || '')))),
          map((items) => this.countActionable(items, ['VERIFY', 'FORWARD', 'REJECT', 'APPROVE']))
        );

      // OIC hologram requests page (badge should show anything not finalized)
      case 'oic-hologram-requests':
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
          )
        );

      case 'bl-details':
        // ENA arrival bulk-liter submissions awaiting OIC review.
        return this.enaRequisitionService.getRequisitionArrivalDetailsByStatus('PENDING').pipe(
          map((response) => (Array.isArray(response?.data) ? response.data : [])),
          map((items) => items.length)
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

  private countActionable(items: any[], actionableActions: string[]): number {
    const actionable = new Set(this.toUpperActions(actionableActions));

    const hasAnyActions = (items || []).some((item) => this.extractAllowedActions(item).length > 0);
    if (hasAnyActions) {
      return (items || []).filter((item) => {
        const actions = this.extractAllowedActions(item);
        return actions.some((action) => actionable.has(action));
      }).length;
    }

    // Fallback when backend doesn't return allowed actions consistently.
    return (items || []).filter((item) => {
      const statusText = String(item?.status || item?.current_stage_name || item?.currentStageName || '').toLowerCase();
      return statusText.includes('pending') || statusText.includes('under') || statusText.includes('submitted');
    }).length;
  }

  private normalizeStageToken(value: any): string {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /** Count items that are in a non-final, non-draft state for a licensee's own view.
   *  Shows items that are submitted/pending/under-process (i.e. awaiting officer action). */
  private countLicenseePendingItems(items: any[]): number {
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

  /**
   * Count requisition items that require payment from the licensee.
   * Only stage 29 "Approved Commissioner" triggers the badge — the licensee
   * must make payment at this stage before the permit is issued.
   * Once payment is made the item moves to a post-payment stage (forwarded payslip,
   * approved payslip, etc.) and the badge must be cleared.
   */
  private countRequisitionAwaitingPayment(items: any[]): number {
    return (items || []).filter((item) => {
      const status = String(item?.status ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const stageName = String(
        item?.current_stage_name ?? item?.currentStageName ?? ''
      ).toLowerCase().replace(/[^a-z0-9]/g, '');
      const combined = `${status} ${stageName}`;

      // Exclude anything that has already moved past payment
      const postPaymentMarkers = ['forwardedpayslip', 'approvedpayslip', 'rejectedpayslip', 'paymentcompleted', 'paymentdone', 'permitsection'];
      if (postPaymentMarkers.some(m => combined.includes(m))) return false;

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
      return combined.includes('approvedcommissioner');
    }).length;
  }

  /**
   * Count hologram procurement items that require payment from the licensee.
   * Only stage 78 "Approved by Commissioner" triggers the badge.
   * Clears once payment is made (Payment Completed / Cartoon Assigned).
   */
  private countHologramAwaitingPayment(items: any[]): number {
    return (items || []).filter((item) => {
      const status = String(item?.status ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const stageName = String(
        item?.current_stage_name ?? item?.currentStageName ?? ''
      ).toLowerCase().replace(/[^a-z0-9]/g, '');
      const combined = `${status} ${stageName}`;

      // Exclude post-payment stages
      if (combined.includes('paymentcompleted') || combined.includes('cartoonassigned') || combined.includes('cartonassigned')) {
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
      if (!statusToken) return false;

      // Completed / not actionable.
      if (statusToken.includes('paymentcompleted')) return false;
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
}
