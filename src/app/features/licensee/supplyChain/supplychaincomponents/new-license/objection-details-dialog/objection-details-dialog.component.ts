import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UnifiedDashboardService } from '../../../../../../core/services/unified-dashboard.service';
import { Objection } from '../../../../../../core/models/license-application.model';
import { environment } from '../../../../../../../environments/environment';
import { DocumentPreviewDialogComponent } from '../../../../../../shared/components/document-preview-dialog/document-preview-dialog.component';

export interface ObjectionDetailsDialogData {
  applicationId: string;
}

/** Urgency level of the objection deadline. */
type DeadlineUrgency = 'ok' | 'warn' | 'critical' | 'expired';

@Component({
  selector: 'app-objection-details-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './objection-details-dialog.component.html',
  styleUrls: ['./objection-details-dialog.component.scss']
})
export class ObjectionDetailsDialogComponent implements OnInit, OnDestroy {
  isLoading = true;
  error: string | null = null;
  objections: Objection[] = [];

  /** Earliest deadline among all unresolved objections (Date object). */
  objectionDeadline: Date | null = null;
  /** Human-readable countdown string e.g. "5 days, 3 hrs, 12 min". */
  deadlineCountdown = '';
  /** Urgency level driving colour-coding in the template. */
  deadlineUrgency: DeadlineUrgency = 'ok';

  private _countdownInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private unifiedService: UnifiedDashboardService,
    private dialog: MatDialog,
    private dialogRef: MatDialogRef<ObjectionDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ObjectionDetailsDialogData
  ) {}

  ngOnInit(): void {
    const appId = String(this.data?.applicationId || '').trim();
    if (!appId) {
      this.error = 'Application ID missing.';
      this.isLoading = false;
      return;
    }

    this.unifiedService.getObjections(appId).subscribe({
      next: (data) => {
        this.objections = Array.isArray(data) ? data : [];
        this.isLoading = false;
        this._initDeadline();
      },
      error: () => {
        this.error = 'Failed to load objections.';
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this._clearCountdown();
  }

  close(): void {
    this.dialogRef.close();
  }

  get unresolved(): Objection[] {
    return (this.objections || []).filter(o => o && !o.isResolved);
  }

  get resolved(): Objection[] {
    return (this.objections || []).filter(o => o && !!o.isResolved);
  }

  label(fieldName: string): string {
    return String(fieldName || '')
      .replace(/[_\-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  isDocumentValue(value: string | null | undefined): boolean {
    const v = String(value || '').trim().toLowerCase();
    if (!v) return false;
    if (v.startsWith('data:image/')) return true;
    return /\.(png|jpe?g|webp|gif|bmp|svg|pdf)(\?.*)?$/.test(v);
  }

  toMediaUrl(value: string | null | undefined): string {
    const v = String(value || '').trim();
    if (!v) return '';
    if (/^https?:\/\//i.test(v) || v.startsWith('data:')) return v;

    const base = String((environment as any)?.apiBaseUrl || '').replace(/\/+$/, '');
    const cleaned = v.replace(/^\/+/, '');
    const alreadyMedia = cleaned.toLowerCase().startsWith('media/');
    const path = alreadyMedia ? cleaned : `media/${cleaned}`;
    if (!base) return `/${path}`;
    return `${base}/${path}`;
  }

  previewDocument(label: string, value: string | null | undefined): void {
    if (!this.isDocumentValue(value)) return;
    const url = this.toMediaUrl(value);
    this.dialog.open(DocumentPreviewDialogComponent, {
      width: 'min(920px, 95vw)',
      maxWidth: '95vw',
      data: { url }
    });
  }

  // ── Deadline countdown helpers ───────────────────────────────────────────

  private _initDeadline(): void {
    // Find the earliest deadline_at among unresolved objections.
    const deadlines = this.unresolved
      .map(o => o.deadlineAt ? new Date(o.deadlineAt).getTime() : null)
      .filter((d): d is number => d !== null && !isNaN(d));

    if (deadlines.length === 0) {
      this.objectionDeadline = null;
      return;
    }

    this.objectionDeadline = new Date(Math.min(...deadlines));
    this._tick();
    this._countdownInterval = setInterval(() => this._tick(), 1_000);
  }

  private _tick(): void {
    if (!this.objectionDeadline) return;

    const remaining = this.objectionDeadline.getTime() - Date.now();

    if (remaining <= 0) {
      this.deadlineCountdown = '0 min';
      this.deadlineUrgency = 'expired';
      this._clearCountdown();
      return;
    }

    // Urgency levels
    const ONE_HOUR  = 3_600_000;
    const ONE_DAY   = 86_400_000;

    if (remaining <= ONE_HOUR) {
      this.deadlineUrgency = 'critical';
    } else if (remaining <= ONE_DAY) {
      this.deadlineUrgency = 'warn';
    } else {
      this.deadlineUrgency = 'ok';
    }

    this.deadlineCountdown = this._formatRemaining(remaining);
  }

  private _formatRemaining(ms: number): string {
    const totalSeconds = Math.floor(ms / 1_000);
    const days    = Math.floor(totalSeconds / 86_400);
    const hours   = Math.floor((totalSeconds % 86_400) / 3_600);
    const minutes = Math.floor((totalSeconds % 3_600) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];
    if (days    > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours   > 0) parts.push(`${hours} hr${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} min`);
    if (days    === 0 && hours === 0) parts.push(`${seconds} sec`);

    return parts.join(', ') || '< 1 min';
  }

  private _clearCountdown(): void {
    if (this._countdownInterval !== null) {
      clearInterval(this._countdownInterval);
      this._countdownInterval = null;
    }
  }
}
