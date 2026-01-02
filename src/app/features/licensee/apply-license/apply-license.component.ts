import { Component } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module';
import { KeyInfoComponent } from './steps/key-info/key-info.component';
import { AddressComponent } from './steps/address/address.component';
import { UnitDetailsComponent } from './steps/unit-details/unit-details.component';
import { MemberDetailsComponent } from './steps/member-details/member-details.component';
import { SubmitApplicationComponent } from './steps/submit-application/submit-application.component';
import { SelectLicenseComponent } from './steps/select-license/select-license.component';

@Component({
  selector: 'app-apply-license',
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
  templateUrl: './apply-license.component.html',
  styleUrl: './apply-license.component.scss'
})
export class ApplyLicenseComponent {

  /**
   * Get license type from session storage
   * Using updated field name: license_type (with underscore)
   */
  get licenseType() {
    const storedData = sessionStorage.getItem('keyInfoData');
    return storedData ? JSON.parse(storedData).license_type : null;
  }
}