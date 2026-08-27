import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, forkJoin, map, of } from 'rxjs';
import Swal from 'sweetalert2';
import { Objection } from '../../../../../../core/models/license-application.model';
import { FormDataUtil } from '../../../../../../shared/utils/form-data.util';
import { environment } from '../../../../../../../environments/environment';
import { UnifiedDashboardService } from '../../../../../../core/services/unified-dashboard.service';
import { LicenseApplicationService } from '../../../../../../core/services/license-application.service';
import { PatternConstants } from '../../../../../../shared/constants/pattern.constants';
import { validateUploadedFile } from '../../../../../../shared/utils/file-upload-validation';

export interface ResolveObjectionsDialogData {
  applicationId: string;
}

type DeadlineUrgency = 'ok' | 'warn' | 'critical' | 'expired';

@Component({
  selector: 'app-resolve-objections-dialog',
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
  templateUrl: './resolve-objections-dialog.component.html',
  styleUrls: ['./resolve-objections-dialog.component.scss']
})
export class ResolveObjectionsDialogComponent implements OnInit, OnDestroy {
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

  /** Earliest deadline among unresolved objections. */
  objectionDeadline: Date | null = null;
  deadlineCountdown = '';
  deadlineUrgency: DeadlineUrgency = 'ok';
  private _countdownInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private http: HttpClient,
    private unifiedService: UnifiedDashboardService,
    private licenseAppService: LicenseApplicationService,
    private dialogRef: MatDialogRef<ResolveObjectionsDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: ResolveObjectionsDialogData
  ) {}

  ngOnInit(): void {
    const appId = String(this.data?.applicationId || '').trim();
    if (!appId) {
      this.error = 'Application ID missing.';
      this.isLoading = false;
      return;
    }

    const encodedId = encodeURIComponent(appId);

    const authUrl = `${environment.apiBaseUrl}/auth/${encodedId}/objections/`;

    const objections$ = this.fetchJsonLenient(authUrl).pipe(catchError(() => of([])));

    const application$ = this.unifiedService.getApplicationDetail(appId, 'new-license').pipe(
      catchError(() => of(null))
    );

    forkJoin({ objections: objections$, application: application$ }).subscribe({
      next: ({ objections, application }) => {
        this.application = application;
        this.objections = this.normalizeObjections(objections) as any;

        const unresolved = this.unresolvedObjections;
        const group: Record<string, FormControl<any>> = {};
        for (const obj of unresolved) {
          const current = this.pickValue(obj.fieldName, this.application);
          if (this.isFileField(obj.fieldName, current)) {
            group[obj.fieldName] = new FormControl<File | null>(null, { validators: [Validators.required] });
          } else {
            // Force licensee to provide a corrected value explicitly (don't auto-fill with current value).
            group[obj.fieldName] = new FormControl<any>('', { validators: this.validatorsForField(obj.fieldName) });
          }
        }

        this.form = new FormGroup(group);
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
    if (this._countdownInterval !== null) {
      clearInterval(this._countdownInterval);
      this._countdownInterval = null;
    }
  }

  // â”€â”€ Deadline countdown helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private _initDeadline(): void {
    const deadlines = this.unresolvedObjections
      .map(o => o.deadlineAt ? new Date(o.deadlineAt).getTime() : null)
      .filter((d): d is number => d !== null && !isNaN(d));

    if (deadlines.length === 0) { this.objectionDeadline = null; return; }

    this.objectionDeadline = new Date(Math.min(...deadlines));
    this._tickDeadline();
    this._countdownInterval = setInterval(() => this._tickDeadline(), 1_000);
  }

  private _tickDeadline(): void {
    if (!this.objectionDeadline) return;
    const remaining = this.objectionDeadline.getTime() - Date.now();
    if (remaining <= 0) {
      this.deadlineCountdown = '0 min';
      this.deadlineUrgency = 'expired';
      if (this._countdownInterval !== null) { clearInterval(this._countdownInterval); this._countdownInterval = null; }
      return;
    }
    this.deadlineUrgency = remaining <= 3_600_000 ? 'critical' : remaining <= 86_400_000 ? 'warn' : 'ok';
    const s = Math.floor(remaining / 1_000);
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const parts: string[] = [];
    if (d > 0) parts.push(`${d} day${d !== 1 ? 's' : ''}`);
    if (h > 0) parts.push(`${h} hr${h !== 1 ? 's' : ''}`);
    if (m > 0) parts.push(`${m} min`);
    if (d === 0 && h === 0) parts.push(`${sec} sec`);
    this.deadlineCountdown = parts.join(', ') || '< 1 min';
  }

  // ── End deadline helpers ─────────────────────────────────────────────────

  /** True when the objection deadline has passed — blocks all form submission. */
  get deadlineExpired(): boolean {
    return this.deadlineUrgency === 'expired' ||
      (this.objectionDeadline !== null && this.objectionDeadline.getTime() < Date.now());
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
    if (key.includes('photo') || key.includes('certificate') || key.includes('document') || key.endsWith('_doc')) return true;

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
    const ctrl = this.form.get(fieldName) as FormControl<File | null> | null;
    ctrl?.setValue(file);
    ctrl?.markAsDirty();
    ctrl?.markAsTouched();
  }

  close(): void {
    this.dialogRef.close(false);
  }

  submit(): void {
    const appId = String(this.data?.applicationId || '').trim();
    if (!appId) return;

    if (this.deadlineExpired) {
      void Swal.fire('Deadline Passed', 'The deadline for resolving objections on this application has passed. Submissions are no longer accepted.', 'error');
      return;
    }

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
    this.licenseAppService.resolveNewLicenseObjections(appId, formData).subscribe({
      next: () => {
        this.isLoading = false;
        void Swal.fire('Success', 'Corrections submitted successfully.', 'success');
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.isLoading = false;
        const status = Number(err?.status || 0);
        const raw = err?.error;

        if (typeof raw === 'string' && raw.trim().startsWith('<')) {
          // Backend returned an HTML error page (typically 403/CSRF, login page, or proxy).
          const hint = status === 403
            ? 'Not authorized (403). Please login again, then retry.'
            : 'Request blocked. Please login again, then retry.';
          void Swal.fire('Error', hint, 'error');
          return;
        }

        const msg =
          raw?.detail ||
          raw?.message ||
          (typeof raw === 'string' ? raw : '') ||
          (raw instanceof Error ? raw.message : '') ||
          'Failed to submit corrections.';

        void Swal.fire('Error', String(msg), 'error');
      }
    });
  }

  private normalizeObjections(payload: any): any[] {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.results)) return payload.results;
    if (Array.isArray(payload?.objections)) return payload.objections;
    return [];
  }

  private fetchJsonLenient(url: string) {
    return this.http.get(url, { responseType: 'text' }).pipe(
      map((text) => {
        const raw = String(text ?? '').trim();
        if (!raw) return [];
        if (raw.startsWith('<')) return [];
        try {
          return JSON.parse(raw);
        } catch {
          return [];
        }
      })
    );
  }

  get canSubmit(): boolean {
    if (this.isLoading) return false;
    if (this.deadlineExpired) return false;
    if (this.unresolvedObjections.length === 0) return false;
    if (this.form.invalid) return false;

    // Require that every objection field has a non-empty value (and differs from current for non-file).
    for (const obj of this.unresolvedObjections) {
      const ctrl = this.form.get(obj.fieldName) as FormControl<any> | null;
      const v = ctrl?.value;
      const current = this.pickValue(obj.fieldName, this.application);

      if (this.isFileField(obj.fieldName, current)) {
        if (!(v instanceof File)) return false;
        continue;
      }

      const next = String(v ?? '').trim();
      if (!next) return false;
      const cur = String(current ?? '').trim();
      if (cur && next === cur) return false;
    }

    return true;
  }

  private pickValue(fieldName: string, source: any): any {
    if (!source || !fieldName) return null;

    const direct = source[fieldName];
    if (direct !== undefined && direct !== null) return direct;

    // snake_case fallback
    const snake = fieldName.replace(/([A-Z])/g, '_$1').toLowerCase();
    const snakeVal = source[snake];
    if (snakeVal !== undefined && snakeVal !== null) return snakeVal;

    // camelCase fallback for snake_case fieldName
    const camel = fieldName.replace(/_([a-z])/g, (_, c) => String(c).toUpperCase());
    const camelVal = source[camel];
    if (camelVal !== undefined && camelVal !== null) return camelVal;

    return null;
  }

  inputTypeFor(fieldName: string): string {
    const key = String(fieldName || '').toLowerCase();
    if (key.includes('email')) return 'email';
    if (key.includes('mobile') || key.includes('phone')) return 'tel';
    if (key.includes('aadhaar') || key.includes('aadhar')) return 'tel';
    if (key.includes('pan')) return 'text';
    if (key.includes('pin')) return 'tel';
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
    const raw = String(fieldName || '').trim();
    const key = raw.toLowerCase();
    const validators: ValidatorFn[] = [Validators.required];

    // Common, cross-module patterns (best-effort mapping).
    if (key.includes('email')) {
      validators.push(Validators.pattern(PatternConstants.EMAIL));
      return validators;
    }

    if (key.endsWith('pan') || key.includes('_pan') || key.includes('pan_')) {
      validators.push(Validators.pattern(PatternConstants.PAN));
      return validators;
    }

    if (key.includes('aadhaar') || key.includes('aadhar')) {
      validators.push(Validators.pattern(PatternConstants.AADHAAR_NUMBER));
      return validators;
    }

    if (key.includes('mobile') || key.includes('phone')) {
      validators.push(Validators.pattern(PatternConstants.MOBILE));
      return validators;
    }

    if (key.includes('pin') || key.includes('pincode')) {
      validators.push(Validators.pattern(PatternConstants.PINCODE));
      return validators;
    }

    if (key.includes('cin')) {
      validators.push(Validators.pattern(PatternConstants.CIN));
      return validators;
    }

    if (key.includes('url') || key.includes('website')) {
      validators.push(Validators.pattern(PatternConstants.WEBSITE));
      return validators;
    }

    if (key.includes('address')) {
      validators.push(Validators.pattern(PatternConstants.ADDRESS));
      return validators;
    }

    if (key.includes('name')) {
      validators.push(Validators.pattern(PatternConstants.NAME));
      return validators;
    }

    return validators;
  }
}
