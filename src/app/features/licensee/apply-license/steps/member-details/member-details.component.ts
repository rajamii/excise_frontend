import { Component, EventEmitter, Output, OnInit, OnDestroy, signal, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../shared/material.module';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { FormUtils } from '../../../../../shared/utils/capitalize.util';
import { LicenseApplication } from '../../../../../core/models/license-application.model';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { AccountService } from '../../../../../core/services/account.service';

@Component({
  selector: 'app-member-details',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './member-details.component.html',
  styleUrl: './member-details.component.scss',
})
export class MemberDetailsComponent implements OnInit, OnDestroy {
  memberDetailsForm: FormGroup;

  passPhoto = {
    file: null as File | null,
    fileUrl: ''
  };

  statuses: string[] = ['Single', 'Married', 'Divorced'];
  nationalities: string[] = ['Indian', 'Foreign'];
  
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();
  
  private destroy$ = new Subject<void>();
  
  errorMessages = {
    status: signal(''),
    member_name: signal(''),
    father_husband_name: signal(''),
    nationality: signal(''),
    gender: signal(''),
    pan: signal(''),
    member_mobile_number: signal(''),
    member_email: signal(''),
    photo: signal('')
  };

  constructor(
    private fb: FormBuilder, 
    private licenseApplicationService: LicenseApplicationService,
    private accountService: AccountService,
    private cdr: ChangeDetectorRef
  ){
    const storedValues = this.getFromSessionStorage();

    this.memberDetailsForm = this.fb.group({
      status: new FormControl(storedValues.status, [Validators.required]),
      member_name: new FormControl(storedValues.member_name, [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      father_husband_name: new FormControl(storedValues.father_husband_name, [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      nationality: new FormControl(storedValues.nationality, [Validators.required]),
      gender: new FormControl(storedValues.gender, [Validators.required]),
      pan: new FormControl(storedValues.pan, [Validators.required, Validators.pattern(PatternConstants.PAN)]),
      member_mobile_number: new FormControl(storedValues.member_mobile_number, [Validators.required, Validators.pattern(PatternConstants.MOBILE)]),
      member_email: new FormControl(storedValues.member_email, [Validators.required, Validators.pattern(PatternConstants.EMAIL)]),
    });

    this.memberDetailsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.saveToSessionStorage();
        this.updateAllErrorMessages();
      });
  }

  ngOnInit() {
    FormUtils.capitalize(this.memberDetailsForm.get('pan')!, this.destroy$);

    // Load stored photo
    const storedPhoto = this.licenseApplicationService.getPassPhoto();
    if (storedPhoto) {
      this.passPhoto.file = storedPhoto;
      this.passPhoto.fileUrl = URL.createObjectURL(storedPhoto);
    }

    // ✅ AUTO-FILL from user profile
    this.autoFillFromUserProfile();
  }

  ngOnDestroy() {
    this.clearPhotoUrl();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * ✅ Auto-fill member details from logged-in user profile
   */
  private autoFillFromUserProfile(): void {
    const sessionData = sessionStorage.getItem('memberDetailsData');
    if (sessionData) {
      console.log('📋 Member details already in session, skipping auto-fill');
      return;
    }

    const userProfile = this.accountService.getUserProfileSync();
    
    if (!userProfile) {
      console.log('⚠️ No user profile in memory, fetching from backend...');
      this.accountService.identity(true).subscribe({
        next: (profile) => {
          if (profile) {
            this.fillFormWithProfile(profile);
          }
        },
        error: (err) => {
          console.error('❌ Failed to fetch user profile:', err);
        }
      });
    } else {
      console.log('✅ User profile found in memory, auto-filling...');
      this.fillFormWithProfile(userProfile);
    }
  }

  /**
   * Fill form with user profile data
   */
  private fillFormWithProfile(profile: any): void {
    console.log('🔍 Auto-filling member details with profile:', profile);
    
    // Construct full name
    const fullName = [
      profile.firstName || profile.first_name,
      profile.middleName || profile.middle_name,
      profile.lastName || profile.last_name
    ].filter(Boolean).join(' ').trim();
    
    this.memberDetailsForm.patchValue({
      member_name: fullName,
      member_mobile_number: profile.phoneNumber || profile.phone_number,
      member_email: profile.email,
      nationality: 'Indian' // Default value
    }, { emitEvent: true });

    console.log('✅ Member details auto-filled from user profile');
  }

  private getFromSessionStorage(): Partial<LicenseApplication> {
    const storedData = sessionStorage.getItem('memberDetailsData');
    return storedData ? JSON.parse(storedData) as LicenseApplication : {};
  }

  private saveToSessionStorage() {
    const formData: Partial<LicenseApplication> = this.memberDetailsForm.getRawValue();

    const enrichedData: any = {
      status: formData.status,
      member_name: formData.member_name,
      father_husband_name: formData.father_husband_name,
      nationality: formData.nationality,
      gender: formData.gender,
      pan: formData.pan,
      member_mobile_number: formData.member_mobile_number ? parseInt(String(formData.member_mobile_number)) : null,
      member_email: formData.member_email
    };

    if (enrichedData.member_mobile_number && isNaN(enrichedData.member_mobile_number)) {
      console.error('❌ Invalid member_mobile_number:', formData.member_mobile_number);
      enrichedData.member_mobile_number = null;
    }

    console.log('💾 Saving member details to sessionStorage:', enrichedData);
    sessionStorage.setItem('memberDetailsData', JSON.stringify(enrichedData));
  }

  onPhotoSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      const validTypes = ['image/png', 'image/jpg', 'image/jpeg'];
      if (!validTypes.includes(file.type)) {
        alert('Please upload a PNG or JPG image');
        return;
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('File size must be less than 5MB');
        return;
      }

      this.passPhoto.file = file;
      this.passPhoto.fileUrl = URL.createObjectURL(file);
      this.cdr.detectChanges();
      this.licenseApplicationService.setPassPhoto(file);
      console.log('✅ Photo uploaded:', file.name, file.size, 'bytes');
    }
  }

  viewPhoto() {
    if (this.passPhoto.fileUrl) {
      window.open(this.passPhoto.fileUrl, '_blank');
    }
  }

  isPhotoUploaded(): boolean {
    return !!this.passPhoto.file;
  }

  clearPhotoUrl() {
    if (this.passPhoto.fileUrl) {
      URL.revokeObjectURL(this.passPhoto.fileUrl);
      this.passPhoto.fileUrl = '';
    }
  }

  private updateErrorMessage(field: keyof typeof this.errorMessages) {
    const control = this.memberDetailsForm.get(field);
    if (control?.hasError('required')) {
      this.errorMessages[field].set('This field is required');
    } else if (control?.hasError('pattern')) {
      this.errorMessages[field].set('Invalid format');
    } else if (control?.hasError('email')) {
      this.errorMessages[field].set('Not a valid email');
    } else {
      this.errorMessages[field].set('');
    }
  }

  private updateAllErrorMessages() {
    Object.keys(this.errorMessages).forEach((field) => {
      this.updateErrorMessage(field as keyof typeof this.errorMessages);
    });
  }

  getErrorMessage(field: keyof typeof this.errorMessages) {
    return this.errorMessages[field]();
  }

  proceedToNext() {
    if (this.memberDetailsForm.valid && this.isPhotoUploaded()) {
      this.next.emit();
    }
  }

  resetForm() {
    this.memberDetailsForm.reset();
    this.clearPhotoUrl();
    this.passPhoto.file = null;
    this.licenseApplicationService.clearPassPhoto();
    sessionStorage.removeItem('memberDetailsData');
  }

  goBack() {
    this.back.emit();
  }
}