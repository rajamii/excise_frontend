import { Component, EventEmitter, Output, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { MaterialModule } from '../../../../../../../shared/material.module';
import { CompanyRegistrationService } from '../../../../../../../core/services/company-registration.service';
import { DmsDocumentService } from '../../../../../../../core/services/dms-document.service';
import { validateUploadedFile } from '../../../../../../../shared/utils/file-upload-validation';
import { environment } from '../../../../../../../../environments/environment';

@Component({
  selector: 'app-upload-documents',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './upload-documents.component.html',
  styleUrl: './upload-documents.component.scss'
})
export class UploadDocumentsComponent implements OnInit, OnDestroy {
  private readonly maxFileSizeBytes = 5 * 1024 * 1024;
  private readonly allowedFileExtensions = ['pdf', 'png', 'jpg', 'jpeg'];
  private readonly allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg'];

  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  displayedColumns: string[] = ['serialNo', 'docType', 'upload', 'view'];

  /** All 4 required documents for company registration */
  documents = [
    {
      key: 'exciseLicense',
      name: 'Excise License issued by the Excise Authority to company',
      format: '.pdf, .png, .jpg',
      accept: '.pdf,.png,.jpg',
      required: true,
      file: null as File | null,
      fileUrl: ''
    },
    {
      key: 'deedOfPartnership',
      name: 'Deed of Partnership, if any',
      format: '.pdf, .png, .jpg',
      accept: '.pdf,.png,.jpg',
      required: false,   // Optional
      file: null as File | null,
      fileUrl: ''
    },
    {
      key: 'memorandumOfAssociation',
      name: 'Memorandum of Association & Article of Association',
      format: '.pdf, .png, .jpg',
      accept: '.pdf,.png,.jpg',
      required: true,
      file: null as File | null,
      fileUrl: ''
    },
    {
      key: 'undertaking',
      name: 'An Undertaking stating that they shall abide by the condition of the Certificate or registration and the provision of Sikkim Excise Act 1992 and rules, regulations and orders made there-under.',
      format: '.pdf, .png, .jpg',
      accept: '.pdf,.png,.jpg',
      required: true,
      file: null as File | null,
      fileUrl: ''
    },
  ];

  constructor(
    private companyRegistrationService: CompanyRegistrationService,
    private dmsService: DmsDocumentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.restoreDocuments();
  }

  private restoreDocuments(): void {
    const savedDocs = this.companyRegistrationService.getCompanyDocuments();
    if (savedDocs) {
      this.documents.forEach(doc => {
        const f = (savedDocs as any)[doc.key];
        if (f) {
          doc.file = f;
          doc.fileUrl = URL.createObjectURL(f);
        }
      });
    }

    this.dmsService.getTemporaryDocuments('company_registration').subscribe({
      next: (res: any) => {
        if (res?.documents?.length) {
          const cleanBase = (environment.apiBaseUrl || '').replace(/\/+$/, '');
          const updatedDocs = { ...(this.companyRegistrationService.getCompanyDocuments() || {}) };

          res.documents.forEach((d: any) => {
            const rawField = String(d.documentField || d.document_field || '').trim();
            const field = rawField.toLowerCase();
            const doc = this.documents.find(
              (item) => item.key.toLowerCase() === field || 
                        (item.key.toLowerCase() === field.replace(/_/g, '')) ||
                        (item.key === 'exciseLicense' && (field === 'exciselicense' || field === 'excise_license')) ||
                        (item.key === 'deedOfPartnership' && (field === 'deedofpartnership' || field === 'deed_of_partnership')) ||
                        (item.key === 'memorandumOfAssociation' && (field === 'memorandumofassociation' || field === 'memorandum_of_association' || field === 'moa' || field === 'aoa')) ||
                        (item.key === 'undertaking' && field === 'undertaking')
            );

            if (doc && !doc.file) {
              const downloadPath = d.downloadUrl || d.download_url || '';
              doc.fileUrl = downloadPath.startsWith('http') ? downloadPath : `${cleanBase}${downloadPath}`;
              const filename = d.originalFilename || d.original_filename || `${doc.key}.pdf`;
              const mime = d.mimeType || d.mime_type || 'application/pdf';
              doc.file = new File([""], filename, { type: mime });
              (updatedDocs as any)[doc.key] = doc.file;
            }
          });

          this.companyRegistrationService.setCompanyDocuments(updatedDocs);
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.warn('Could not restore company temporary documents:', err);
      }
    });
  }

  ngOnDestroy() {
    this.clearFileUrls();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Handle file selection and update the service */
  onFileSelect(event: any, document: any) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file) {
      const validationError = validateUploadedFile(file, {
        allowedExtensions: this.allowedFileExtensions,
        allowedMimeTypes: this.allowedMimeTypes,
        maxFileSizeBytes: this.maxFileSizeBytes,
        label: document.name || 'Document'
      });

      if (validationError) {
        input.value = '';
        return;
      }

      document.file = file;
      document.fileUrl = URL.createObjectURL(file);
      this.companyRegistrationService.setCompanyDocuments({ [document.key]: file });

      // Save to dms_temperary_uploads in pgAdmin and MongoDB GridFS
      this.dmsService.uploadTemporaryDocument(file, 'company_registration', document.key).subscribe({
        next: (res) => console.log(`[DMS TEMP] Uploaded company doc ${document.key}:`, res),
        error: (err) => console.warn(`[DMS TEMP] Failed company doc upload:`, err)
      });
    }
  }

  /** Open selected file in a new tab */
  viewFile(document: any) {
    if (document.fileUrl) {
      window.open(document.fileUrl, '_blank');
    }
  }

  /** Returns true when all mandatory documents have a file attached */
  areDocumentsUploaded(): boolean {
    return this.documents.every(doc => !doc.required || !!doc.file);
  }

  clearFileUrls() {
    this.documents.forEach(doc => {
      if (doc.fileUrl) {
        URL.revokeObjectURL(doc.fileUrl);
        doc.fileUrl = '';
      }
    });
  }

  goBack()  { this.back.emit(); }

  resetForm() {
    this.documents.forEach(doc => { doc.file = null; doc.fileUrl = ''; });
  }

  /** Only proceed when all required documents are uploaded */
  proceedToNext() {
    if (this.areDocumentsUploaded()) {
      this.next.emit();
    }
  }
}
