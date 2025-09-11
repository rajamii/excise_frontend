import { Component } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module';  // Shared Angular Material components
// Importing step components for the multi-step license application form
import { KeyInfoComponent } from './steps/key-info/key-info.component';
import { AddressComponent } from './steps/address/address.component';
import { UnitDetailsComponent } from './steps/unit-details/unit-details.component';
import { MemberDetailsComponent } from './steps/member-details/member-details.component';
import { SubmitApplicationComponent } from './steps/submit-application/submit-application.component';
import { SelectLicenseComponent } from './steps/application-type/select-license.component';

@Component({
  selector: 'app-apply-new-license',
  standalone: true,
  imports: [
    MaterialModule,
    SelectLicenseComponent,
    KeyInfoComponent,
    AddressComponent,
    UnitDetailsComponent,
    MemberDetailsComponent,
    SubmitApplicationComponent
  ],
  templateUrl: './apply-new-license.component.html',
  styleUrl: './apply-new-license.component.scss'
})
export class ApplyNewLicenseComponent {
  // Getter to retrieve the selected license type from session storage
  get licenseType() {
    const storedData = sessionStorage.getItem('selectLicenseData'); // Fetching saved key info
    return storedData ? JSON.parse(storedData).licenseType : null; // Return licenseType if exists
  }

}
