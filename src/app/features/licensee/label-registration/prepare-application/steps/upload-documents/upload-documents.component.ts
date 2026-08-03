import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { LabelRegistrationUploadDetails } from '../../../../../../core/models/label-registration.model';
import { LabelRegistrationService } from '../../../../../../core/services/label-registration.service';
import { MaterialModule } from '../../../../../../shared/material.module';
import { validateUploadedFile } from '../../../../../../shared/utils/file-upload-validation';

type UploadDocumentRow = {
  key: string;
  name: string;
  description: string;
  accept: string;
  format: string;
  required: boolean;
  file: File | null;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
};

@Component({
  selector: 'app-label-registration-upload-documents',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './upload-documents.component.html',
  styleUrl: './upload-documents.component.scss'
})
export class LabelRegistrationUploadDocumentsComponent implements OnInit, OnDestroy {
  private readonly maxFileSizeBytes = 5 * 1024 * 1024;
  private readonly allowedFileExtensions = ['pdf'];
  private readonly allowedMimeTypes = ['application/pdf'];
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  readonly displayedColumns = ['serialNo', 'docType', 'upload', 'status', 'view'];
  private readonly storageKey = 'labelRegUploadDocuments';

  documents: UploadDocumentRow[] = [
    {
      key: 'renewed_licence_copy',
      name: 'Renewed Licence Copy',
      description: 'Attested copy of renewed license of the unit of respective state.',
      accept: '.pdf',
      format: 'PDF',
      required: false,
      file: null,
      fileUrl: '',
      fileName: '',
      mimeType: '',
      uploadedAt: ''
    },
    {
      key: 'registered_partnership_deed',
      name: 'Registered Partnership Deed',
      description: 'Attested copy of license registered partnership deed.',
      accept: '.pdf',
      format: 'PDF',
      required: false,
      file: null,
      fileUrl: '',
      fileName: '',
      mimeType: '',
      uploadedAt: ''
    },
    {
      key: 'article_of_association',
      name: 'Article of Association',
      description: 'Attested copy of article of association.',
      accept: '.pdf',
      format: 'PDF',
      required: false,
      file: null,
      fileUrl: '',
      fileName: '',
      mimeType: '',
      uploadedAt: ''
    },
    {
      key: 'memorandum_of_association',
      name: 'Memorandum of Association',
      description: 'Attested copy of memorandum of association.',
      accept: '.pdf',
      format: 'PDF',
      required: false,
      file: null,
      fileUrl: '',
      fileName: '',
      mimeType: '',
      uploadedAt: ''
    },
    {
      key: 'trade_mark_registration',
      name: 'Trade Mark Registration',
      description: 'Name of the brand, stating whether such brand is a registered trade mark and the number and date of trade mark registration.',
      accept: '.pdf',
      format: 'PDF',
      required: true,
      file: null,
      fileUrl: '',
      fileName: '',
      mimeType: '',
      uploadedAt: ''
    },
    {
      key: 'certificate_of_registration',
      name: 'Certificate of Registration',
      description: 'Copy of certificate of registration.',
      accept: '.pdf',
      format: 'PDF',
      required: true,
      file: null,
      fileUrl: '',
      fileName: '',
      mimeType: '',
      uploadedAt: ''
    },
    {
      key: 'cost_chart',
      name: 'Cost Chart',
      description: 'Copy of the cost chart of the product.',
      accept: '.pdf',
      format: 'PDF',
      required: true,
      file: null,
      fileUrl: '',
      fileName: '',
      mimeType: '',
      uploadedAt: ''
    },
    {
      key: 'undertaking',
      name: 'Undertaking',
      description: 'Undertaking to abide by the excise laws, rules, regulations, and orders of Sikkim Excise Act, 1992.',
      accept: '.pdf',
      format: 'PDF',
      required: false,
      file: null,
      fileUrl: '',
      fileName: '',
      mimeType: '',
      uploadedAt: ''
    },
    {
      key: 'product_photo',
      name: 'Product Photo',
      description: 'Photo of the product with label.',
      accept: '.pdf',
      format: 'PDF',
      required: true,
      file: null,
      fileUrl: '',
      fileName: '',
      mimeType: '',
      uploadedAt: ''
    }
  ];

  constructor(private labelRegistrationService: LabelRegistrationService) {}

  ngOnInit(): void {
    this.restoreDocumentState();
  }

  ngOnDestroy(): void {
    this.clearObjectUrls();
  }

  onFileSelect(event: Event, document: UploadDocumentRow): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;

    if (!file) {
      return;
    }

    const validationError = validateUploadedFile(file, {
      allowedExtensions: this.allowedFileExtensions,
      allowedMimeTypes: this.allowedMimeTypes,
      maxFileSizeBytes: this.maxFileSizeBytes,
      label: document.name
    });
    if (validationError) {
      if (input) {
        input.value = '';
      }
      return;
    }

    this.revokeObjectUrl(document);
    document.file = file;
    document.fileUrl = URL.createObjectURL(file);
    document.fileName = file.name;
    document.mimeType = file.type || '';
    document.uploadedAt = new Date().toISOString();

    this.labelRegistrationService.setDraftDocument(document.key, file);
    this.saveToSessionStorage();
  }

  viewFile(document: UploadDocumentRow): void {
    if (document.fileUrl) {
      window.open(document.fileUrl, '_blank', 'noopener,noreferrer');
    }
  }

  areDocumentsUploaded(): boolean {
    return this.documents.filter((document) => document.required).every((document) => !!document.fileName);
  }

  hasBinaryAttachment(document: UploadDocumentRow): boolean {
    return !!document.file;
  }

  getUploadedDocumentCount(): number {
    return this.documents.filter((document) => !!document.fileName).length;
  }

  goBack(): void {
    this.back.emit();
  }

  resetForm(): void {
    this.documents.forEach((document) => {
      this.revokeObjectUrl(document);
      document.file = null;
      document.fileName = '';
      document.mimeType = '';
      document.uploadedAt = '';
      this.labelRegistrationService.setDraftDocument(document.key, null);
    });
    sessionStorage.removeItem(this.storageKey);
  }

  proceedToNext(): void {
    if (this.areDocumentsUploaded()) {
      this.next.emit();
    }
  }

  private restoreDocumentState(): void {
    const stored = this.getStoredDetails();
    const storedMap = new Map(stored.documents.map((document) => [document.key, document]));

    this.documents.forEach((document) => {
      const draftFile = this.labelRegistrationService.getDraftDocument(document.key);
      const storedDocument = storedMap.get(document.key);

      if (draftFile) {
        document.file = draftFile;
        document.fileName = draftFile.name;
        document.mimeType = draftFile.type || storedDocument?.mimeType || '';
        document.uploadedAt = storedDocument?.uploadedAt || '';
        document.fileUrl = URL.createObjectURL(draftFile);
        return;
      }

      document.file = null;
      document.fileUrl = '';
      document.fileName = storedDocument?.fileName || '';
      document.mimeType = storedDocument?.mimeType || '';
      document.uploadedAt = storedDocument?.uploadedAt || '';
    });

    this.saveToSessionStorage();
  }

  private getStoredDetails(): LabelRegistrationUploadDetails {
    const raw = sessionStorage.getItem(this.storageKey);
    if (!raw) {
      return { documents: [] };
    }

    try {
      const parsed = JSON.parse(raw) as LabelRegistrationUploadDetails;
      return {
        documents: Array.isArray(parsed?.documents) ? parsed.documents : []
      };
    } catch (error) {
      console.error('Unable to parse label registration upload details:', error);
      return { documents: [] };
    }
  }

  private saveToSessionStorage(): void {
    const payload: LabelRegistrationUploadDetails = {
      documents: this.documents.map((document) => ({
        key: document.key,
        name: document.name,
        required: document.required,
        fileName: document.fileName,
        mimeType: document.mimeType,
        uploadedAt: document.uploadedAt
      }))
    };

    sessionStorage.setItem(this.storageKey, JSON.stringify(payload));
  }

  private clearObjectUrls(): void {
    this.documents.forEach((document) => this.revokeObjectUrl(document));
  }

  private revokeObjectUrl(document: UploadDocumentRow): void {
    if (document.fileUrl) {
      URL.revokeObjectURL(document.fileUrl);
      document.fileUrl = '';
    }
  }
}
