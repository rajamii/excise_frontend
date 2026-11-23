import { Component, EventEmitter, Output, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { MaterialModule } from '../../../../../../../shared/material.module';
import { CompanyCollaborationService } from '../../../../../../../core/services/company-collaboration.service';
import { DmsDocumentService } from '../../../../../../../core/services/dms-document.service';
import { environment } from '../../../../../../../../environments/environment';

@Component({
  selector: 'app-collab-upload-documents',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './collab-upload-documents.component.html',
  styleUrl: './collab-upload-documents.component.scss'
})
export class CollabUploadDocumentsComponent implements OnInit, OnDestroy {

  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  displayedColumns: string[] = ['serialNo', 'docType', 'upload', 'view'];

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
      required: false,
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
    private collaborationService: CompanyCollaborationService,
    private dmsService: DmsDocumentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.restoreDocuments();
  }

  private restoreDocuments(): void {
    const savedDocs = this.collaborationService.getCollabDocuments();
    if (savedDocs) {
      this.documents.forEach(doc => {
        const f = (savedDocs as any)[doc.key];
        if (f) {
          doc.file = f;
          doc.fileUrl = URL.createObjectURL(f);
        }
      });
    }

    this.dmsService.getTemporaryDocuments('company_collaboration').subscribe({
      next: (res: any) => {
        if (res?.documents?.length) {
          const cleanBase = (environment.apiBaseUrl || '').replace(/\/+$/, '');
          const updatedDocs = { ...(this.collaborationService.getCollabDocuments() || {}) };

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

          this.collaborationService.setCollabDocuments(updatedDocs);
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.warn('Could not restore collab temporary documents:', err);
      }
    });
  }

  ngOnDestroy() {
    this.clearFileUrls();
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFileSelect(event: any, document: any) {
    const file = event.target.files[0];
    if (file) {
      document.file = file;
      document.fileUrl = URL.createObjectURL(file);
      this.collaborationService.setCollabDocuments({ [document.key]: file });

      // Save to dms_temperary_uploads in pgAdmin and MongoDB GridFS
      this.dmsService.uploadTemporaryDocument(file, 'company_collaboration', document.key).subscribe({
        next: (res) => console.log(`[DMS TEMP] Uploaded collab doc ${document.key}:`, res),
        error: (err) => console.warn(`[DMS TEMP] Failed collab doc upload:`, err)
      });
    }
  }

  viewFile(document: any) {
    if (document.fileUrl) {
      window.open(document.fileUrl, '_blank');
    }
  }

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
    this.collaborationService.clearCollabDocuments();
  }

  proceedToNext() {
    if (this.areDocumentsUploaded()) {
      this.next.emit();
    }
  }
}
