import { Component, OnInit, ViewChild } from '@angular/core';
import { MatStepper } from '@angular/material/stepper';
import { MaterialModule } from '../../../../../shared/material.module';
import { BottlerDetailsComponent } from './steps/bottler-details/bottler-details.component';
import { CompanyDetailsComponent } from './steps/company-details/company-details.component';
import { SelectBrandsComponent } from './steps/select-brands/select-brands.component';
import { BrandConfirmationComponent } from './steps/brand-confirmation/brand-confirmation.component';
import { SubmitApplicationComponent } from './steps/submit-application/submit-application.component';
import { CollabMemberDetailsComponent } from './steps/collab-member-details/collab-member-details.component';
import { AccountService } from '../../../../../core/services/account.service';

@Component({
  selector: 'app-company-collaboration-prepare-application',
  standalone: true,
  imports: [
    MaterialModule,
    BottlerDetailsComponent,
    CompanyDetailsComponent,
    SelectBrandsComponent,
    BrandConfirmationComponent,
    SubmitApplicationComponent,
    CollabMemberDetailsComponent
  ],
  templateUrl: './prepare-application.component.html',
  styleUrl: './prepare-application.component.scss'
})
export class PrepareApplicationComponent implements OnInit {
  @ViewChild('stepper') stepper!: MatStepper;

  /** Controls visibility of the Brand Confirmation tab in the stepper header */
  showBrandConfirmation = false;

  constructor(private accountService: AccountService) {}

  ngOnInit(): void {
    const userProfile = this.accountService.getUserProfileSync();
    if (!userProfile) {
      this.accountService.identity(true).subscribe({
        error: (error) => console.error('Failed to load user profile for company collaboration:', error)
      });
    }
  }

  onBrandsNext(): void {
    this.showBrandConfirmation = true;
    this.stepper.next();
  }
}