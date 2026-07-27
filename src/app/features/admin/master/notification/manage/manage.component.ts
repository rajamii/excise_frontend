import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { Notification } from '../../../../../core/models/notification.model';
import { AdminService } from '../../../admin.service';

@Component({
  selector: 'app-manage-notification',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent implements OnInit {
  private readonly maxFileSizeBytes = 2 * 1024 * 1024;
  private readonly allowedFileExtensions = ['jpeg', 'jpg', 'pdf'];
  private readonly allowedMimeTypes = ['image/jpeg', 'application/pdf'];

  notification: Notification = {
    subject: '',
    category: 'circular',
    notificationDate: '',
    notificationFile: null,
    notificationFileUrl: null,
    isActive: true
  };

  isEditMode = false;
  selectedFile: File | null = null;
  selectedDate: Date | null = null;
  fileError = '';

  notificationCategories: { value: 'act' | 'rule' | 'circular', label: string }[] = [
    { value: 'act', label: 'Act' },
    { value: 'rule', label: 'Rule' },
    { value: 'circular', label: 'Circular' }
  ];

  constructor(
    private adminService: AdminService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Notification | null
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.notification = { ...this.data };
      this.selectedDate = this.parseNotificationDate(this.notification.notificationDate);
      this.isEditMode = true;
    }
  }

  onDateSelected(value: Date | null): void {
    this.selectedDate = value;
    this.notification.notificationDate = value ? this.formatDateForApi(value) : '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile = null;
    this.fileError = '';

    if (!file) return;

    const validationError = this.validateFile(file);
    if (validationError) {
      this.fileError = validationError;
      input.value = '';
      Swal.fire('Invalid File', validationError, 'error');
      return;
    }

    this.selectedFile = file;
  }

  onSave(): void {
    if (this.fileError) {
      Swal.fire('Invalid File', this.fileError, 'error');
      return;
    }

    Swal.fire({
      title: this.isEditMode ? 'Update Notification?' : 'Add Notification?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      const payload = this.buildPayload();
      const request = this.isEditMode
        ? this.adminService.updateNotification(this.notification.id!, payload)
        : this.adminService.addNotification(payload);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Notification updated!' : 'Notification added!', 'success');
          this.dialogRef.close(true);
        },
        error: (error: unknown) => Swal.fire('Error', this.getErrorMessage(error), 'error')
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private validateFile(file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

    if (!this.allowedFileExtensions.includes(extension)) {
      return 'Only JPEG, JPG, or PDF files are allowed.';
    }

    if (file.type && !this.allowedMimeTypes.includes(file.type)) {
      return 'Only JPEG, JPG, or PDF files are allowed.';
    }

    if (file.size > this.maxFileSizeBytes) {
      return 'File size must be less than 2 MB.';
    }

    return '';
  }

  private buildPayload(): FormData {
    const formData = new FormData();
    formData.append('subject', this.notification.subject);
    formData.append('category', this.notification.category);
    formData.append('notification_date', this.notification.notificationDate);
    formData.append('is_active', String(this.notification.isActive));

    if (this.selectedFile) {
      formData.append('notification_file', this.selectedFile);
    }

    return formData;
  }

  private parseNotificationDate(value: string): Date | null {
    if (!value) return null;
    const parts = value.split('-').map(Number);
    if (parts.length === 3 && parts.every((part) => Number.isFinite(part))) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  private formatDateForApi(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getErrorMessage(error: unknown): string {
    const detail = (error as { error?: unknown })?.error;
    if (!detail) return 'Failed to save notification.';
    if (typeof detail === 'string') return detail;
    const detailObject = detail as { detail?: string };
    if (detailObject.detail) return detailObject.detail;

    const messages = Object.entries(detail)
      .map(([field, value]) => {
        const text = Array.isArray(value) ? value.join(', ') : String(value);
        return `${field}: ${text}`;
      })
      .join('\n');

    return messages || 'Failed to save notification.';
  }
}
