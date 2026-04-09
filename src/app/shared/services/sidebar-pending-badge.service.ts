import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { EnaRequisitionService } from '../../core/services/ena-requisition.service';
import { SupplyChainService } from '../../features/licensee/supplyChain/services/supplychain.service';
import { HologramDataService } from '../../features/licensee/supplyChain/services/hologram-data.service';
import { environment } from '../../../environments/environment';

type PendingCountsBySection = Record<string, number>;

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

  refresh(sections: string[], force = false): Observable<PendingCountsBySection> {
    const normalized = this.normalizeSections(sections);
    const key = normalized.join('|');

    if (!force && key === this.lastKey && Date.now() - this.lastFetchMs < 15_000) {
      return of(this.lastCounts);
    }

    const tasks: Record<string, Observable<number>> = {};
    for (const section of normalized) {
      tasks[section] = this.fetchPendingCount(section).pipe(catchError(() => of(0)));
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

  private fetchPendingCount(section: string): Observable<number> {
    switch (section) {
      case 'new-license':
        return this.fetchDashboardPending(`${this.apiBase}/new_license_application/dashboard-counts/`);

      case 'salesman-barman-registration':
      case 'salesman-barman':
        return this.fetchDashboardPending(`${this.apiBase}/salesman_barman/dashboard-counts/`);

      case 'company-registration':
        return this.fetchDashboardPending(`${this.apiBase}/company-registration/dashboard-counts/`);

      case 'license-renewal':
      case 'license-renewal-application':
        return this.fetchDashboardPending(`${this.apiBase}/license_application/dashboard-counts/`);

      case 'requisition':
        return this.enaRequisitionService.getRequisitions().pipe(
          map((response) => this.toArray(response)),
          map((items) => this.countActionable(items, ['APPROVE', 'REJECT', 'FORWARD', 'VERIFY']))
        );

      case 'revalidation':
        return this.supplyChainService.getRevalidationData().pipe(
          map((items) => this.toArray(items)),
          map((items) => this.countActionable(items, ['APPROVE', 'REJECT', 'FORWARD', 'VERIFY']))
        );

      case 'cancellation':
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
        return this.hologramService.getProcurements().pipe(
          map((items) => this.toArray(items)),
          map((items) => this.countActionable(items, ['VERIFY', 'FORWARD', 'APPROVE', 'REJECT']))
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
          map((items) => items.filter((x) => !this.isHologramRequestFinal(x)).length)
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

  private fetchDashboardPending(url: string): Observable<number> {
    return this.http.get<any>(url).pipe(
      map((counts) => Number(counts?.pending || 0)),
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
}
