import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { BottlerDetailsComponent } from './steps/bottler-details/bottler-details.component';
import { CompanyDetailsComponent } from './steps/company-details/company-details.component';
import { SelectBrandsComponent } from './steps/select-brands/select-brands.component';
import { BrandOverviewComponent } from './steps/brand-overview/brand-overview.component';
import { SubmitApplicationComponent } from './steps/submit-application/submit-application.component';
import { AccountService } from '../../../../../core/services/account.service';

@Component({
  selector: 'app-company-collaboration-prepare-application',
  standalone: true,
  imports: [
    MaterialModule,
    BottlerDetailsComponent,
    CompanyDetailsComponent,
    SelectBrandsComponent,
    BrandOverviewComponent,
    SubmitApplicationComponent
  ],
  templateUrl: './prepare-application.component.html',
  styleUrl: './prepare-application.component.scss'
})
export class PrepareApplicationComponent implements OnInit {
  constructor(private accountService: AccountService) {}

  ngOnInit(): void {
    const userProfile = this.accountService.getUserProfileSync();
    if (!userProfile) {
      this.accountService.identity(true).subscribe({
        error: (error) => console.error('Failed to load user profile for company collaboration:', error)
      });
    }
  }
}
