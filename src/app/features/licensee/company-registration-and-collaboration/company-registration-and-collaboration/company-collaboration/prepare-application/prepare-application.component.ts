import { Component } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { BottlerDetailsComponent } from "./steps/bottler-details/bottler-details.component";
import { CompanyDetailsComponent } from './steps/company-details/company-details.component';
import { SelectBrandsComponent } from "./steps/select-brands/select-brands.component";
import { BrandOverviewComponent } from './steps/brand-overview/brand-overview.component';
import { SubmitApplicationComponent } from './steps/submit-application/submit-application.component';

@Component({
  selector: 'app-prepare-application',
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
export class PrepareApplicationComponent {
  
}