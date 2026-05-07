import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import {
  DirectorateAndDistrictOfficials,
  GrievanceRedressalOfficer,
  NodalOfficer,
  PublicInformationOfficer
} from '../../../../../core/models/contact-us.model';

type ContactUsRecord =
  | NodalOfficer
  | PublicInformationOfficer
  | DirectorateAndDistrictOfficials
  | GrievanceRedressalOfficer;

interface ContactUsFieldConfig {
  key: string;
  apiKey?: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  options?: Array<{ value: string; label: string }>;
}

interface ContactUsCategoryConfig {
  label: string;
  singularLabel: string;
  fields: ContactUsFieldConfig[];
  create: (data: Partial<ContactUsRecord>) => import('rxjs').Observable<ContactUsRecord>;
  update: (id: number, data: Partial<ContactUsRecord>) => import('rxjs').Observable<ContactUsRecord>;
}

interface ContactUsDialogData {
  category: ContactUsCategoryConfig;
  record: ContactUsRecord | null;
}

@Component({
  selector: 'app-contact-us-manage',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent implements OnInit {
  contact: Partial<ContactUsRecord> = {};
  isEditMode = false;
  readonly phonePattern = '^[0-9]{10}$';

  constructor(
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ContactUsDialogData
  ) {}

  ngOnInit(): void {
    this.contact = this.data.record ? this.toFormRecord(this.data.record) : {};
    this.isEditMode = !!this.data.record;
  }

  onSave(): void {
    Swal.fire({
      title: this.isEditMode
        ? `Update ${this.data.category.singularLabel}?`
        : `Add ${this.data.category.singularLabel}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      const payload = this.toApiPayload(this.contact);
      const request = this.isEditMode
        ? this.data.category.update(Number(this.contact.id), payload)
        : this.data.category.create(payload);

      request.subscribe({
        next: () => {
          Swal.fire(
            'Success',
            this.isEditMode ? 'Contact updated!' : 'Contact added!',
            'success'
          );
          this.dialogRef.close(true);
        },
        error: (error) => Swal.fire('Error', this.formatApiError(error), 'error')
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private formatApiError(error: any): string {
    const detail = error?.error;

    if (!detail) {
      return 'Failed to save contact.';
    }

    if (typeof detail === 'string') {
      return detail;
    }

    if (detail.detail) {
      return String(detail.detail);
    }

    const messages = Object.entries(detail)
      .map(([key, value]) => {
        const label = this.getFieldLabel(key);
        const message = Array.isArray(value) ? value.join(', ') : String(value);
        return `${label}: ${message}`;
      })
      .filter(Boolean);

    return messages.length ? messages.join('<br>') : 'Failed to save contact.';
  }

  private getFieldLabel(key: string): string {
    const normalizedKey = key.replace(/_/g, '').toLowerCase();
    const field = this.data.category.fields.find(item =>
      item.key.replace(/_/g, '').toLowerCase() === normalizedKey ||
      (item.apiKey || '').replace(/_/g, '').toLowerCase() === normalizedKey
    );

    return field?.label || key;
  }

  private toFormRecord(record: ContactUsRecord): Partial<ContactUsRecord> {
    const formRecord: any = { ...record };

    for (const field of this.data.category.fields) {
      const apiKey = field.apiKey || field.key;
      formRecord[field.key] = this.readValue(record, field.key, apiKey);
    }

    return formRecord;
  }

  private toApiPayload(record: Partial<ContactUsRecord>): Partial<ContactUsRecord> {
    const payload: any = {};

    for (const field of this.data.category.fields) {
      const value = this.readValue(record, field.key, field.apiKey);
      const normalizedValue = this.normalizeFieldValue(field.key, value);
      const payloadKey = field.apiKey || field.key;

      payload[payloadKey] = normalizedValue;
    }

    return payload;
  }

  private normalizeFieldValue(key: string, value: any): any {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmedValue = value.trim();
    return key === 'phoneNumber'
      ? trimmedValue.replace(/\D/g, '')
      : trimmedValue;
  }

  private readValue(record: any, key: string, apiKey?: string): any {
    const candidates = [
      key,
      apiKey,
      this.toSnakeCase(key),
      this.toCamelCase(apiKey || key)
    ].filter((value): value is string => !!value);

    for (const candidate of candidates) {
      if (record?.[candidate] !== undefined && record?.[candidate] !== null) {
        return record[candidate];
      }
    }

    return '';
  }

  private toSnakeCase(value: string): string {
    return value.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  private toCamelCase(value: string): string {
    return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
  }
}
