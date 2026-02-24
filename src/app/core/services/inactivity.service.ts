import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { AccountService } from './account.service';

@Injectable({
  providedIn: 'root'
})
export class InactivityService {
  private readonly inactivityLimitMs = 4 * 60 * 1000; // 1 minute
  private readonly warningDurationMs = 30 * 1000; // Final 30-second countdown
  private readonly warningLeadMs = this.inactivityLimitMs - this.warningDurationMs;
  private readonly activityEvents: Array<keyof WindowEventMap> = [
    'mousemove',
    'mousedown',
    'keydown',
    'scroll',
    'touchstart',
    'click'
  ];

  private warningTimeout?: ReturnType<typeof setTimeout>;
  private countdownInterval?: ReturnType<typeof setInterval>;
  private inactivityDeadline = 0;
  private trackingEnabled = false;
  private isLoggingOut = false;
  private warningVisible = false;
  private readonly activityHandler = () => this.onUserActivity();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
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
    this.registerActivityListeners();
    this.startInactivityCycle();
  }

  stopWatching(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.trackingEnabled = false;
    this.unregisterActivityListeners();
    this.clearTimers();
    this.closeWarningModal(true);
  }

  private registerActivityListeners(): void {
    for (const eventName of this.activityEvents) {
      window.addEventListener(eventName, this.activityHandler, { passive: true });
    }
  }

  private unregisterActivityListeners(): void {
    for (const eventName of this.activityEvents) {
      window.removeEventListener(eventName, this.activityHandler as EventListener);
    }
  }

  private onUserActivity(): void {
    if (!this.trackingEnabled || this.isLoggingOut) {
      return;
    }

    // Once the warning modal is visible, only the modal buttons should control the flow.
    if (this.warningVisible) {
      return;
    }

    this.startInactivityCycle();
  }

  private startInactivityCycle(): void {
    this.clearTimers();
    this.inactivityDeadline = Date.now() + this.inactivityLimitMs;

    this.warningTimeout = setTimeout(() => {
      this.openWarning();
    }, this.warningLeadMs);
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
          <div class="idle-timeout-countdown" id="idle-countdown">00:30</div>
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
    if (Swal.isVisible()) {
      Swal.close();
      return;
    }

    if (force) {
      this.warningVisible = false;
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
}
