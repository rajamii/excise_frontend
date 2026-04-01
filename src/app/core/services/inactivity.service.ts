import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { AccountService } from './account.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, map, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InactivityService {
  private inactivityLimitMs = 0;
  private warningDurationMs = 30 * 1000; // Countdown before logout (configurable)
  private configReady = false;
  private readonly inactivityConfigStorageKey = 'inactivity_config_v1';
  private readonly lastActivityStorageKey = 'inactivity_last_activity_ms_v1';
  private readonly activityEvents: Array<keyof WindowEventMap> = [
    'mousedown',
    'mousemove',
    'pointerdown',
    'pointermove',
    'keydown',
    'touchstart',
    'click',
    'wheel'
  ];
  private readonly unloadEvents: Array<keyof WindowEventMap> = ['beforeunload', 'pagehide'];
  private readonly handleVisibilityChange = () => {
    if (!isPlatformBrowser(this.platformId) || !this.trackingEnabled) return;
    if (document.visibilityState === 'hidden') {
      // Persist activity timestamp when tab/app is backgrounded so reload can enforce inactivity window.
      this.writeLastActivityMs(Date.now());
    }
  };
  private readonly unloadHandler = () => {
    if (!isPlatformBrowser(this.platformId) || !this.trackingEnabled) return;
    // Persist the final activity timestamp when the tab is being closed/reloaded.
    this.writeLastActivityMs(Date.now());
  };

  private warningTimeout?: ReturnType<typeof setTimeout>;
  private countdownInterval?: ReturnType<typeof setInterval>;
  private inactivityDeadline = 0;
  private trackingEnabled = false;
  private isLoggingOut = false;
  private warningVisible = false;
  private lastHighFreqActivityAtMs = 0;
  private readonly highFreqActivityThrottleMs = 1000;
  private readonly activityHandler = (event?: Event) => {
    // Ignore synthetic/untrusted events that can be emitted by scripts/animations,
    // otherwise the timer keeps resetting and the warning never shows.
    if (event && 'isTrusted' in event && (event as any).isTrusted === false) {
      return;
    }

    const eventType = event?.type ?? '';
    if (this.isHighFrequencyActivityEvent(eventType)) {
      const now = Date.now();
      if (now - this.lastHighFreqActivityAtMs < this.highFreqActivityThrottleMs) {
        return;
      }
      this.lastHighFreqActivityAtMs = now;
    }
    this.onUserActivity();
  };

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient,
    private accountService: AccountService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  startWatching(): void {
    if (!isPlatformBrowser(this.platformId) || this.trackingEnabled) {
      return;
    }

    this.trackingEnabled = true;
    this.isLoggingOut = false;
    this.configReady = false;
    // Ensure a previous session's warning state can't suppress the next login cycle.
    this.warningVisible = false;

    // If we don't have a stored activity timestamp yet (e.g., first login),
    // record one immediately so browser-close/reopen can still enforce timeout.
    const stored = this.readLastActivityMs();
    if (!stored || stored <= 0) {
      this.writeLastActivityMs(Date.now());
    }

    this.registerActivityListeners();
    this.loadConfigAndStart();
  }

  stopWatching(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.trackingEnabled = false;
    this.configReady = false;
    this.unregisterActivityListeners();
    this.clearTimers();
    this.closeWarningModal(true);
  }

  private registerActivityListeners(): void {
    for (const eventName of this.activityEvents) {
      window.addEventListener(eventName, this.activityHandler, { passive: true });
    }
    for (const eventName of this.unloadEvents) {
      window.addEventListener(eventName, this.unloadHandler, { passive: true });
    }
    document.addEventListener('visibilitychange', this.handleVisibilityChange, { passive: true });
  }

  private unregisterActivityListeners(): void {
    for (const eventName of this.activityEvents) {
      window.removeEventListener(eventName, this.activityHandler as EventListener);
    }
    for (const eventName of this.unloadEvents) {
      window.removeEventListener(eventName, this.unloadHandler as EventListener);
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange as EventListener);
  }

  private onUserActivity(): void {
    if (!this.trackingEnabled || this.isLoggingOut) {
      return;
    }

    // Don't start timers until DB config is loaded; otherwise we may default to near-immediate warning.
    if (!this.configReady) {
      return;
    }

    // Once the warning modal is visible, only the modal buttons should control the flow.
    if (this.warningVisible) {
      return;
    }

    // If the app was paused (sleep/lock/shutdown) and the user comes back after the deadline,
    // do NOT extend the session on first interaction; logout immediately.
    if (this.hasExceededInactivityLimitFromStoredActivity()) {
      this.logoutForInactivity();
      return;
    }

    this.startInactivityCycle();
  }

  private isHighFrequencyActivityEvent(eventType: string): boolean {
    // Mouse/pointer movement and wheel events can fire many times per second.
    // Throttle them so we don't continually clear/set timers during active use.
    return eventType === 'mousemove' || eventType === 'pointermove' || eventType === 'wheel';
  }

  private loadConfigAndStart(attempt = 0): void {
    if (!this.trackingEnabled) {
      return;
    }

    // If we already have a cached config from DB, start immediately with it,
    // then refresh from server in the background.
    const cached = this.readCachedConfig();
    if (cached && !this.configReady) {
      this.applyInactivityConfig(cached);
      this.configReady = true;

      // Enforce stored inactivity immediately (do not overwrite stored last-activity first).
      if (this.hasExceededInactivityLimitFromStoredActivity()) {
        this.logoutForInactivity();
        return;
      }
      const storedActivityMs = this.readLastActivityMs();
      if (storedActivityMs && storedActivityMs > 0) {
        this.startInactivityCycle(storedActivityMs, false);
      } else {
        this.startInactivityCycle();
      }
    }

    this.fetchInactivityLogoutMs().subscribe((logoutMs) => {
      if (!this.trackingEnabled) return;

      // If we couldn't resolve config, retry a few times instead of showing warning immediately.
      if (!logoutMs || logoutMs <= 0) {
        if (attempt < 20) {
          const delay = Math.min(5000, 500 * Math.pow(2, attempt));
          setTimeout(() => this.loadConfigAndStart(attempt + 1), delay);
        }
        return;
      }

      // Logout timer must come from DB (required).
      // Warning timer is optional; if not loaded yet we keep the current value
      // and refresh it asynchronously after starting.
      const cfg = { logoutMs, warningMs: this.warningDurationMs };
      this.applyInactivityConfig(cfg);
      this.configReady = true;
      this.saveCachedConfig(cfg);

      // On app reload/browser restore, continue the previous inactivity window (or logout immediately if expired).
      if (this.hasExceededInactivityLimitFromStoredActivity()) {
        this.logoutForInactivity();
        return;
      }
      const storedActivityMs = this.readLastActivityMs();
      if (storedActivityMs && storedActivityMs > 0) {
        this.startInactivityCycle(storedActivityMs, false);
      } else {
        this.startInactivityCycle();
      }

      // Refresh warning duration from DB without blocking start (prevents forkJoin from stalling everything).
      this.fetchInactivityWarningMs().subscribe((warningMs) => {
        if (!this.trackingEnabled || !this.configReady) return;
        const safeWarningMs = Math.max(5 * 1000, warningMs || 0);
        if (safeWarningMs === this.warningDurationMs) return;
        this.warningDurationMs = safeWarningMs;
        // Keep logout deadline from DB; only adjust countdown UI duration.
        this.saveCachedConfig({ logoutMs: this.inactivityLimitMs, warningMs: this.warningDurationMs });
        this.startInactivityCycle();
      });
    });
  }

  private applyInactivityConfig(cfg: { logoutMs: number; warningMs: number }): void {
    const logoutMs = Math.max(0, Number(cfg.logoutMs || 0));
    let warningMs = Math.max(1 * 1000, Number(cfg.warningMs || 0));

    // Prevent misconfiguration where warning >= logout (would show immediately).
    // Keep at least 1s between warning start and logout.
    if (logoutMs > 0) {
      warningMs = Math.min(warningMs, Math.max(1 * 1000, logoutMs - 1 * 1000));
    }

    this.inactivityLimitMs = logoutMs;
    this.warningDurationMs = warningMs;
  }

  private readCachedConfig(): { logoutMs: number; warningMs: number } | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    try {
      const raw = localStorage.getItem(this.inactivityConfigStorageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const logoutMs = Number(parsed?.logoutMs ?? 0);
      const warningMs = Number(parsed?.warningMs ?? 0);
      if (!Number.isFinite(logoutMs) || logoutMs <= 0) return null;
      if (!Number.isFinite(warningMs) || warningMs <= 0) return null;
      return { logoutMs, warningMs };
    } catch {
      return null;
    }
  }

  private saveCachedConfig(cfg: { logoutMs: number; warningMs: number }): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      localStorage.setItem(this.inactivityConfigStorageKey, JSON.stringify(cfg));
    } catch {
      // ignore
    }
  }

  private startInactivityCycle(baseActivityAtMs?: number, persistBase = true): void {
    this.clearTimers();
    if (!this.configReady || !this.inactivityLimitMs || this.inactivityLimitMs <= 0) {
      return;
    }

    const base = Number(baseActivityAtMs ?? 0);
    const safeBase = Number.isFinite(base) && base > 0 ? base : Date.now();
    if (persistBase) {
      this.writeLastActivityMs(safeBase);
    }

    this.inactivityDeadline = safeBase + this.inactivityLimitMs;
    const remainingMs = this.getRemainingMs();
    if (remainingMs <= 0) {
      this.logoutForInactivity();
      return;
    }

    const warningAt = this.inactivityDeadline - this.warningDurationMs;
    const warningDelay = Math.max(0, warningAt - Date.now());
    this.warningTimeout = setTimeout(() => {
      this.openWarning();
    }, warningDelay);
  }

  private readLastActivityMs(): number | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    try {
      const raw = localStorage.getItem(this.lastActivityStorageKey);
      if (!raw) return null;
      const ms = Number(raw);
      return Number.isFinite(ms) && ms > 0 ? ms : null;
    } catch {
      return null;
    }
  }

  private writeLastActivityMs(ms: number): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      localStorage.setItem(this.lastActivityStorageKey, String(Number(ms) || Date.now()));
    } catch {
      // ignore
    }
  }

  private hasExceededInactivityLimitFromStoredActivity(): boolean {
    if (!this.configReady || !this.inactivityLimitMs || this.inactivityLimitMs <= 0) {
      return false;
    }

    const last = this.readLastActivityMs();
    if (!last) {
      return false;
    }

    return (Date.now() - last) >= this.inactivityLimitMs;
  }

  private clearTimers(): void {
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
      this.warningTimeout = undefined;
    }

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = undefined;
    }
  }

  private openWarning(): void {
    if (!this.trackingEnabled || this.warningVisible || !isPlatformBrowser(this.platformId)) {
      return;
    }

    this.warningVisible = true;
    this.startCountdownTicker();

    void Swal.fire({
      title: 'Session expiring soon',
      html: `
        <div class="idle-timeout-content">
          <div class="idle-timeout-scene" aria-hidden="true">
            <span class="idle-star idle-star-1"></span>
            <span class="idle-star idle-star-2"></span>
            <span class="idle-star idle-star-3"></span>
            <span class="idle-star idle-star-4"></span>
            <div class="idle-timeout-earth">
              <span class="idle-earth-core"></span>
              <span class="idle-earth-glow"></span>
              <span class="idle-earth-sikkim-pin"></span>
              <span class="idle-earth-sikkim-label">Sikkim</span>
            </div>
            <div class="idle-timeout-ufo">
              <span class="idle-ufo-beam"></span>
              <span class="idle-ufo-body"></span>
              <span class="idle-ufo-dome"></span>
              <span class="idle-ufo-light idle-ufo-light-1"></span>
              <span class="idle-ufo-light idle-ufo-light-2"></span>
              <span class="idle-ufo-light idle-ufo-light-3"></span>
            </div>
          </div>
          <p class="idle-timeout-message">
            You have been inactive. For your security, you will be logged out in:
          </p>
          <div class="idle-timeout-countdown" id="idle-countdown">${this.formatRemaining(this.warningDurationMs)}</div>
          <div class="idle-timeout-progress">
            <span id="idle-progress-bar"></span>
          </div>
        </div>
      `,
      confirmButtonText: 'Continue Session',
      showCancelButton: true,
      cancelButtonText: 'Logout Now',
      allowOutsideClick: false,
      allowEscapeKey: false,
      buttonsStyling: false,
      customClass: {
        popup: 'idle-timeout-popup',
        title: 'idle-timeout-title',
        confirmButton: 'idle-timeout-confirm',
        cancelButton: 'idle-timeout-cancel'
      },
      didOpen: () => {
        this.updateCountdownUi();
      },
      willClose: () => {
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
          this.countdownInterval = undefined;
        }
      }
    }).then((result) => {
      if (!this.trackingEnabled) {
        return;
      }

      this.warningVisible = false;

      if (result.isConfirmed) {
        this.startInactivityCycle();
        return;
      }

      if (result.dismiss === Swal.DismissReason.cancel) {
        this.logoutForInactivity();
        return;
      }

      if (this.getRemainingMs() <= 0) {
        this.logoutForInactivity();
      } else {
        this.startInactivityCycle();
      }
    });
  }

  private startCountdownTicker(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.updateCountdownUi();
    this.countdownInterval = setInterval(() => {
      const remainingMs = this.getRemainingMs();
      this.updateCountdownUi();
      if (remainingMs <= 0) {
        this.logoutForInactivity();
      }
    }, 250);
  }

  private updateCountdownUi(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const remainingMs = this.getRemainingMs();
    const countdownEl = document.getElementById('idle-countdown');
    if (countdownEl) {
      countdownEl.textContent = this.formatRemaining(remainingMs);
      countdownEl.classList.toggle('is-critical', remainingMs <= 10000);
    }

    const progressBar = document.getElementById('idle-progress-bar');
    if (progressBar) {
      const progressPct = Math.max(0, Math.min(100, (remainingMs / this.warningDurationMs) * 100));
      progressBar.style.width = `${progressPct}%`;
      progressBar.classList.toggle('is-critical', remainingMs <= 10000);
    }
  }

  private closeWarningModal(force = false): void {
    if (force) {
      this.warningVisible = false;
    }

    if (Swal.isVisible()) {
      Swal.close();
    }
  }

  private logoutForInactivity(): void {
    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true;
    this.stopWatching();
    this.dialog.closeAll();
    this.accountService.clearAppData();
    void this.router.navigate(['/login'], {
      queryParams: { inactive: true }
    });
  }

  private getRemainingMs(): number {
    return Math.max(0, this.inactivityDeadline - Date.now());
  }

  private formatRemaining(remainingMs: number): string {
    const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private fetchTimerMs(code: string, fallbackMs: number) {
    const url = `${environment.apiBaseUrl}/masters/core/timer-config/`;
    return this.http.get<any>(url, { params: { code } }).pipe(
      map((res) => {
        const ms = Number(
          res?.delay_ms ??
          res?.delayMs ??
          res?.delayMS ??
          res?.delayMilliseconds ??
          0
        );
        return Number.isFinite(ms) && ms > 0 ? ms : fallbackMs;
      }),
      catchError(() => of(fallbackMs))
    );
  }

  private fetchInactivityLogoutMs() {
    return this.fetchTimerMs('INACTIVITY_LOGOUT', 0);
  }

  private fetchInactivityWarningMs() {
    return this.fetchTimerMs('INACTIVITY_WARNING', 30 * 1000);
  }
}
