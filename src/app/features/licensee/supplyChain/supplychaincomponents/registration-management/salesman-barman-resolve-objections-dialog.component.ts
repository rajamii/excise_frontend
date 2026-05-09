import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, forkJoin, of } from 'rxjs';
import Swal from 'sweetalert2';
import { UnifiedDashboardService } from '../../../../../core/services/unified-dashboard.service';
import { Objection } from '../../../../../core/models/license-application.model';
import { FormDataUtil } from '../../../../../shared/utils/form-data.util';

export interface SalesmanBarmanResolveObjectionsDialogData {
  applicationId: string;
}

@Component({
  selector: 'app-salesman-barman-resolve-objections-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>Resolve Objections</h2>

    <div mat-dialog-content class="sb-resolve-content">
      <div *ngIf="isLoading" class="sb-loading">
        <mat-progress-spinner diameter="32" mode="indeterminate"></mat-progress-spinner>
        <div class="ms-3">Loading objections...</div>
      </div>

      <div *ngIf="!isLoading && error" class="alert alert-danger">
        {{ error }}
      </div>

      <ng-container *ngIf="!isLoading && !error">
        <div class="hint mb-2" *ngIf="unresolvedObjections.length">
          Update only the fields mentioned in objections, then submit to send back to the officer.
        </div>

        <div class="empty" *ngIf="!unresolvedObjections.length">
          No unresolved objections found.
        </div>

        <form *ngIf="unresolvedObjections.length" [formGroup]="form" class="sb-form">
          <div class="sb-field" *ngFor="let obj of unresolvedObjections">
            <div class="sb-field-header">
              <div class="sb-field-name">{{ label(obj.fieldName) }}</div>
              <div class="sb-field-remark">{{ obj.remarks }}</div>
            </div>

            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Corrected Value</mat-label>
              <input matInput [formControlName]="obj.fieldName" />
              <mat-error *ngIf="form.get(obj.fieldName)?.invalid">Required</mat-error>
            </mat-form-field>
          </div>
        </form>
      </ng-container>
    </div>

    <div mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close()">Cancel</button>
      <button mat-raised-button color="primary" type="button" (click)="submit()" [disabled]="isLoading">
        Submit
      </button>
    </div>
  `,
  styles: [`
    .sb-resolve-content { min-width: min(920px, 92vw); }
    .sb-loading { display:flex; align-items:center; padding: 8px 0; }
    .hint { color:#6b7280; font-size: 13px; }
    .empty { color:#6b7280; padding: 8px 0; }
    .sb-form { display:flex; flex-direction:column; gap: 12px; }
    .sb-field { border:1px solid #e5e7eb; border-radius: 12px; padding: 12px; background:#fff; }
    .sb-field-header { display:flex; flex-direction:column; gap: 4px; margin-bottom: 10px; }
    .sb-field-name { font-weight: 700; color:#111827; }
    .sb-field-remark { color:#6b7280; font-size: 13px; white-space: pre-wrap; }
  `]
})
export class SalesmanBarmanResolveObjectionsDialogComponent implements OnInit {
  isLoading = true;
  error: string | null = null;

  objections: Objection[] = [];
  application: any = null;

  form = new FormGroup({});

  constructor(
    private unifiedService: UnifiedDashboardService,
    private dialogRef: MatDialogRef<SalesmanBarmanResolveObjectionsDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: SalesmanBarmanResolveObjectionsDialogData
  ) { }

  ngOnInit(): void {
    const appId = String(this.data?.applicationId || '').trim();
    if (!appId) {
      this.error = 'Application ID missing.';
      this.isLoading = false;
      return;
    }

    const objections$ = this.unifiedService.getObjections(appId).pipe(catchError(() => of([] as any)));
    const application$ = this.unifiedService.getApplicationDetail(appId, 'salesman-barman').pipe(catchError(() => of(null)));

    forkJoin({ objections: objections$, application: application$ }).subscribe({
      next: ({ objections, application }) => {
        this.application = application;
        this.objections = Array.isArray(objections) ? objections : [];

        const group: Record<string, FormControl<any>> = {};
        for (const obj of this.unresolvedObjections) {
          group[obj.fieldName] = new FormControl<any>('', { validators: [Validators.required] });
        }
        this.form = new FormGroup(group);
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load objections.';
        this.isLoading = false;
      }
    });
  }

  get unresolvedObjections(): Objection[] {
    return (this.objections || [])
      .filter(o => !!o && !o.isResolved)
      .slice()
      .sort((a, b) => String(a.fieldName).localeCompare(String(b.fieldName)));
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

  close(): void {
    this.dialogRef.close(false);
  }

  submit(): void {
    const appId = String(this.data?.applicationId || '').trim();
    if (!appId) return;

    if (this.unresolvedObjections.length === 0) {
      void Swal.fire('No Objections', 'No unresolved objections found.', 'info');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      void Swal.fire('Required', 'Please fill all objection fields.', 'warning');
      return;
    }

    const payload: Record<string, any> = {};
    for (const obj of this.unresolvedObjections) {
      payload[obj.fieldName] = (this.form.get(obj.fieldName) as FormControl<any>)?.value;
    }
    const formData = FormDataUtil.buildFormData(payload);

    this.isLoading = true;
    this.unifiedService.resolveObjections(appId, 'salesman-barman', formData).subscribe({
      next: () => {
        this.isLoading = false;
        void Swal.fire('Success', 'Corrections submitted successfully.', 'success');
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.error?.detail || err?.error?.message || err?.message || 'Failed to submit corrections.';
        void Swal.fire('Error', String(msg), 'error');
      }
    });
  }
}

