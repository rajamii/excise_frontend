import { Component, EventEmitter, Output, OnInit, OnDestroy, signal, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { MaterialModule } from '../../../../../../../shared/material.module';
import { PatternConstants } from '../../../../../../../shared/constants/pattern.constants';
import { AccountService } from '../../../../../../../core/services/account.service';
import { MasterService } from '../../../../../../../core/services/master.service';

export interface MemberEntry {
  memberName: string;
  memberDesignation: string;
  memberMobileNumber: string;
  memberEmailId: string;
  memberAddress: string;
  fatherName?: string;
  dob?: string;
  gender?: string;
  nationality?: string;
}

@Component({
  selector: 'app-member-details',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './member-details.component.html',
  styleUrl: './member-details.component.scss'
})
export class MemberDetailsComponent implements OnInit, OnDestroy {

  memberDetailsForm: FormGroup;

  /** Saved member entries */
  members: MemberEntry[] = [];

  /** Whether the input form is visible */
  isFormOpen = true;

  /** Index of the member being edited (-1 = new member) */
  editingIndex: number | null = null;

  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  // ✅ Track whether we found a licensee profile
  hasLicenseeProfile = false;

  errorMessages = {
    memberName:        signal(''),
    memberDesignation: signal(''),
    memberMobileNumber:signal(''),
    memberEmailId:     signal(''),
    memberAddress:     signal(''),
    fatherName:        signal(''),
    dob:               signal(''),
    gender:            signal(''),
    nationality:       signal(''),
  };

  constructor(
    private fb:             FormBuilder,
    private accountService: AccountService,
    private masterService:  MasterService,
    private cdr:            ChangeDetectorRef
  ) {
    this.memberDetailsForm = this.fb.group({
      // ── Editable fields ──────────────────────────────────────────
      memberName:         new FormControl('', [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      memberDesignation:  new FormControl('', [Validators.required, Validators.maxLength(100)]),
      memberMobileNumber: new FormControl('', [Validators.required, Validators.pattern(PatternConstants.MOBILE)]),
      memberEmailId:      new FormControl('', [Validators.pattern(PatternConstants.EMAIL)]),
      memberAddress:      new FormControl('', [Validators.required, Validators.maxLength(500)]),

      // ── Licensee profile fields (pre-filled, disabled) ───────────
      fatherName:         new FormControl({ value: '', disabled: true }),
      dob:                new FormControl({ value: '', disabled: true }),
      gender:             new FormControl({ value: '', disabled: true }),
      nationality:        new FormControl({ value: '', disabled: true }),
    });

    this.memberDetailsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateAllErrorMessages();
      });
  }

  ngOnInit() {
    // Load existing members from session storage
    this.loadMembersFromSession();

    // If we already have members, close the form
    if (this.members.length > 0) {
      this.isFormOpen = false;
    }

    setTimeout(() => {
      this.autoFillFromProfiles();
    }, 100);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─────────────────────────────────────────────────────────────────
  // Load / Save members to session storage
  // ─────────────────────────────────────────────────────────────────
  private loadMembersFromSession(): void {
    try {
      const stored = sessionStorage.getItem('companyMembersList');
      if (stored) {
        const all = JSON.parse(stored) as MemberEntry[];
        // Filter out any ghost / empty entries from previous sessions
        this.members = all.filter(
          m => m && typeof m.memberName === 'string' && m.memberName.trim() !== ''
        );
        // Re-save cleaned list so stale entries don't persist
        if (this.members.length !== all.length) {
          this.saveMembersToSession();
        }
      }
    } catch {
      this.members = [];
    }
  }

  private saveMembersToSession(): void {
    sessionStorage.setItem('companyMembersList', JSON.stringify(this.members));

    // Persist first member as the flat 'memberDetails' for backend compatibility
    if (this.members.length > 0) {
      sessionStorage.setItem('memberDetails', JSON.stringify(this.members[0]));
    } else {
      sessionStorage.removeItem('memberDetails');
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Save the current form as a member entry
  // ─────────────────────────────────────────────────────────────────
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
      fatherName:         rawValue.fatherName,
      dob:                rawValue.dob,
      gender:             rawValue.gender,
      nationality:        rawValue.nationality,
    };

    if (this.editingIndex !== null) {
      // Update existing member
      this.members[this.editingIndex] = entry;
    } else {
      // Add new member
      this.members.push(entry);
    }

    this.saveMembersToSession();
    this.isFormOpen = false;
    this.editingIndex = null;
    this.cdr.detectChanges();
  }

  // ─────────────────────────────────────────────────────────────────
  // Add another member – open a blank form
  // ─────────────────────────────────────────────────────────────────
  addAnotherMember(): void {
    this.editingIndex = null;

    // Reset only the editable fields
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

  // ─────────────────────────────────────────────────────────────────
  // Edit an existing member
  // ─────────────────────────────────────────────────────────────────
  editMember(index: number): void {
    const m = this.members[index];
    this.editingIndex = index;

    const disabledFields = ['fatherName', 'dob', 'gender', 'nationality'];
    disabledFields.forEach(f => this.memberDetailsForm.get(f)?.enable({ emitEvent: false }));

    this.memberDetailsForm.patchValue({
      memberName:         m.memberName,
      memberDesignation:  m.memberDesignation,
      memberMobileNumber: m.memberMobileNumber,
      memberEmailId:      m.memberEmailId,
      memberAddress:      m.memberAddress,
      fatherName:         m.fatherName || '',
      dob:                m.dob || '',
      gender:             m.gender || '',
      nationality:        m.nationality || '',
    }, { emitEvent: false });

    disabledFields.forEach(f => this.memberDetailsForm.get(f)?.disable({ emitEvent: false }));

    this.isFormOpen = true;
    this.cdr.detectChanges();
  }

  // ─────────────────────────────────────────────────────────────────
  // Delete a saved member
  // ─────────────────────────────────────────────────────────────────
  deleteMember(index: number): void {
    this.members.splice(index, 1);
    this.saveMembersToSession();

    // If deleted the one being edited, close the form
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

  // ─────────────────────────────────────────────────────────────────
  // Cancel editing (go back to list view without saving)
  // ─────────────────────────────────────────────────────────────────
  cancelEdit(): void {
    this.editingIndex = null;
    this.isFormOpen = false;
    this.memberDetailsForm.markAsUntouched();
    this.cdr.detectChanges();
  }

  // ─────────────────────────────────────────────────────────────────
  // Auto-fill from profiles
  // ─────────────────────────────────────────────────────────────────
  private autoFillFromProfiles(): void {
    // Only auto-fill if no members exist yet (first-time open)
    if (this.members.length > 0) return;

    forkJoin({
      userProfile:     this.fetchUserProfile(),
      licenseeProfile: this.masterService.getMyLicenseeProfile().pipe(catchError(() => of(null)))
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ({ userProfile, licenseeProfile }) => {
        this.fillForm(userProfile, licenseeProfile);
      },
      error: (err) => console.error('❌ Member auto-fill error:', err)
    });
  }

  private fetchUserProfile() {
    let cached = this.accountService.getUserProfileSync();
    if (!cached) {
      try {
        const stored = localStorage.getItem('currentUser');
        if (stored) cached = JSON.parse(stored);
      } catch { /* ignore */ }
    }
    return cached
      ? of(cached)
      : this.accountService.identity(true).pipe(catchError(() => of(null)));
  }

  private fillForm(user: any, licensee: any): void {
    const fillData: any = {};

    if (user) {
      const parts = [
        user.firstName  || user.first_name  || '',
        user.middleName || user.middle_name || '',
        user.lastName   || user.last_name   || '',
      ].filter(Boolean);
      if (parts.length) fillData.memberName = parts.join(' ');
      if (user.phoneNumber || user.phone_number) fillData.memberMobileNumber = user.phoneNumber || user.phone_number;
      if (user.email) fillData.memberEmailId = user.email;
      if (user.address) fillData.memberAddress = user.address;
      fillData.memberDesignation = 'Director';
    }

    if (licensee) {
      this.hasLicenseeProfile = true;
      const disabledFields = ['fatherName', 'dob', 'gender', 'nationality'];
      disabledFields.forEach(f => this.memberDetailsForm.get(f)?.enable({ emitEvent: false }));

      if (licensee.fatherName)   fillData.fatherName  = licensee.fatherName;
      if (licensee.dob)          fillData.dob         = licensee.dob;
      if (licensee.genderDisplay)fillData.gender      = licensee.genderDisplay;
      if (licensee.nationality)  fillData.nationality = licensee.nationality;

      this.memberDetailsForm.patchValue(fillData, { emitEvent: false });
      disabledFields.forEach(f => this.memberDetailsForm.get(f)?.disable({ emitEvent: false }));
    } else {
      this.hasLicenseeProfile = false;
      this.memberDetailsForm.patchValue(fillData, { emitEvent: false });
    }

    this.cdr.detectChanges();
  }

  // ─────────────────────────────────────────────────────────────────
  // Validation helpers
  // ─────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────────────────────────────
  proceedToNext() {
    if (this.members.length > 0) {
      this.next.emit();
    } else if (this.memberDetailsForm.valid) {
      // Auto-save the open form before proceeding
      this.saveMember();
      this.next.emit();
    } else {
      this.memberDetailsForm.markAllAsTouched();
      this.updateAllErrorMessages();
    }
  }

  resetForm() {
    this.memberDetailsForm.reset();
    this.members = [];
    this.editingIndex = null;
    this.isFormOpen = true;
    sessionStorage.removeItem('memberDetails');
    sessionStorage.removeItem('companyMembersList');
  }

  goBack() { this.back.emit(); }

  // Helper: label for the form heading
  get formHeading(): string {
    if (this.editingIndex !== null) return `Edit Member ${this.editingIndex + 1}`;
    return this.members.length === 0 ? 'Add Member Details' : 'Add Another Member';
  }
}