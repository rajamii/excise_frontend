import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../shared/material.module';
import { AccountService } from '../../../../core/services/account.service';
import { LabelRegistrationLicenseeDetailsComponent } from './steps/licensee-details/licensee-details.component';
import { LabelRegistrationProductDetailsComponent } from './steps/product-details/product-details.component';
import { LabelRegistrationPackagingDetailsComponent } from './steps/packaging-details/packaging-details.component';
import { LabelRegistrationUploadDocumentsComponent } from './steps/upload-documents/upload-documents.component';
import { LabelRegistrationSubmitApplicationComponent } from './steps/submit-application/submit-application.component';

@Component({
  selector: 'app-label-registration-prepare-application',
  standalone: true,
  imports: [
    MaterialModule,
    LabelRegistrationLicenseeDetailsComponent,
    LabelRegistrationProductDetailsComponent,
    LabelRegistrationPackagingDetailsComponent,
    LabelRegistrationUploadDocumentsComponent,
    LabelRegistrationSubmitApplicationComponent
  ],
  templateUrl: './prepare-application.component.html',
  styleUrl: './prepare-application.component.scss'
})
export class LabelRegistrationPrepareApplicationComponent implements OnInit {
  constructor(private accountService: AccountService) {}

  ngOnInit(): void {
    const userProfile = this.accountService.getUserProfileSync();
    if (!userProfile) {
      this.accountService.identity(true).subscribe({
        error: (error) => console.error('Failed to load user profile for label registration:', error)
      });
    }
  }
}
