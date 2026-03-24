import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import Swal from 'sweetalert2';
import { LabelRegistrationDocuments } from '../../../../../../core/models/label-registration.model';
import { LabelRegistrationService } from '../../../../../../core/services/label-registration.service';
import { MaterialModule } from '../../../../../../shared/material.module';

interface UploadDocumentItem {
  key: keyof LabelRegistrationDocuments;
  name: string;
  required: boolean;
  acceptedFormats: string;
  maxSizeMb: number;
  file: File | null;
  fileUrl: string;
}

@Component({
  selector: 'app-label-registration-upload-documents',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './upload-documents.component.html',
  styleUrl: './upload-documents.component.scss'
})
export class LabelRegistrationUploadDocumentsComponent implements OnInit, OnDestroy {
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  documents: UploadDocumentItem[] = [
    {
      key: 'undertaking',
      name: 'Undertaking Letter',
      required: true,
      acceptedFormats: '.pdf,.jpg,.jpeg,.png',
      maxSizeMb: 5,
      file: null,
      fileUrl: ''
    },
    {
      key: 'brandAuthorization',
      name: 'Brand Owner Authorization',
      required: true,
      acceptedFormats: '.pdf,.jpg,.jpeg,.png',
      maxSizeMb: 5,
      file: null,
      fileUrl: ''
    },
    {
      key: 'labelArtworkFront',
      name: 'Front Label Artwork',
      required: true,
      acceptedFormats: '.pdf,.jpg,.jpeg,.png',
      maxSizeMb: 5,
      file: null,
      fileUrl: ''
    },
    {
      key: 'labelArtworkBack',
      name: 'Back Label Artwork',
      required: false,
      acceptedFormats: '.pdf,.jpg,.jpeg,.png',
      maxSizeMb: 5,
      file: null,
      fileUrl: ''
    },
    {
      key: 'labAnalysisReport',
      name: 'Laboratory Analysis Report',
      required: true,
      acceptedFormats: '.pdf',
      maxSizeMb: 5,
      file: null,
      fileUrl: ''
    },
    {
      key: 'trademarkCertificate',
      name: 'Trademark Certificate',
      required: false,
      acceptedFormats: '.pdf,.jpg,.jpeg,.png',
      maxSizeMb: 5,
      file: null,
      fileUrl: ''
    }
  ];

  constructor(private labelRegistrationService: LabelRegistrationService) {}

  ngOnInit(): void {
    this.loadSavedDocuments();
  }

  ngOnDestroy(): void {
    this.revokeAllUrls();
  }

  private loadSavedDocuments(): void {
    const savedDocs = this.labelRegistrationService.getLabelDocuments();
    this.documents.forEach((document) => {
      const savedFile = savedDocs[document.key];
      if (savedFile) {
        document.file = savedFile;
        document.fileUrl = URL.createObjectURL(savedFile);
      }
    });
    this.updateDocumentMeta();
  }

  onFileSelect(event: Event, document: UploadDocumentItem): void {
    const input = event.target as HTMLInputElement;
    const selectedFile = input.files?.[0];
    if (!selectedFile) {
      return;
    }

    const maxBytes = document.maxSizeMb * 1024 * 1024;
    if (selectedFile.size > maxBytes) {
      Swal.fire('File too large', `Maximum allowed size is ${document.maxSizeMb} MB.`, 'warning');
      input.value = '';
      return;
    }

    if (document.fileUrl) {
      URL.revokeObjectURL(document.fileUrl);
    }

    document.file = selectedFile;
    document.fileUrl = URL.createObjectURL(selectedFile);
    this.labelRegistrationService.setLabelDocuments({ [document.key]: selectedFile });
    this.updateDocumentMeta();
    input.value = '';
  }

  removeFile(document: UploadDocumentItem): void {
    if (document.fileUrl) {
      URL.revokeObjectURL(document.fileUrl);
    }
    document.file = null;
    document.fileUrl = '';
    this.labelRegistrationService.removeLabelDocument(document.key);
    this.updateDocumentMeta();
  }

  viewFile(document: UploadDocumentItem): void {
    if (document.fileUrl) {
      window.open(document.fileUrl, '_blank');
    }
  }

  getUploadedCount(): number {
    return this.documents.filter((document) => !!document.file).length;
  }

  areRequiredDocumentsUploaded(): boolean {
    return this.documents.every((document) => !document.required || !!document.file);
  }

  resetDocuments(): void {
    this.documents.forEach((document) => {
      if (document.fileUrl) {
        URL.revokeObjectURL(document.fileUrl);
      }
      document.file = null;
      document.fileUrl = '';
    });
    this.labelRegistrationService.clearLabelDocuments();
    this.updateDocumentMeta();
  }

  goBack(): void {
    this.back.emit();
  }

  proceedToNext(): void {
    if (!this.areRequiredDocumentsUploaded()) {
      Swal.fire('Missing documents', 'Please upload all mandatory documents to continue.', 'warning');
      return;
    }
    this.next.emit();
  }

  private revokeAllUrls(): void {
    this.documents.forEach((document) => {
      if (document.fileUrl) {
        URL.revokeObjectURL(document.fileUrl);
      }
    });
  }

  private updateDocumentMeta(): void {
    const meta = this.documents.map((document) => ({
      key: document.key,
      name: document.name,
      required: document.required,
      fileName: document.file?.name || ''
    }));
    sessionStorage.setItem('labelRegDocumentMeta', JSON.stringify(meta));
  }
}
