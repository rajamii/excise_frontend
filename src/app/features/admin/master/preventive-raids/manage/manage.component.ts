import { Component, Inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { PreventiveRaid, PreventiveRaidImage } from '../../../../../core/models/preventive-raids.model';
import { PreventiveRaidsService } from '../../../../../core/services/preventive-raids.service';
import { environment } from '../../../../../../environments/environment';
import { validateUploadedFile } from '../../../../../shared/utils/file-upload-validation';

interface PreventiveRaidDialogData {
  record: PreventiveRaid | null;
}

@Component({
  selector: 'app-preventive-raid-manage',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent implements OnInit {
  @ViewChild('subjectArea') subjectArea!: ElementRef<HTMLTextAreaElement>;
  private readonly allowedImageExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  private readonly allowedImageMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly maxImageSizeBytes = 5 * 1024 * 1024;

  record: Partial<PreventiveRaid> = {
    title: '',
    subject: '',
    date: new Date().toISOString().substring(0, 10),
    images: []
  };
  isEditMode = false;
  selectedFiles: File[] = [];
  selectedFileNames: string[] = [];
  existingImages: PreventiveRaidImage[] = [];

  constructor(
    public dialogRef: MatDialogRef<ManageComponent>,
    private raidsService: PreventiveRaidsService,
    @Inject(MAT_DIALOG_DATA) public data: PreventiveRaidDialogData
  ) {}

  ngOnInit(): void {
    if (this.data.record) {
      this.isEditMode = true;
      this.record = { ...this.data.record };
      this.existingImages = this.data.record.images || [];
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const newFiles = Array.from(input.files);
      for (const file of newFiles) {
        const validationError = validateUploadedFile(file, {
          allowedExtensions: this.allowedImageExtensions,
          allowedMimeTypes: this.allowedImageMimeTypes,
          maxFileSizeBytes: this.maxImageSizeBytes,
          label: 'Preventive raid image'
        });
        if (validationError) {
          input.value = '';
          Swal.fire('Invalid File', validationError, 'error');
          return;
        }
      }

      this.selectedFiles = [...this.selectedFiles, ...newFiles];
      this.selectedFileNames = this.selectedFiles.map(file => file.name);
      input.value = ''; // Reset input to allow selecting same files again if deleted
    }
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.selectedFileNames = this.selectedFiles.map(file => file.name);
  }

  getImageUrl(imagePath: string): string {
    if (imagePath.startsWith('http') || imagePath.startsWith('assets/')) {
      return imagePath;
    }
    return `${environment.apiBaseUrl}${imagePath}`;
  }

  onSave(): void {
    if (!this.record.title || !this.record.subject || !this.record.date) {
      Swal.fire('Error', 'Please fill all required fields.', 'error');
      return;
    }

    if (!this.isEditMode && this.selectedFiles.length === 0) {
      Swal.fire('Error', 'Please select at least one image.', 'error');
      return;
    }

    Swal.fire({
      title: this.isEditMode ? 'Update Preventive Raid?' : 'Add Preventive Raid?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      const payload = {
        title: this.record.title!,
        subject: this.record.subject!,
        date: this.record.date!
      };

      const formData = this.raidsService.toFormData(payload, this.selectedFiles);
      const request = this.isEditMode
        ? this.raidsService.updatePreventiveRaid(this.record.id!, formData)
        : this.raidsService.createPreventiveRaid(formData);

      request.subscribe({
        next: () => {
          Swal.fire(
            'Success',
            this.isEditMode ? 'Preventive Raid updated!' : 'Preventive Raid added!',
            'success'
          );
          this.dialogRef.close(true);
        },
        error: () => Swal.fire('Error', 'Failed to save Preventive Raid record.', 'error')
      });
    });
  }

  wrapBold(): void {
    const el = this.subjectArea?.nativeElement;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end   = el.selectionEnd   ?? 0;
    const text  = this.record.subject || '';
    const selected = text.substring(start, end);
    const wrapped = `**${selected}**`;
    this.record.subject = text.substring(0, start) + wrapped + text.substring(end);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + 2, end + 2);
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
