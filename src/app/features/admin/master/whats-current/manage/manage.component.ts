import { Component, Inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { WhatsCurrent } from '../../../../../core/models/whats-current.model';
import { WhatsCurrentService } from '../../../../../core/services/whats-current.service';
import { validateUploadedFile } from '../../../../../shared/utils/file-upload-validation';

interface ManageDialogData {
  record: WhatsCurrent | null;
}

@Component({
  selector: 'app-whats-current-manage',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent implements OnInit {
  private readonly allowedFileExtensions = ['pdf'];
  private readonly allowedMimeTypes = ['application/pdf'];
  private readonly maxFileSizeBytes = 2 * 1024 * 1024;

  @ViewChild('messageArea') messageArea!: ElementRef<HTMLTextAreaElement>;

  record: Partial<WhatsCurrent> = {
    category: 'circular',
    date: new Date().toISOString().substring(0, 10),
    title: '',
    message: '',
    isActive: true
  };
  isEditMode = false;
  selectedFile: File | null = null;
  selectedFileName = '';

  constructor(
    public dialogRef: MatDialogRef<ManageComponent>,
    private whatsCurrentService: WhatsCurrentService,
    @Inject(MAT_DIALOG_DATA) public data: ManageDialogData
  ) {}

  ngOnInit(): void {
    if (this.data.record) {
      this.isEditMode = true;
      this.record = {
        ...this.data.record,
        isActive: this.data.record.isActive !== undefined ? this.data.record.isActive : (this.data.record as any).is_active
      };
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const validationError = validateUploadedFile(file, {
      allowedExtensions: this.allowedFileExtensions,
      allowedMimeTypes: this.allowedMimeTypes,
      maxFileSizeBytes: this.maxFileSizeBytes,
      label: 'Whats Current file'
    });

    if (validationError) {
      input.value = '';
      Swal.fire('Invalid File', validationError, 'error');
      return;
    }

    this.selectedFile = file;
    this.selectedFileName = file.name;
  }

  getFileDisplay(): string {
    if (this.selectedFileName) return this.selectedFileName;
    if (this.record.file && typeof this.record.file === 'string') {
      return this.record.file.split('/').pop() || this.record.file;
    }
    return '';
  }

  onSave(): void {
    if (!this.record.category) {
      Swal.fire('Validation Error', 'Category is required.', 'warning');
      return;
    }
    if (!this.record.date) {
      Swal.fire('Validation Error', 'Date is required.', 'warning');
      return;
    }
    if (!this.record.title || !this.record.title.trim()) {
      Swal.fire('Validation Error', 'Title / Subject is required.', 'warning');
      return;
    }

    const titleConfirm = this.isEditMode ? 'Update Record?' : 'Add Record?';
    Swal.fire({
      title: titleConfirm,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      const payload: Record<string, any> = {
        category: this.record.category,
        date: this.record.date,
        title: this.record.title,
        message: this.record.message || '',
        isActive: this.record.isActive !== undefined ? this.record.isActive : true
      };

      if (this.selectedFile) {
        payload['file'] = this.selectedFile;
      }

      const formData = this.whatsCurrentService.toFormData(payload);
      
      const request = this.isEditMode && this.record.id
        ? this.whatsCurrentService.updateWhatsCurrent(this.record.id, formData)
        : this.whatsCurrentService.createWhatsCurrent(formData);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Record updated!' : 'Record added!', 'success');
          this.dialogRef.close(true);
        },
        error: (err) => {
          const errMsg = err?.error?.detail || err?.error || 'Failed to save record.';
          Swal.fire('Error', typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg), 'error');
        }
      });
    });
  }

  wrapBold(): void {
    const el = this.messageArea?.nativeElement;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end   = el.selectionEnd   ?? 0;
    const text  = this.record.message || '';
    const selected = text.substring(start, end);
    const wrapped = `**${selected}**`;
    this.record.message = text.substring(0, start) + wrapped + text.substring(end);
    // Restore cursor inside the bold markers
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + 2, end + 2);
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
