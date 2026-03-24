import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module';
import { KeyInfoComponent } from './steps/key-info/key-info.component';
import { SiteDetailsComponent } from './steps/site-details/site-details.component';
import { UnitDetailsComponent } from './steps/unit-details/unit-details.component';
import { ApplicantDetailsComponent } from './steps/applicant-details/applicant-details.component';
import { DeclarationPaymentComponent } from './steps/declaration-payment/declaration-payment.component';
import { SelectLicenseComponent } from './steps/select-license/select-license.component';
import { AccountService } from '../../../core/services/account.service';

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
}