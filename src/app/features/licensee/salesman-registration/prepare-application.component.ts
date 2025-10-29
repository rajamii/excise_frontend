import { Component } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module'; // Import Material Module for Material Design components
import { LicenseComponent } from './steps/license/license.component'; // Import License step component
import { DetailsComponent } from './steps/details/details.component'; // Import Details step component
import { MakePaymentComponent } from "./steps/make-payment/make-payment.component"; // Import Make Payment step component
import { SubmitApplicationComponent } from "./steps/submit-application/submit-application.component"; // Import Submit Application step component

@Component({
  selector: 'app-salesman-registration', // Custom HTML tag for the Salesman Registration component
  standalone: true,
  imports: [MaterialModule, LicenseComponent, DetailsComponent, MakePaymentComponent, SubmitApplicationComponent], // Import the necessary modules and step components
  templateUrl: './prepare-application.component.html', // Path to the HTML template for the component
  styleUrl: './prepare-application.component.scss' // Path to the SCSS styles for the component
})
export class PrepareApplicationComponent {
  
  // Getter to retrieve the role from sessionStorage. This is used to determine whether the user is a "Salesman", "Barman", or other roles.
  get role() {
    const storedData = sessionStorage.getItem('licenseDetails'); // Get 'licenseDetails' from sessionStorage
    return storedData ? JSON.parse(storedData).role : null; // Parse the data and return the role; if no data, return null
  }
}
