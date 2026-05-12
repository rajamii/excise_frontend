import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';

interface SiteEnquiryDialogData {
  applicationId: string;
  existingReport?: any | null;
}

@Component({
  selector: 'app-site-enquiry-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatRadioModule,
    MatStepperModule,
    MatFormFieldModule
  ],
  templateUrl: './site-enquiry-form-dialog.component.html',
  styleUrl: './site-enquiry-form-dialog.component.scss'
})
export class SiteEnquiryFormDialogComponent implements OnInit {
  readonly form: FormGroup;
  readonly applicationId: string;
  selectedFileName = '';
  isReverted = false;
  revertedRemarks = '';
  existingShopImageUrl = '';
  existingShopImageName = '';
  private readonly existingReport: any | null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SiteEnquiryFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: SiteEnquiryDialogData
  ) {
    this.applicationId = data?.applicationId || '';
    this.existingReport = data?.existingReport || null;
    this.form = this.fb.group({
      has_traditional_place: [null, Validators.required],
      traditional_place_distance: [''],
      traditional_place_name: ['', [Validators.maxLength(1000)]],
      traditional_place_nature: ['', [Validators.maxLength(1000)]],
      traditional_place_construction: ['', Validators.required],

      has_educational_institution: [false, Validators.required],
      educational_institution_distance: [''],
      educational_institution_name: ['', [Validators.maxLength(1000)]],
      educational_institution_nature: ['', [Validators.maxLength(1000)]],

      has_hospital: [false, Validators.required],
      hospital_distance: [''],
      hospital_name: ['', [Validators.maxLength(1000)]],

      has_taxi_stand: [false, Validators.required],
      taxi_stand_distance: [''],
      taxi_stand_name: ['', [Validators.maxLength(1000)]],

      is_interconnected_with_shops: [false, Validators.required],
      interconnectivity_remarks: [''],
      shop_construction_type: ['', Validators.required],
      has_excise_shops_nearby: [false, Validators.required],
      nearby_excise_shop_count: [0],
      nearby_excise_shops_remarks: [''],
      is_on_highway: [false, Validators.required],
      highway_name: [''],
      shop_image_document: [null, Validators.required],
      latitude: [''],
      longitude: [''],
      is_shop_size_correct: [true, Validators.required],
      shop_size_remarks: [''],
      enquiry_officer_comments: [''],
      additional_enquiry_officer_comments: [''],
      has_id_proof: [null, Validators.required],
      id_proof_comments: [''],
      has_age_proof: [null, Validators.required],
      age_proof_comments: [''],
      has_noc_from_landlord: [null, Validators.required],
      noc_comments: [''],
      has_ownership_proof: [null, Validators.required],
      ownership_proof_comments: [''],
      has_trade_license: [null, Validators.required],
      trade_license_comments: [''],
      proposes_barman_or_salesman: [null, Validators.required],
      worker_proposal_comments: [''],
      worker_docs_valid: [null, Validators.required],
      worker_docs_comments: [''],
      license_recommendation: [null, Validators.required],
      recommendation_comments: [''],
      special_remarks: [''],
      reporting_place: ['']
    });
  }

  ngOnInit(): void {
    this.captureCurrentLocation();
    if (this.existingReport) {
      this.prefillFromExistingReport(this.existingReport);
    }
  }

  private prefillFromExistingReport(report: any): void {
    const rawRevertFlag =
      report?.is_reverted ??
      report?.isReverted ??
      report?.site_enquiry_is_reverted ??
      report?.siteEnquiryIsReverted ??
      report?.siteEnquiryReverted;

    this.isReverted =
      rawRevertFlag === true ||
      (typeof rawRevertFlag === 'string' && rawRevertFlag.trim().toLowerCase() === 'true');

    this.revertedRemarks = String(report?.reverted_remarks ?? report?.revertedRemarks ?? '').trim();

    const booleanKeys = new Set([
      'has_traditional_place',
      'has_educational_institution',
      'has_hospital',
      'has_taxi_stand',
      'is_interconnected_with_shops',
      'has_excise_shops_nearby',
      'is_on_highway',
      'is_shop_size_correct',
      'has_id_proof',
      'has_age_proof',
      'has_noc_from_landlord',
      'has_ownership_proof',
      'has_trade_license',
      'proposes_barman_or_salesman',
      'worker_docs_valid',
      'license_recommendation'
    ]);

    const numberKeys = new Set([
      'traditional_place_distance',
      'educational_institution_distance',
      'hospital_distance',
      'taxi_stand_distance',
      'nearby_excise_shop_count',
      'latitude',
      'longitude'
    ]);

    const coerceValue = (key: string, value: any): any => {
      if (booleanKeys.has(key)) {
        if (value === true || value === false) return value;
        if (typeof value === 'string') {
          const v = value.trim().toLowerCase();
          if (v === 'true') return true;
          if (v === 'false') return false;
        }
        return Boolean(value);
      }

      if (numberKeys.has(key)) {
        if (value === null || value === undefined || value === '') return value;
        const n = typeof value === 'number' ? value : Number(String(value));
        return Number.isFinite(n) ? n : value;
      }

      return value;
    };

    const rawDoc = report?.shop_image_document;
    if (rawDoc) {
      this.existingShopImageUrl = String(rawDoc);
      const last = this.existingShopImageUrl.split('/').pop() || '';
      this.existingShopImageName = decodeURIComponent(last.split('?')[0] || '');
      this.selectedFileName = this.existingShopImageName || this.selectedFileName;
      const docCtrl = this.form.get('shop_image_document');
      docCtrl?.clearValidators();
      docCtrl?.updateValueAndValidity({ emitEvent: false });
    }

    const patch: Record<string, any> = {};

    const snakeToCamel = (key: string): string =>
      String(key || '').replace(/_([a-z0-9])/g, (_, chr: string) => chr.toUpperCase());

    const getReportValue = (key: string): any => {
      if (!report || typeof report !== 'object') return undefined;
      if (Object.prototype.hasOwnProperty.call(report, key)) return report[key];
      const camelKey = snakeToCamel(key);
      if (Object.prototype.hasOwnProperty.call(report, camelKey)) return report[camelKey];
      const compactKey = String(key).replace(/_/g, '');
      if (Object.prototype.hasOwnProperty.call(report, compactKey)) return report[compactKey];
      return undefined;
    };

    Object.keys(this.form.controls).forEach((key) => {
      if (key === 'shop_image_document') return;
      const raw = getReportValue(key);
      if (raw === undefined || raw === null) return;
      patch[key] = coerceValue(key, raw);
    });

    this.form.patchValue(patch, { emitEvent: false });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFileName = file?.name || '';
    this.form.patchValue({ shop_image_document: file });
    this.form.get('shop_image_document')?.updateValueAndValidity();
  }

  captureCurrentLocation(): void {
    if (!('geolocation' in navigator)) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.form.patchValue({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6))
        });
      },
      () => {
        // Ignore location permission errors; user can type manually.
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  shouldShow(controlName: string, expected: boolean = true): boolean {
    return this.form.get(controlName)?.value === expected;
  }

  private hasValue(controlName: string): boolean {
    const value = this.form.get(controlName)?.value;
    return value !== null && value !== undefined && String(value).trim() !== '';
  }

  isStep1Complete(): boolean {
    return this.hasValue('has_traditional_place') && this.hasValue('traditional_place_construction');
  }

  isStep2Complete(): boolean {
    const requiredControls = [
      'has_educational_institution',
      'has_hospital',
      'has_taxi_stand',
      'is_interconnected_with_shops',
      'shop_construction_type',
      'has_excise_shops_nearby',
      'is_on_highway',
      'is_shop_size_correct',
      'shop_image_document'
    ];
    return requiredControls.every((control) => this.hasValue(control));
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value;
    const formData = new FormData();

    Object.keys(value).forEach((key) => {
      const fieldValue = value[key];
      if (key === 'shop_image_document') {
        if (fieldValue) {
          formData.append(key, fieldValue);
        }
        return;
      }
      if (fieldValue === null || fieldValue === undefined) {
        return;
      }
      if (typeof fieldValue === 'boolean') {
        formData.append(key, fieldValue ? 'true' : 'false');
        return;
      }
      formData.append(key, String(fieldValue));
    });

    this.dialogRef.close({
      applicationId: this.applicationId,
      formData
    });
  }
}
