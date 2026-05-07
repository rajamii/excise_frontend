import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatStepper } from '@angular/material/stepper';
import { AccountService } from '../../../core/services/account.service';
import { MaterialModule } from '../../../shared/material.module';
import { ApplicantDetailsComponent } from './steps/applicant-details/applicant-details.component';
import { DeclarationPaymentComponent } from './steps/declaration-payment/declaration-payment.component';
import { KeyInfoComponent } from './steps/key-info/key-info.component';
import { MemberDetailsComponent } from './steps/member-details/member-details.component';
import { SelectLicenseComponent } from './steps/select-license/select-license.component';
import { SiteDetailsComponent } from './steps/site-details/site-details.component';
import { UnitDetailsComponent } from './steps/unit-details/unit-details.component';

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
export class ApplyNewLicenseComponent implements OnInit, AfterViewInit {
  @ViewChild('stepper') stepper?: MatStepper;
  resumeFromSubmitted = false;

  constructor(private accountService: AccountService) {}

  ngOnInit(): void {
    // Ensure user profile is loaded when starting a new license application
    this.ensureUserProfileLoaded();

    // When returning from BillDesk receipt after a successful payment, we need to
    // show the final "Declaration & Payment" step even if earlier steps are not
    // marked completed (linear stepper would otherwise prevent jumping).
    try {
      const submitted = String(sessionStorage.getItem('new_license_submitted_application_id') || '').trim();
      this.resumeFromSubmitted = !!submitted;
    } catch {
      this.resumeFromSubmitted = false;
    }
  }

  ngAfterViewInit(): void {
    // If user returns from BillDesk receipt after successful payment, jump to the last step
    // so the "Application Submitted" view is visible immediately.
    if (!this.resumeFromSubmitted || !this.stepper) return;

    // Wait one tick so conditional steps (member/company) are rendered.
    setTimeout(() => {
      if (!this.stepper) return;
      this.stepper.linear = false;
      this.stepper.selectedIndex = Math.max(0, this.stepper.steps.length - 1);

      // Clear the one-time "resume" flags after we've jumped.
      try {
        sessionStorage.removeItem('new_license_submitted_application_id');
        sessionStorage.removeItem('new_license_sbm_application_id');
        sessionStorage.removeItem('new_license_sbm_submitted');
      } catch {
        // no-op
      }
    }, 0);
  }

  /**
   * Ensure user profile is loaded before starting the application
   */
  private ensureUserProfileLoaded(): void {
    const userProfile = this.accountService.getUserProfileSync();

    if (!userProfile) {
      console.log('Loading user profile for license application...');
      this.accountService.identity(true).subscribe({
        next: (profile) => {
          if (profile) {
            console.log('User profile loaded successfully');
          }
        },
        error: (err) => {
          console.error('Failed to load user profile:', err);
        }
      });
    } else {
      console.log('User profile already loaded');
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
      return storedData ? (JSON.parse(storedData) as T) : null;
    } catch (error) {
      console.error(`Failed to parse session data for ${key}:`, error);
      return null;
    }
  }

  private getSelectedLicenseTypeName(): string {
    const selectedLicenseTypeId = Number(this.licenseType);
    const storedLicenseTypes =
      this.getParsedSession<Array<{ id?: number; licenseType?: string }>>('licenseTypes') ?? [];
    const matchedType = storedLicenseTypes.find(
      (licenseType) => Number(licenseType.id) === selectedLicenseTypeId
    );

    return String(matchedType?.licenseType ?? '');
  }
}
