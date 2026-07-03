import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import {
  ExciseSecretary,
  HeadOfOrganisation,
  AboutUs
} from '../../../../../core/models/about-us.model';

type AboutUsRecord =
  | HeadOfOrganisation
  | ExciseSecretary
  | AboutUs;

interface AboutUsFieldConfig {
  key: string;
  apiKey?: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'email' | 'file' | 'textarea' | 'date';
}

interface AboutUsCategoryConfig {
  label: string;
  singularLabel: string;
  fields: AboutUsFieldConfig[];
  create: (data: Partial<AboutUsRecord>) => import('rxjs').Observable<AboutUsRecord>;
  update: (id: number, data: Partial<AboutUsRecord>) => import('rxjs').Observable<AboutUsRecord>;
}

interface AboutUsDialogData {
  category: AboutUsCategoryConfig;
  record: AboutUsRecord | null;
}

@Component({
  selector: 'app-about-us-manage',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent implements OnInit {
  record: Partial<AboutUsRecord> = {};
  isEditMode = false;
  selectedFileNames: Record<string, string> = {};

  constructor(
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AboutUsDialogData
  ) {}

  ngOnInit(): void {
    this.record = this.data.record ? this.toFormRecord(this.data.record) : {};
    this.isEditMode = !!this.data.record;
  }

  onSave(): void {
    const missingFile = this.data.category.fields.some(field =>
      field.type === 'file' &&
      this.isFieldRequired(field) &&
      !(this.readValue(this.record, field.key, field.apiKey) instanceof File)
    );

    if (missingFile) {
      Swal.fire('Error', 'Please upload an image.', 'error');
      return;
    }

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

      const payload = this.toApiPayload(this.record);
      const request = this.isEditMode
        ? this.data.category.update(Number(this.record.id), payload)
        : this.data.category.create(payload);

      request.subscribe({
        next: () => {
          Swal.fire(
            'Success',
            this.isEditMode ? 'About Us record updated!' : 'About Us record added!',
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

  makeBold(key: string): void {
    const textarea = document.getElementById('textarea-' + key) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value || '';
    const selectedText = text.substring(start, end);
    const replacement = `**${selectedText || 'bold text'}**`;

    // Update the record content
    const updatedValue = text.substring(0, start) + replacement + text.substring(end);
    (this.record as any)[key] = updatedValue;

    // Reset cursor position after change
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + 2 + (selectedText ? selectedText.length : 9);
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }

  onFileSelected(event: Event, field: AboutUsFieldConfig): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    (this.record as any)[field.key] = file;
    this.selectedFileNames[field.key] = file.name;
  }

  getFileDisplayValue(field: AboutUsFieldConfig): string {
    const selectedFileName = this.selectedFileNames[field.key];
    if (selectedFileName) {
      return selectedFileName;
    }

    const value = this.readValue(this.record, field.key, field.apiKey);
    if (value instanceof File) {
      return value.name;
    }

    return typeof value === 'string' ? value.split('/').pop() || value : '';
  }

  isFieldRequired(field: AboutUsFieldConfig): boolean {
    return !!field.required && !(field.type === 'file' && this.isEditMode);
  }

  private formatApiError(error: any): string {
    const detail = error?.error;

    if (!detail) {
      return 'Failed to save About Us record.';
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

    return messages.length ? messages.join('<br>') : 'Failed to save About Us record.';
  }

  private getFieldLabel(key: string): string {
    const normalizedKey = key.replace(/_/g, '').toLowerCase();
    const field = this.data.category.fields.find(item =>
      item.key.replace(/_/g, '').toLowerCase() === normalizedKey ||
      (item.apiKey || '').replace(/_/g, '').toLowerCase() === normalizedKey
    );

    return field?.label || key;
  }

  private toFormRecord(record: AboutUsRecord): Partial<AboutUsRecord> {
    const formRecord: any = { ...record };

    for (const field of this.data.category.fields) {
      const apiKey = field.apiKey || field.key;
      formRecord[field.key] = this.readValue(record, field.key, apiKey);
    }

    return formRecord;
  }

  private toApiPayload(record: Partial<AboutUsRecord>): Partial<AboutUsRecord> {
    const payload: any = {};

    for (const field of this.data.category.fields) {
      const value = this.readValue(record, field.key, field.apiKey);
      if (field.type === 'file' && this.isEditMode && typeof value === 'string') {
        continue;
      }
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

    const trimmed = value.trim();

    // Return null for empty date fields so backend accepts blank nullable dates
    if (trimmed === '') {
      return null;
    }

    return trimmed;
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
