import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module';
import { KeyInfoComponent } from './steps/key-info/key-info.component';
import { SiteDetailsComponent } from './steps/site-details/site-details.component';
import { UnitDetailsComponent } from './steps/unit-details/unit-details.component';
import { ApplicantDetailsComponent } from './steps/applicant-details/applicant-details.component';
import { DeclarationPaymentComponent } from './steps/declaration-payment/declaration-payment.component';
import { SelectLicenseComponent } from './steps/select-license/select-license.component';
import { AccountService } from '../../../core/services/account.service';
import { MatStepper } from '@angular/material/stepper';

@Component({
  selector: 'app-apply-new-license',
  standalone: true,
  imports: [
    MaterialModule,
    SelectLicenseComponent,
    KeyInfoComponent,
    ApplicantDetailsComponent,
    SiteDetailsComponent,
    UnitDetailsComponent,
    DeclarationPaymentComponent
  ],
  templateUrl: './apply-new-license.component.html',
  styleUrl: './apply-new-license.component.scss'
})
export class ApplyNewLicenseComponent implements OnInit, AfterViewInit {
  @ViewChild('stepper') stepper?: MatStepper;
  private hasSubmittedFromSlip = false;
  
  constructor(private accountService: AccountService) {}

  ngOnInit(): void {
    // ✅ Ensure user profile is loaded when starting a new license application
    this.ensureUserProfileLoaded();

    try {
      const submitted = String(sessionStorage.getItem('new_license_submitted_application_id') || '').trim();
      this.hasSubmittedFromSlip = Boolean(submitted);
    } catch {
      this.hasSubmittedFromSlip = false;
    }
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

  ngAfterViewInit(): void {
    try {
      if (this.hasSubmittedFromSlip && this.stepper) {
        queueMicrotask(() => {
          if (!this.stepper) return;
          this.stepper.linear = false;
          this.stepper.steps.forEach((s) => (s.completed = true));
          this.stepper.selectedIndex = Math.max(0, this.stepper.steps.length - 1);
        });
      }
    } catch {
      // no-op
    }
  }

  // Getter to retrieve the selected license type from session storage
  get licenseType() {
    const storedData = sessionStorage.getItem('selectLicenseData');
    return storedData ? JSON.parse(storedData).licenseType : null;
  }
}
