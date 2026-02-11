import { Component, ViewChild } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { CompanyDetailsComponent } from "./steps/company-details/company-details.component";
import { MemberDetailsComponent } from './steps/member-details/member-details.component';
import { UploadDocumentsComponent } from "./steps/upload-documents/upload-documents.component";
import { SubmitApplicationComponent } from './steps/submit-application/submit-application.component';
import { MatStepper } from '@angular/material/stepper';
import { Router } from '@angular/router';
import { CompanyRegistrationService } from '../../../../../core/services/company-registration.service';

@Component({
  selector: 'app-prepare-application',
  imports: [MaterialModule, CompanyDetailsComponent, MemberDetailsComponent, UploadDocumentsComponent, SubmitApplicationComponent],
  templateUrl: './prepare-application.component.html',
  styleUrl: './prepare-application.component.scss'
})
export class PrepareApplicationComponent {
  @ViewChild('stepper') stepper!: MatStepper;
  
  applicationId: string | null = null;

  constructor(
    private router: Router,
    private companyRegistrationService: CompanyRegistrationService
  ) {}

  onApplicationSubmitted(applicationId: string) {
    this.applicationId = applicationId;
    this.stepper.next();
  }

  goToDashboard() {
    // Clear all session data
    sessionStorage.clear();
    
    // Clear documents from service
    this.companyRegistrationService.clearCompanyDocuments();
    
    // Navigate to dashboard
    this.router.navigate(['/licensee/dashboard']);
  }
}