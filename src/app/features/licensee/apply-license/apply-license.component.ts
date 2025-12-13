import { Component } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module';
import { KeyInfoComponent } from './steps/key-info/key-info.component';
import { AddressComponent } from './steps/address/address.component';
import { UnitDetailsComponent } from './steps/unit-details/unit-details.component';
import { MemberDetailsComponent } from './steps/member-details/member-details.component';
import { SubmitApplicationComponent } from './steps/submit-application/submit-application.component';
import { SelectLicenseComponent } from './steps/select-license/select-license.component';

@Component({
  selector: 'app-apply-license', // Selector for the component
  standalone: true,             // Declares this component as standalone
  imports: [
    MaterialModule,             // Angular Material components
    SelectLicenseComponent,     // Step 1: Select license
    KeyInfoComponent,           // Step 2: Key information
    AddressComponent,           // Step 3: Address details
    UnitDetailsComponent,       // Step 4: Unit details
    MemberDetailsComponent,     // Step 5: Member details
    SubmitApplicationComponent            // Step 6: Final license info and submission
  ],
  templateUrl: './apply-license.component.html', // Template for rendering UI
  styleUrl: './apply-license.component.scss'     // Styling for the component
})
export class ApplyLicenseComponent {

  // Getter to retrieve the selected license type from session storage
  get licenseType() {
    const storedData = sessionStorage.getItem('keyInfoData'); // Fetching saved key info
    return storedData ? JSON.parse(storedData).licenseType : null; // Return licenseType if exists
  }
}
