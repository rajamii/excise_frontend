import { Component, ViewChild, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { CompanyDetailsComponent } from "./steps/company-details/company-details.component";
import { MemberDetailsComponent } from './steps/member-details/member-details.component';
import { UploadDocumentsComponent } from "./steps/upload-documents/upload-documents.component";
import { SubmitApplicationComponent } from './steps/submit-application/submit-application.component';
import { MatStepper } from '@angular/material/stepper';
import { Router } from '@angular/router';
import { CompanyRegistrationService } from '../../../../../core/services/company-registration.service';
import { AccountService } from '../../../../../core/services/account.service';

@Component({
  selector: 'app-prepare-application',
  imports: [MaterialModule, CompanyDetailsComponent, MemberDetailsComponent, UploadDocumentsComponent, SubmitApplicationComponent],
  templateUrl: './prepare-application.component.html',
  styleUrl: './prepare-application.component.scss'
})
export class PrepareApplicationComponent implements OnInit {
  @ViewChild('stepper') stepper!: MatStepper;

  constructor(
    private router: Router,
    private companyRegistrationService: CompanyRegistrationService,
    private accountService: AccountService
  ) {}

  ngOnInit(): void {
    // ✅ Ensure user profile is loaded when starting company registration
    this.ensureUserProfileLoaded();
  }

  /**
   * ✅ Ensure user profile is loaded before starting the application
   */
  private ensureUserProfileLoaded(): void {
    const userProfile = this.accountService.getUserProfileSync();
    
    if (!userProfile) {
      console.log('📡 Loading user profile for company registration...');
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
}