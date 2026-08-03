import { Component, EventEmitter, Output, OnInit, OnDestroy, signal, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../../../shared/material.module';
import { PatternConstants } from '../../../../../../../shared/constants/pattern.constants';
import { CompanyCollaborationService } from '../../../../../../../core/services/company-collaboration.service';
import { validateUploadedFile } from '../../../../../../../shared/utils/file-upload-validation';

export interface MemberEntry {
  memberName: string;
  memberDesignation: string;
  memberMobileNumber: string;
  memberEmailId: string;
  memberAddress: string;
}

@Component({
  selector: 'app-collab-member-details',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './collab-member-details.component.html',
  styleUrl: './collab-member-details.component.scss'
})
export class CollabMemberDetailsComponent implements OnInit, OnDestroy {
  private readonly maxFileSizeBytes = 5 * 1024 * 1024;
  private readonly allowedFileExtensions = ['pdf', 'png', 'jpg', 'jpeg'];
  private readonly allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg'];
  memberDetailsForm: FormGroup;
  members: MemberEntry[] = [];
  isFormOpen = true;
  editingIndex: number | null = null;

  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  // Document management variables
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

  errorMessages = {
    memberName:        signal(''),
    memberDesignation: signal(''),
    memberMobileNumber:signal(''),
    memberEmailId:     signal(''),
    memberAddress:     signal(''),
  };

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private collaborationService: CompanyCollaborationService
  ) {
    this.memberDetailsForm = this.fb.group({
      memberName:         new FormControl('', [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      memberDesignation:  new FormControl('', [Validators.required, Validators.maxLength(100)]),
      memberMobileNumber: new FormControl('', [Validators.required, Validators.pattern(PatternConstants.MOBILE)]),
      memberEmailId:      new FormControl('', [Validators.pattern(PatternConstants.EMAIL)]),
      memberAddress:      new FormControl('', [Validators.required, Validators.maxLength(500)]),
    });

    this.memberDetailsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateAllErrorMessages();
      });
  }

  ngOnInit() {
    this.loadMembersFromSession();
    if (this.members.length > 0) {
      this.isFormOpen = false;
    }
  }

  ngOnDestroy() {
    this.clearFileUrls();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Document upload logic
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

  private loadMembersFromSession(): void {
    try {
      const stored = sessionStorage.getItem('companyCollabMembersList');
      if (stored) {
        const all = JSON.parse(stored) as MemberEntry[];
        this.members = all.filter(
          m => m && typeof m.memberName === 'string' && m.memberName.trim() !== ''
        );
      }
    } catch {
      this.members = [];
    }
  }

  private saveMembersToSession(): void {
    sessionStorage.setItem('companyCollabMembersList', JSON.stringify(this.members));
  }

  saveMember(): void {
    if (this.memberDetailsForm.invalid) {
      this.memberDetailsForm.markAllAsTouched();
      this.updateAllErrorMessages();
      return;
    }

    const rawValue = this.memberDetailsForm.getRawValue();
    const entry: MemberEntry = {
      memberName:         rawValue.memberName,
      memberDesignation:  rawValue.memberDesignation,
      memberMobileNumber: rawValue.memberMobileNumber,
      memberEmailId:      rawValue.memberEmailId,
      memberAddress:      rawValue.memberAddress,
    };

    if (this.editingIndex !== null) {
      this.members[this.editingIndex] = entry;
    } else {
      this.members.push(entry);
    }

    this.saveMembersToSession();
    this.isFormOpen = false;
    this.editingIndex = null;
    this.cdr.detectChanges();
  }

  addAnotherMember(): void {
    this.editingIndex = null;
    this.memberDetailsForm.patchValue({
      memberName:         '',
      memberDesignation:  '',
      memberMobileNumber: '',
      memberEmailId:      '',
      memberAddress:      '',
    }, { emitEvent: false });
    this.memberDetailsForm.markAsUntouched();
    this.memberDetailsForm.markAsPristine();
    this.isFormOpen = true;
    this.cdr.detectChanges();
  }

  editMember(index: number): void {
    const m = this.members[index];
    this.editingIndex = index;

    this.memberDetailsForm.patchValue({
      memberName:         m.memberName,
      memberDesignation:  m.memberDesignation,
      memberMobileNumber: m.memberMobileNumber,
      memberEmailId:      m.memberEmailId,
      memberAddress:      m.memberAddress,
    }, { emitEvent: false });

    this.isFormOpen = true;
    this.cdr.detectChanges();
  }

  deleteMember(index: number): void {
    this.members.splice(index, 1);
    this.saveMembersToSession();

    if (this.editingIndex === index) {
      this.editingIndex = null;
      this.isFormOpen = this.members.length === 0;
    } else if (this.editingIndex !== null && this.editingIndex > index) {
      this.editingIndex--;
    }

    if (this.members.length === 0) {
      this.isFormOpen = true;
    }

    this.cdr.detectChanges();
  }

  cancelEdit(): void {
    this.editingIndex = null;
    this.isFormOpen = false;
    this.memberDetailsForm.markAsUntouched();
    this.cdr.detectChanges();
  }

  private updateErrorMessage(field: keyof typeof this.errorMessages) {
    const ctrl = this.memberDetailsForm.get(field);
    if      (ctrl?.hasError('required')) this.errorMessages[field].set('This field is required');
    else if (ctrl?.hasError('pattern'))  this.errorMessages[field].set('Invalid format');
    else if (ctrl?.hasError('email'))    this.errorMessages[field].set('Not a valid email');
    else                                  this.errorMessages[field].set('');
  }

  private updateAllErrorMessages() {
    Object.keys(this.errorMessages).forEach(f => this.updateErrorMessage(f as keyof typeof this.errorMessages));
  }

  getErrorMessage(field: keyof typeof this.errorMessages) { return this.errorMessages[field](); }

  proceedToNext() {
    if (this.members.length > 0 && this.areDocumentsUploaded()) {
      this.next.emit();
    } else {
      if (this.members.length === 0 && this.memberDetailsForm.valid) {
        this.saveMember();
        if (this.areDocumentsUploaded()) {
          this.next.emit();
          return;
        }
      }
      this.memberDetailsForm.markAllAsTouched();
      this.updateAllErrorMessages();
    }
  }

  resetForm() {
    this.memberDetailsForm.reset();
    this.members = [];
    this.editingIndex = null;
    this.isFormOpen = true;
    sessionStorage.removeItem('companyCollabMembersList');
    this.documents.forEach(doc => { doc.file = null; doc.fileUrl = ''; });
    this.collaborationService.clearCollabDocuments();
  }

  goBack() { this.back.emit(); }

  get formHeading(): string {
    if (this.editingIndex !== null) return `Edit Member ${this.editingIndex + 1}`;
    return this.members.length === 0 ? 'Add Member Details' : 'Add Another Member';
  }
}
