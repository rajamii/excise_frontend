import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module';
import { KeyInfoComponent } from './steps/key-info/key-info.component';
import { SiteDetailsComponent } from './steps/site-details/site-details.component';
import { UnitDetailsComponent } from './steps/unit-details/unit-details.component';
import { ApplicantDetailsComponent } from './steps/applicant-details/applicant-details.component';
import { MemberDetailsComponent } from './steps/member-details/member-details.component';
import { DeclarationPaymentComponent } from './steps/declaration-payment/declaration-payment.component';
import { SelectLicenseComponent } from './steps/select-license/select-license.component';
import { AccountService } from '../../../core/services/account.service';

interface ApplicantDetailsStepData {
  mode_of_operation?: string | null;
  modeOfOperation?: string | null;
}

@Component({
  selector: 'app-apply-new-license',
  standalone: true,
  imports: [
    MaterialModule,
    SelectLicenseComponent,
    KeyInfoComponent,
    ApplicantDetailsComponent,
    MemberDetailsComponent,
    SiteDetailsComponent,
    UnitDetailsComponent,
    DeclarationPaymentComponent
  ],
  templateUrl: './apply-new-license.component.html',
  styleUrl: './apply-new-license.component.scss'
})
export class ApplyNewLicenseComponent implements OnInit {
  
  constructor(private accountService: AccountService) {}

  ngOnInit(): void {
    // ✅ Ensure user profile is loaded when starting a new license application
    this.ensureUserProfileLoaded();
  }

  /**
   * ✅ Ensure user profile is loaded before starting the application
   */
  private ensureUserProfileLoaded(): void {
    const userProfile = this.accountService.getUserProfileSync();
    
    if (!userProfile) {
      console.log('📡 Loading user profile for license application...');
      this.accountService.identity(true).subscribe({
        next: (profile) => {
          if (profile) {
            console.log('✅ User profile loaded successfully');
          }
        },
        error: (err) => {
          console.error('❌ Failed to load user profile:', err);
        }
      });
    } else {
      console.log('✅ User profile already loaded');
    }
  }

  // Getter to retrieve the selected license type from session storage
  get licenseType() {
    const storedData = sessionStorage.getItem('selectLicenseData');
    return storedData ? JSON.parse(storedData).licenseType : null;
  }

  get isCompanyType(): boolean {
    const licenseTypeName = this.getSelectedLicenseTypeName().toLowerCase();
    return licenseTypeName === 'company' || Number(this.licenseType) === 2;
  }

  get shouldShowMemberDetailsStep(): boolean {
    const modeOfOperation = this.selectedModeOfOperation;
    return modeOfOperation === 'Salesman' || modeOfOperation === 'Barman';
  }

  get memberDetailsStepLabel(): string {
    const modeOfOperation = this.selectedModeOfOperation;
    return modeOfOperation === 'Salesman' || modeOfOperation === 'Barman'
      ? `${modeOfOperation} Details`
      : 'Member Details';
  }

  private get selectedModeOfOperation(): string {
    const applicantDetails = this.getParsedSession<ApplicantDetailsStepData>('applicantDetailsData');
    return String(
      applicantDetails?.mode_of_operation ?? applicantDetails?.modeOfOperation ?? ''
    ).trim();
  }

  private getParsedSession<T = any>(key: string): T | null {
    try {
      const storedData = sessionStorage.getItem(key);
      return storedData ? JSON.parse(storedData) as T : null;
    } catch (error) {
      console.error(`Failed to parse session data for ${key}:`, error);
      return null;
    }
  }

  private getSelectedLicenseTypeName(): string {
    const selectedLicenseTypeId = Number(this.licenseType);
    const storedLicenseTypes = this.getParsedSession<Array<{ id?: number; licenseType?: string }>>('licenseTypes') ?? [];
    const matchedType = storedLicenseTypes.find((licenseType) => Number(licenseType.id) === selectedLicenseTypeId);

    return String(matchedType?.licenseType ?? '');
  }
}
