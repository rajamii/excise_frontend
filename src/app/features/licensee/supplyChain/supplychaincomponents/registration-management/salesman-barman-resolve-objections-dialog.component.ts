import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
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
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { environment } from '../../../../../../environments/environment';
import { validateUploadedFile } from '../../../../../shared/utils/file-upload-validation';

export interface SalesmanBarmanResolveObjectionsDialogData {
  applicationId: string;
  appType?: 'salesman-barman' | 'company-registration';
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
            <div class="sb-field-header mb-1">
              <div class="sb-field-name">{{ label(obj.fieldName) }}</div>
              <div class="sb-field-remark text-danger fw-semibold d-flex align-items-center">
                <mat-icon style="font-size: 16px; width: 16px; height: 16px; margin-right: 4px; vertical-align: middle;">error</mat-icon>
                <span>{{ obj.remarks }}</span>
              </div>
            </div>

            <div class="sb-current mb-2" *ngIf="currentValue(obj.fieldName) as cv">
              <span class="fw-semibold text-muted small">Current: </span>
              <ng-container *ngIf="isDocumentPath(cv); else textVal">
                <a [href]="getDocumentUrl(cv)" target="_blank" rel="noopener" class="btn btn-sm btn-outline-primary d-inline-flex align-items-center py-1">
                  <mat-icon style="font-size: 16px; width: 16px; height: 16px; margin-right: 4px; vertical-align: middle;">description</mat-icon>
                  View Document
                </a>
              </ng-container>
              <ng-template #textVal>
                <span class="text-dark small" style="white-space: pre-wrap;">{{ cv }}</span>
              </ng-template>
            </div>

            <div class="file-upload-row my-2" *ngIf="isFileField(obj.fieldName, currentValue(obj.fieldName))">
              <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx" (change)="onFileSelected(obj.fieldName, $event)" class="form-control" />
            </div>

            <mat-form-field appearance="outline" class="w-100" *ngIf="!isFileField(obj.fieldName, currentValue(obj.fieldName))">
              <mat-label>Corrected Value</mat-label>
              <ng-container *ngIf="isBrandTypeField(obj.fieldName); else regularInput">
                <select matNativeControl [formControlName]="obj.fieldName">
                  <option value="" disabled>-- Choose Option --</option>
                  <option value="Manufactured in Sikkim">Manufactured in Sikkim</option>
                  <option value="Imported from other States/Country">Imported from other States/Country</option>
                  <option value="Bottled in Sikkim (Collaboration)">Bottled in Sikkim (Collaboration)</option>
                </select>
              </ng-container>
              <ng-template #regularInput>
                <textarea matInput *ngIf="obj.fieldName.toLowerCase().includes('address')" [formControlName]="obj.fieldName" rows="3"></textarea>
                <input matInput *ngIf="!obj.fieldName.toLowerCase().includes('address')" [type]="inputTypeFor(obj.fieldName)" [formControlName]="obj.fieldName" />
              </ng-template>
              <mat-error *ngIf="form.get(obj.fieldName)?.touched && form.get(obj.fieldName)?.invalid">
                {{ errorText(obj.fieldName) }}
              </mat-error>
            </mat-form-field>
          </div>
        </form>
      </ng-container>
    </div>

    <div mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close()">Cancel</button>
      <button
        *ngIf="unresolvedObjections.length"
        mat-raised-button
        color="primary"
        type="button"
        (click)="submit()"
        [disabled]="isSubmitDisabled"
      >
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
    .sb-field-remark { color:#dc2626; font-size: 13px; white-space: pre-wrap; display: flex; align-items: center; }
    .sb-current { background: #f9fafb; padding: 8px 12px; border-radius: 6px; border-left: 3px solid #d1d5db; white-space: pre-wrap; }
  `]
})
export class SalesmanBarmanResolveObjectionsDialogComponent implements OnInit {
  private readonly allowedFileExtensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx'];
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  private readonly maxFileSizeBytes = 5 * 1024 * 1024;

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

    const appType = this.data?.appType || 'salesman-barman';
    const objections$ = this.unifiedService.getObjections(appId).pipe(catchError(() => of([] as any)));
    const application$ = this.unifiedService.getApplicationDetail(appId, appType).pipe(catchError(() => of(null)));

    forkJoin({ objections: objections$, application: application$ }).subscribe({
      next: ({ objections, application }) => {
        this.application = application;
        this.objections = Array.isArray(objections) ? objections : [];

        const group: Record<string, FormControl<any>> = {};
        for (const obj of this.unresolvedObjections) {
          const current = this.currentValue(obj.fieldName);
          if (this.isFileField(obj.fieldName, current)) {
            group[obj.fieldName] = new FormControl<any>(null, { validators: [Validators.required] });
          } else {
            group[obj.fieldName] = new FormControl<any>('', { validators: this.validatorsForField(obj.fieldName) });
          }
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
    const raw = String(fieldName || '').trim();
    if (raw.includes('::')) {
      const parts = raw.split('::');
      const key = parts[0];
      const indexStr = parts[1];
      const idx = parseInt(indexStr, 10);
      if (!isNaN(idx) && this.application) {
        const arr = this.pickValue(key, this.application);
        if (Array.isArray(arr) && arr[idx]) {
          const m = arr[idx];
          const name = m.name || m.memberName || m.member_name || '';
          const desig = m.designation || m.memberDesignation || m.member_designation || '';
          const labelParts = [];
          if (name) labelParts.push(name);
          if (desig) labelParts.push(`(${desig})`);
          return labelParts.length > 0
            ? `Member Details [${idx + 1}]: ${labelParts.join(' ')}`
            : `Member Details [${idx + 1}]`;
        }
      }
      return `Member Details [${idx + 1}]`;
    }

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

  currentValue(fieldName: string): any {
    const raw = String(fieldName || '').trim();
    if (raw.includes('::')) {
      const parts = raw.split('::');
      const key = parts[0];
      const indexStr = parts[1];
      const idx = parseInt(indexStr, 10);
      if (!isNaN(idx) && this.application) {
        const arr = this.pickValue(key, this.application);
        if (Array.isArray(arr) && arr[idx]) {
          const m = arr[idx];
          const name = m.name || m.memberName || m.member_name || '';
          const desig = m.designation || m.memberDesignation || m.member_designation || '';
          const mob = m.mobile || m.mobileNumber || m.memberMobileNumber || m.member_mobile_number || '';
          const email = m.email || m.emailId || m.memberEmailId || m.member_email_id || '';
          const addr = m.address || m.memberAddress || m.member_address || '';
          
          const valParts = [];
          if (name) valParts.push(`Name: ${name}`);
          if (desig) valParts.push(`Designation: ${desig}`);
          if (mob) valParts.push(`Mob: ${mob}`);
          if (email) valParts.push(`Email: ${email}`);
          if (addr) valParts.push(`Addr: ${addr}`);
          return valParts.join('\n');
        }
      }
      return null;
    }
    return this.pickValue(fieldName, this.application);
  }

  isFileField(fieldName: string, value: unknown): boolean {
    const key = String(fieldName || '').toLowerCase();
    if (key.includes('photo') || key.includes('certificate') || key.includes('document') || key.endsWith('_doc') || key.includes('deed') || key.includes('association') || key.includes('undertaking')) return true;

    if (typeof value !== 'string') return false;
    const v = value.toLowerCase();
    return (
      v.includes('/media/') ||
      v.endsWith('.pdf') ||
      v.endsWith('.jpg') ||
      v.endsWith('.jpeg') ||
      v.endsWith('.png') ||
      v.endsWith('.webp') ||
      v.endsWith('.doc') ||
      v.endsWith('.docx')
    );
  }

  isBrandTypeField(fieldName: string): boolean {
    const key = String(fieldName || '').toLowerCase();
    return key === 'brandtype' || key === 'brand_type';
  }

  isDocumentPath(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const v = value.toLowerCase();
    return (
      v.includes('/media/') ||
      v.endsWith('.pdf') ||
      v.endsWith('.jpg') ||
      v.endsWith('.jpeg') ||
      v.endsWith('.png') ||
      v.endsWith('.webp') ||
      v.endsWith('.doc') ||
      v.endsWith('.docx')
    );
  }

  getDocumentUrl(value: unknown): string {
    if (typeof value !== 'string') return '#';
    const url = value.trim();
    if (!url) return '#';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = String(environment.apiBaseUrl || '').replace(/\/+$/, '');
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${base}${path}`;
  }

  onFileSelected(fieldName: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return;
    const validationError = validateUploadedFile(file, {
      allowedExtensions: this.allowedFileExtensions,
      allowedMimeTypes: this.allowedMimeTypes,
      maxFileSizeBytes: this.maxFileSizeBytes,
      label: this.label(fieldName)
    });
    if (validationError) {
      input.value = '';
      void Swal.fire('Invalid File', validationError, 'error');
      return;
    }
    const ctrl = this.form.get(fieldName) as FormControl<any> | null;
    ctrl?.setValue(file);
    ctrl?.markAsDirty();
    ctrl?.markAsTouched();
  }

  close(): void {
    this.dialogRef.close(false);
  }

  get isSubmitDisabled(): boolean {
    if (this.isLoading) return true;
    if (!this.unresolvedObjections.length) return true;
    if (!this.form || this.form.invalid) return true;
    return !this.allCorrectedValuesProvidedAndChanged();
  }

  private allCorrectedValuesProvidedAndChanged(): boolean {
    for (const obj of this.unresolvedObjections) {
      const ctrl = this.form.get(obj.fieldName) as FormControl<any> | null;
      const corrected = ctrl?.value;
      if (corrected === null || corrected === undefined) return false;

      if (corrected instanceof File) {
        continue;
      }

      const correctedStr = String(corrected).trim();
      if (!correctedStr) return false;

      const original = this.originalValueFor(obj);
      if (correctedStr === original) return false;
    }
    return true;
  }

  private originalValueFor(obj: Objection): string {
    const before = String((obj as any)?.beforeContent ?? '').trim();
    if (before) return before;

    const fromApp = this.pickValue(obj.fieldName, this.application);
    return String(fromApp ?? '').trim();
  }

  private pickValue(fieldName: string, source: any): any {
    if (!source) return null;
    const key = String(fieldName || '').trim();
    if (!key) return null;
    if (Object.prototype.hasOwnProperty.call(source, key)) return source[key];

    const snake = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (Object.prototype.hasOwnProperty.call(source, snake)) return source[snake];

    const lower = key.toLowerCase();
    const matchKey = Object.keys(source).find(k => String(k || '').toLowerCase() === lower);
    if (matchKey) return source[matchKey];

    return null;
  }

  inputTypeFor(fieldName: string): string {
    const key = String(fieldName || '').toLowerCase();
    if (key.includes('email')) return 'email';
    if (key.includes('mobile') || key.includes('phone')) return 'tel';
    if (key.includes('aadhaar') || key.includes('aadhar')) return 'tel';
    if (key.includes('pan')) return 'text';
    return 'text';
  }

  errorText(fieldName: string): string {
    const ctrl = this.form.get(fieldName);
    if (!ctrl) return 'Invalid value';
    if (ctrl.hasError('required')) return 'Required';
    if (ctrl.hasError('pattern')) return 'Invalid format';
    if (ctrl.hasError('email')) return 'Invalid email';
    return 'Invalid value';
  }

  private validatorsForField(fieldName: string): ValidatorFn[] {
    const key = String(fieldName || '').trim();
    const lower = key.toLowerCase();
    const validators: ValidatorFn[] = [Validators.required];

    if (lower.includes('name')) {
      validators.push(Validators.pattern(PatternConstants.NAME));
      return validators;
    }

    if (lower === 'pan') {
      validators.push(Validators.pattern(PatternConstants.PAN));
      return validators;
    }

    if (lower === 'aadhaar' || lower === 'aadhar') {
      validators.push(Validators.pattern(PatternConstants.AADHAAR_NUMBER));
      return validators;
    }

    if (lower.includes('mobile') || lower.includes('phone')) {
      validators.push(Validators.pattern(PatternConstants.MOBILE));
      return validators;
    }

    if (lower.includes('email')) {
      validators.push(Validators.pattern(PatternConstants.EMAIL));
      return validators;
    }

    if (lower.includes('address')) {
      validators.push(Validators.pattern(PatternConstants.ADDRESS));
      return validators;
    }

    if (lower.includes('pincode') || lower.includes('pin_code')) {
      validators.push(Validators.pattern(PatternConstants.PINCODE));
      return validators;
    }

    return validators;
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

    if (!this.allCorrectedValuesProvidedAndChanged()) {
      this.form.markAllAsTouched();
      void Swal.fire('Update Required', 'Please correct every objected field (value must be changed from before/current).', 'warning');
      return;
    }

    const payload: Record<string, any> = {};
    for (const obj of this.unresolvedObjections) {
      payload[obj.fieldName] = (this.form.get(obj.fieldName) as FormControl<any>)?.value;
    }
    const formData = FormDataUtil.buildFormData(payload);

    this.isLoading = true;
    const appType = this.data?.appType || 'salesman-barman';
    this.unifiedService.resolveObjections(appId, appType, formData).subscribe({
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
