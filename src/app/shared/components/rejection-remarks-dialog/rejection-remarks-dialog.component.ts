import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface WorkflowRejectionEntry {
  id?: number | string;
  remarks?: string;
  rejected_on?: string;
  rejectedOn?: string;
  stage?: { id?: number; name?: string } | string | null;
  rejected_by?: { full_name?: string; username?: string; role?: any } | any;
  rejectedBy?: any;
  [key: string]: any;
}

export interface RejectionRemarksDialogData {
  applicationId: string;
  referenceNo?: string;
  rejections: WorkflowRejectionEntry[];
}

@Component({
  selector: 'app-rejection-remarks-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="rr-header">
      <div class="rr-title">
        <mat-icon class="rr-icon">cancel</mat-icon>
        <div>
          <div class="rr-heading">Rejection Remarks</div>
          <div class="rr-sub">
            <span *ngIf="data.referenceNo">Ref: {{ data.referenceNo }}</span>
            <span class="rr-sep" *ngIf="data.referenceNo">•</span>
            <span>App ID: {{ data.applicationId }}</span>
          </div>
        </div>
      </div>
      <button mat-icon-button type="button" (click)="close()" aria-label="Close dialog">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <div class="rr-body" *ngIf="data.rejections?.length; else empty">
      <div class="rr-card" *ngFor="let r of data.rejections; let i = index">
        <div class="rr-meta">
          <div class="rr-badge" [class.rr-badge-latest]="i === 0">{{ i === 0 ? 'Latest' : ('#' + (data.rejections.length - i)) }}</div>
          <div class="rr-meta-text">
            <div class="rr-line">
              <span class="rr-label">Stage:</span>
              <span class="rr-value">{{ getStageName(r) }}</span>
            </div>
            <div class="rr-line">
              <span class="rr-label">Rejected By:</span>
              <span class="rr-value">{{ getRejectedByDisplay(r) }}</span>
            </div>
            <div class="rr-line">
              <span class="rr-label">Rejected On:</span>
              <span class="rr-value">{{ getRejectedOnDisplay(r) }}</span>
            </div>
          </div>
        </div>
        <div class="rr-remarks">
          <div class="rr-label">Remark</div>
          <div class="rr-remark-text">{{ (r.remarks || '').trim() || '—' }}</div>
        </div>
      </div>
    </div>

    <ng-template #empty>
      <div class="rr-empty">
        No rejection remarks found.
      </div>
    </ng-template>

    <div class="rr-footer">
      <button mat-raised-button color="primary" type="button" (click)="close()">Close</button>
    </div>
  `,
  styles: [`
    .rr-header{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:12px;
      padding:16px 16px 8px 16px;
    }
    .rr-title{ display:flex; gap:12px; align-items:flex-start; }
    .rr-icon{ color:#d32f2f; margin-top:2px; }
    .rr-heading{ font-size:18px; font-weight:700; }
    .rr-sub{ color:#6b7280; font-size:12px; margin-top:2px; }
    .rr-sep{ margin:0 6px; }
    .rr-body{ padding:8px 16px 0 16px; max-height:65vh; overflow:auto; }
    .rr-card{
      border:1px solid #e5e7eb;
      border-radius:12px;
      padding:12px;
      margin-bottom:12px;
      background:#fff;
    }
    .rr-meta{ display:flex; gap:12px; align-items:flex-start; }
    .rr-badge{
      font-size:12px;
      font-weight:700;
      padding:4px 10px;
      border-radius:999px;
      background:#f3f4f6;
      color:#374151;
      white-space:nowrap;
      margin-top:2px;
    }
    .rr-badge-latest{ background:#fee2e2; color:#991b1b; }
    .rr-meta-text{ flex:1; }
    .rr-line{ display:flex; gap:8px; font-size:13px; margin-bottom:4px; }
    .rr-label{ color:#6b7280; min-width:88px; }
    .rr-value{ color:#111827; font-weight:600; }
    .rr-remarks{ margin-top:10px; }
    .rr-remark-text{
      margin-top:6px;
      background:#f9fafb;
      border:1px solid #e5e7eb;
      border-radius:10px;
      padding:10px;
      white-space:pre-wrap;
      font-size:13px;
      line-height:1.35;
    }
    .rr-empty{ padding:16px; color:#6b7280; }
    .rr-footer{ padding:12px 16px 16px 16px; display:flex; justify-content:flex-end; }
  `]
})
export class RejectionRemarksDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: RejectionRemarksDialogData,
    private dialogRef: MatDialogRef<RejectionRemarksDialogComponent>
  ) { }

  close(): void {
    this.dialogRef.close();
  }

  getStageName(rejection: WorkflowRejectionEntry): string {
    const stage = (rejection.stage ?? null) as any;
    if (stage && typeof stage === 'object') return String(stage?.name ?? '').trim() || '—';
    return String(stage ?? '').trim() || '—';
  }

  getRejectedByDisplay(rejection: WorkflowRejectionEntry): string {
    const user = (rejection.rejected_by ?? rejection.rejectedBy ?? null) as any;
    const fullName = String(user?.full_name ?? user?.fullName ?? '').trim();
    if (fullName) return fullName;
    const username = String(user?.username ?? '').trim();
    return username || '—';
  }

  getRejectedOnDisplay(rejection: WorkflowRejectionEntry): string {
    const raw = rejection.rejected_on ?? rejection.rejectedOn ?? '';
    const text = String(raw || '').trim();
    if (!text) return '—';
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return text;
    return date.toLocaleString('en-IN');
  }
}

