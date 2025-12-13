import { Component } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module';
import { KeyInfoComponent } from './steps/key-info/key-info.component';
import { SiteDetailsComponent } from './steps/site-details/site-details.component';
import { UnitDetailsComponent } from './steps/unit-details/unit-details.component';
import { ApplicantDetailsComponent } from './steps/applicant-details/applicant-details.component';
import { DeclarationPaymentComponent } from './steps/declaration-payment/declaration-payment.component';
import { SelectLicenseComponent } from './steps/select-license/select-license.component';

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
export class ApplyNewLicenseComponent {
  // Getter to retrieve the selected license type from session storage
  get licenseType() {
    const storedData = sessionStorage.getItem('selectLicenseData');
    return storedData ? JSON.parse(storedData).licenseType : null;
  }
}