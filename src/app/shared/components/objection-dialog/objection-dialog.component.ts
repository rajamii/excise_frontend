import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../../environments/environment';
import { DocumentPreviewDialogComponent } from '../document-preview-dialog/document-preview-dialog.component';

export interface ObjectionDialogResult {
  objections: Array<{ field: string; remarks: string }>;
  generalRemarks?: string;
}

interface ObjectionCandidate {
  field: string;
  label: string;
  value: string;
}

@Component({
  selector: 'app-objection-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  templateUrl: './objection-dialog.component.html',
  styleUrls: ['./objection-dialog.component.scss']
})
export class ObjectionDialogComponent implements OnInit {
  candidates: ObjectionCandidate[] = [];
  form!: FormGroup;

  get rows(): FormArray {
    return this.form.get('rows') as FormArray;
  }

  rowGroup(index: number): FormGroup {
    return this.rows.at(index) as FormGroup;
  }

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private dialogRef: MatDialogRef<ObjectionDialogComponent, ObjectionDialogResult | null>,
    @Inject(MAT_DIALOG_DATA) public data: { application: any; title?: string }
  ) { }

  ngOnInit(): void {
    this.candidates = this.buildCandidates(this.data?.application);

    this.form = this.fb.group({
      generalRemarks: new FormControl<string>('', { nonNullable: true }),
      rows: this.fb.array(this.candidates.map(() => this.buildRow()))
    });

    // If no fields detected, still allow "general" objection.
    if (this.candidates.length === 0) {
      this.form.get('generalRemarks')?.addValidators([Validators.required]);
      this.form.get('generalRemarks')?.updateValueAndValidity({ emitEvent: false });
    }
  }

  private buildRow(): FormGroup {
    return this.fb.group({
      selected: new FormControl<boolean>(false, { nonNullable: true }),
      remarks: new FormControl<string>('', { nonNullable: true })
    });
  }

  private toTitle(label: string): string {
    return String(label || '')
      .replace(/[_\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  private stringifyValue(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') {
      // Prefer common "name"/"label" fields for objects.
      for (const key of ['name', 'label', 'district', 'licenseCategory', 'license_category', 'id']) {
        if (value && typeof value[key] !== 'undefined' && value[key] !== null) {
          const v = this.stringifyValue(value[key]);
          if (v) return v;
        }
      }
      return '';
    }
    return String(value);
  }

  hasText(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    return String(value).trim().length > 0;
  }

  isFilePath(value: unknown): boolean {
    if (!this.hasText(value)) return false;
    const valueStr = String(value).toLowerCase();
    return (
      valueStr.includes('/media/') ||
      valueStr.endsWith('.pdf') ||
      valueStr.endsWith('.jpg') ||
      valueStr.endsWith('.jpeg') ||
      valueStr.endsWith('.png') ||
      valueStr.endsWith('.webp') ||
      valueStr.endsWith('.doc') ||
      valueStr.endsWith('.docx')
    );
  }

  private isImagePath(value: unknown): boolean {
    if (!this.hasText(value)) return false;
    const valueStr = String(value).toLowerCase();
    return valueStr.endsWith('.jpg') || valueStr.endsWith('.jpeg') || valueStr.endsWith('.png') || valueStr.endsWith('.webp');
  }

  getFileUrl(value: unknown): string {
    if (!this.hasText(value)) return '#';
    const valueStr = String(value).trim();

    if (valueStr.startsWith('http://') || valueStr.startsWith('https://')) {
      return valueStr;
    }

    const base = String(environment.apiBaseUrl || '').replace(/\/+$/, '');
    const cleaned = valueStr.replace(/^\/+/, '');
    const alreadyMedia = cleaned.toLowerCase().startsWith('media/');
    const path = `/${alreadyMedia ? cleaned : `media/${cleaned}`}`;
    return `${base}${path}`;
  }

  openPreview(value: unknown): void {
    const url = this.getFileUrl(value);
    if (!url || url === '#') return;

    this.dialog.open(DocumentPreviewDialogComponent, {
      width: 'min(980px, 95vw)',
      maxWidth: '95vw',
      data: { url }
    });
  }

  private buildCandidates(application: any): ObjectionCandidate[] {
    const source = application?.raw && typeof application.raw === 'object' ? application.raw : application;
    if (!source || typeof source !== 'object') return [];

    const excluded = new Set<string>([
      'id', 'pk',
      'workflow', 'workflow_id', 'workflowId',
      'current_stage', 'currentStage',
      'current_stage_id', 'currentStageId',
      'current_stage_name', 'currentStageName',
      'transactions', 'allowedActions', 'allowed_actions', 'allowedActionConfigs', 'allowed_action_configs',
      'objections', 'rejections',
      'created_at', 'updated_at', 'createdAt', 'updatedAt',
      'application_id', 'applicationId', 'applicationID',
      'referenceNo', 'reference_no',

      // ── Computed / auto-assigned — user never enters these ──────────────────
      // Applicant identity (derived from the user account, not the form)
      'applicantFullName', 'applicant_full_name',
      'applicantUsername', 'applicant_username',
      'applicantName', 'applicant_name',

      // License assignment (auto-generated by the system)
      'license', 'licenseId', 'license_id',
      'licenseIdDisplay', 'license_id_display',
      'licenseCategory', 'license_category',
      'licenseCategoryName', 'license_category_name',
      'licenseCategoryId', 'license_category_id',

      // Print / approval counters (system-managed)
      'isPrintFeePaid', 'is_print_fee_paid',
      'printCount', 'print_count',
      'isApproved', 'is_approved',

      // Timestamps auto-set by the system
      'submissionDate', 'submission_date',
      'submittedOn', 'submitted_on',
      'approvedDate', 'approved_date',
      'rejectedDate', 'rejected_date',

      // Linked application references (auto-linked, not user input)
      'newLicenseApplication', 'new_license_application',
      'newLicenseApplicationId', 'new_license_application_id',
      'renewalOf', 'renewal_of',
      'renewalOfLicenseId', 'renewal_of_license_id',

      // Payment gateway / wallet (system-generated)
      'applicationFeePaymentStatus', 'application_fee_payment_status',
      'applicationFeePaymentStatusDisplay', 'application_fee_payment_status_display',
    ]);

    // Hide system-generated / non-editable fields in the objection list.
    // Keep uploads (file paths) even if the key name matches patterns (e.g. payment receipt doc path).
    const excludedPatterns: RegExp[] = [
      /payment/i,
      /transaction/i,
      /\btxn\b/i,
      /\butr\b/i,
      /\bfee\b/i,
      /receipt/i,
      /challan/i,
      /order[_-]?id/i,
      /gateway/i,
      /checksum/i,
      /signature/i,
      /status/i,
      /stage/i,
      /workflow/i,
      /error/i,
      /log/i,
      /audit/i,
      /verified/i,
      /approved/i,
      /rejected/i,
      /forward/i,
      /assigned/i,
      /created/i,
      /updated/i,
      /submitted/i,
      // Auto-assigned system fields
      /^license$/i,
      /licen[sc]e_?id/i,
      /licen[sc]e_?category/i,
      /licen[sc]e_?display/i,
      /print_?count/i,
      /print_?fee/i,
      /is_?approved/i,
      /is_?active/i,
      /renewal_?of/i,
      /applicant_?full_?name/i,
      /applicant_?username/i,
      /applicant_?name/i,
      /submission_?date/i,
      /submitted_?on/i,
      /new_?license_?application/i,
    ];

    const excludedRelations = new Set<string>([
      'applicant',
      'user',
      'licensee',
      'created_by',
      'updated_by',
      'submitted_by',
      'assigned_to',
      'assignedto',
      'officer',
      'officerincharge'
    ]);

    const candidates: ObjectionCandidate[] = [];
    for (const key of Object.keys(source)) {
      if (excluded.has(key)) continue;
      const value = source[key];

      // Skip large / complex shapes.
      if (Array.isArray(value)) continue;

      const keyStr = String(key || '');
      const keyLower = keyStr.toLowerCase();
      const isUpload = this.isFilePath(value);
      if (!isUpload) {
        if (excludedRelations.has(keyLower)) continue;
        if (excludedPatterns.some(r => r.test(keyStr))) continue;
      }
      if (value && typeof value === 'object') {
        // Allow small objects with a meaningful display string.
        const display = this.stringifyValue(value);
        if (!display) continue;

        // Hide relation-like objects that only stringify to an ID number.
        if (excludedRelations.has(keyLower) && /^\d+$/.test(display)) continue;
        candidates.push({ field: key, label: this.toTitle(key), value: display });
        continue;
      }

      const display = this.stringifyValue(value);
      if (!display) continue;
      candidates.push({ field: key, label: this.toTitle(key), value: display });
    }

    // Stable ordering for the dialog.
    return candidates.sort((a, b) => a.label.localeCompare(b.label));
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSubmit(): void {
    const objections: Array<{ field: string; remarks: string }> = [];

    if (this.candidates.length) {
      this.candidates.forEach((c, idx) => {
        const row = this.rows.at(idx) as FormGroup;
        const selected = !!row.get('selected')?.value;
        const remarks = String(row.get('remarks')?.value || '').trim();
        if (!selected) return;
        if (!remarks) return;
        objections.push({ field: c.field, remarks });
      });
    }

    const generalRemarks = String(this.form.get('generalRemarks')?.value || '').trim();
    if (objections.length === 0) {
      if (!generalRemarks) {
        this.form.get('generalRemarks')?.setErrors({ required: true });
        return;
      }
      objections.push({ field: 'general', remarks: generalRemarks });
    }

    this.dialogRef.close({ objections, generalRemarks });
  }
}
