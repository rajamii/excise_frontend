import { Component, EventEmitter, Output, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { MaterialModule } from '../../../../../../../shared/material.module';
import { CompanyCollaborationService } from '../../../../../../../core/services/company-collaboration.service';

@Component({
  selector: 'app-collab-upload-documents',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './collab-upload-documents.component.html',
  styleUrl: './collab-upload-documents.component.scss'
})
export class CollabUploadDocumentsComponent implements OnDestroy {

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

  constructor(private collaborationService: CompanyCollaborationService) {}

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
