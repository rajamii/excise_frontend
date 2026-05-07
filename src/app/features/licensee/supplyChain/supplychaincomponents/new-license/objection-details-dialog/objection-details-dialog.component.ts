import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UnifiedDashboardService } from '../../../../../../core/services/unified-dashboard.service';
import { Objection } from '../../../../../../core/models/license-application.model';

export interface ObjectionDetailsDialogData {
  applicationId: string;
}

@Component({
  selector: 'app-objection-details-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './objection-details-dialog.component.html',
  styleUrls: ['./objection-details-dialog.component.scss']
})
export class ObjectionDetailsDialogComponent implements OnInit {
  isLoading = true;
  error: string | null = null;
  objections: Objection[] = [];

  constructor(
    private unifiedService: UnifiedDashboardService,
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
      },
      error: () => {
        this.error = 'Failed to load objections.';
        this.isLoading = false;
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  get unresolved(): Objection[] {
    return (this.objections || []).filter(o => o && !o.isResolved);
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
}

