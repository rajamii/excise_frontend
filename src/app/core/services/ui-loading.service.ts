import { Injectable, computed, signal } from '@angular/core';

type HttpKind = 'blocking' | 'background';

@Injectable({ providedIn: 'root' })
export class UiLoadingService {
  private readonly routeLoading = signal<boolean>(true);
  private routeShownAt = Date.now();
  private routeHideTimer: any = null;

  private readonly httpBlockingCount = signal<number>(0);
  private readonly httpBackgroundCount = signal<number>(0);

  private readonly httpBlockingVisible = signal<boolean>(false);
  private readonly httpBackgroundVisible = signal<boolean>(false);

  private httpBlockingDelayTimer: any = null;
  private httpBackgroundDelayTimer: any = null;

  private httpBlockingShownAt = 0;
  private httpBackgroundShownAt = 0;

  readonly topBarVisible = computed(() =>
    this.routeLoading() || this.httpBlockingVisible() || this.httpBackgroundVisible()
  );

  readonly overlayVisible = computed(() => this.routeLoading() || this.httpBlockingVisible());

  setRouteLoading(isLoading: boolean): void {
    const loading = !!isLoading;

    if (loading) {
      if (this.routeHideTimer) {
        globalThis.clearTimeout(this.routeHideTimer);
        this.routeHideTimer = null;
      }
      this.routeShownAt = Date.now();
      this.routeLoading.set(true);
      return;
    }

    const minVisibleMs = 300;
    const elapsed = Date.now() - this.routeShownAt;
    const remaining = Math.max(0, minVisibleMs - elapsed);

    if (this.routeHideTimer) globalThis.clearTimeout(this.routeHideTimer);
    this.routeHideTimer = globalThis.setTimeout(() => {
      this.routeHideTimer = null;
      this.routeLoading.set(false);
    }, remaining);
  }

  beginHttp(kind: HttpKind): void {
    if (kind === 'blocking') {
      const next = this.httpBlockingCount() + 1;
      this.httpBlockingCount.set(next);
      if (next === 1) this.scheduleShow('blocking');
      return;
    }

    const next = this.httpBackgroundCount() + 1;
    this.httpBackgroundCount.set(next);
    if (next === 1) this.scheduleShow('background');
  }

  endHttp(kind: HttpKind): void {
    if (kind === 'blocking') {
      const next = Math.max(0, this.httpBlockingCount() - 1);
      this.httpBlockingCount.set(next);
      if (next === 0) this.scheduleHide('blocking');
      return;
    }

    const next = Math.max(0, this.httpBackgroundCount() - 1);
    this.httpBackgroundCount.set(next);
    if (next === 0) this.scheduleHide('background');
  }

  private scheduleShow(kind: HttpKind): void {
    const delayMs = kind === 'blocking' ? 0 : 180;

    if (kind === 'blocking') {
      if (this.httpBlockingDelayTimer) globalThis.clearTimeout(this.httpBlockingDelayTimer);
      this.httpBlockingDelayTimer = globalThis.setTimeout(() => {
        this.httpBlockingDelayTimer = null;
        if (this.httpBlockingCount() > 0) {
          this.httpBlockingShownAt = Date.now();
          this.httpBlockingVisible.set(true);
        }
      }, delayMs);
      return;
    }

    if (this.httpBackgroundDelayTimer) globalThis.clearTimeout(this.httpBackgroundDelayTimer);
    this.httpBackgroundDelayTimer = globalThis.setTimeout(() => {
      this.httpBackgroundDelayTimer = null;
      if (this.httpBackgroundCount() > 0) {
        this.httpBackgroundShownAt = Date.now();
        this.httpBackgroundVisible.set(true);
      }
    }, delayMs);
  }

  private scheduleHide(kind: HttpKind): void {
    const minVisibleMs = 250;

    if (kind === 'blocking') {
      if (this.httpBlockingDelayTimer) {
        globalThis.clearTimeout(this.httpBlockingDelayTimer);
        this.httpBlockingDelayTimer = null;
      }

      if (!this.httpBlockingVisible()) return;
      const elapsed = Date.now() - this.httpBlockingShownAt;
      const remaining = Math.max(0, minVisibleMs - elapsed);
      globalThis.setTimeout(() => {
        if (this.httpBlockingCount() === 0) this.httpBlockingVisible.set(false);
      }, remaining);
      return;
    }

    if (this.httpBackgroundDelayTimer) {
      globalThis.clearTimeout(this.httpBackgroundDelayTimer);
      this.httpBackgroundDelayTimer = null;
    }

    if (!this.httpBackgroundVisible()) return;
    const elapsed = Date.now() - this.httpBackgroundShownAt;
    const remaining = Math.max(0, minVisibleMs - elapsed);
    globalThis.setTimeout(() => {
      if (this.httpBackgroundCount() === 0) this.httpBackgroundVisible.set(false);
    }, remaining);
  }
}
