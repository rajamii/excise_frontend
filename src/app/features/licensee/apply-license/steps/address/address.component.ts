import { Component, EventEmitter, Output, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LicenseeService } from '../../../licensee.services';
import { SubDivision } from '../../../../../core/models/subdivision.model';
import { PoliceStation } from '../../../../../core/models/policestation.model';
import { MaterialModule } from '../../../../../shared/material.module';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { LicenseApplication } from '../../../../../core/models/license-application.model';

@Component({
  selector: 'app-address',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './address.component.html',
  styleUrl: './address.component.scss',
})
export class AddressComponent implements OnInit, OnDestroy {
  addressForm: FormGroup; // Main form group for address
  siteDistrict = '';

  // Raw data from API for dropdowns
  private subDivisions: SubDivision[] = [];
  private policeStations: PoliceStation[] = [];

  // Filtered data shown in dropdowns
  siteSubDivisions: any[] = [];
  sitePoliceStations: any[] = [];

  // Static dropdown values
  locationCategories: string[] = ['Gyalshing', 'Namchi', 'Gangtok', 'Mangan', 'Rangpo', 'Jorethang', 'Singtam', 'Pakyong', 'Soreng', 'Chungthang'];
  locationNames: string[] = ['Location 1', 'Location 2', 'Location 3', 'Location 4'];
  wardNames: string[] = ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4'];
  roadNames: string[] = ['Road 1', 'Road 2', 'Road 3', 'Road 4'];

  // Outputs for navigation between form steps
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  // Subject to destroy subscriptions on component destroy
  private destroy$ = new Subject<void>();

  // Error messages using Angular signal for reactive UI updates
  errorMessages = {
    siteSubDivision: signal(''),
    policeStation: signal(''),
    locationCategory: signal(''),
    locationName: signal(''),
    wardName: signal(''),
    businessAddress: signal(''),
    roadName: signal(''),
    pinCode: signal(''),
    latitude: signal(''),
    longitude: signal('')
  };

  constructor(private fb: FormBuilder, private licenseeService: LicenseeService) {
    const storedValues = this.getFromSessionStorage(); // Retrieve saved form values from session storage

    // Initialize the form with stored values and validators
    this.addressForm = this.fb.group({
      siteSubDivision: new FormControl(storedValues.siteSubDivision, [Validators.required]),
      policeStation: new FormControl(storedValues.policeStation, [Validators.required]),
      locationCategory: new FormControl(storedValues.locationCategory, [Validators.required]),
      locationName: new FormControl(storedValues.locationName, [Validators.required]),
      wardName: new FormControl(storedValues.wardName, [Validators.required]),
      businessAddress: new FormControl(storedValues.businessAddress, [Validators.required, Validators.maxLength(500)]),
      roadName: new FormControl(storedValues.roadName, [Validators.required]),
      pinCode: new FormControl(storedValues.pinCode, [Validators.required, Validators.pattern(PatternConstants.PINCODE)]),
      latitude: new FormControl(storedValues.latitude),
      longitude: new FormControl(storedValues.longitude),
    });

    // Save form changes to session storage and update error messages live
    this.addressForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.saveToSessionStorage();
      this.updateAllErrorMessages();
    });
  }

  ngOnInit() {
    this.loadDropdownData(); // Load data for subdivisions and police stations

    // Optional: auto-populate police stations if a subdivision was already selected
    const subDivision = this.addressForm.get('siteSubDivision')?.value;
    if (subDivision) {
      this.onSubDivisionChange(subDivision);
    }
  }

  ngOnDestroy() {
    this.destroy$.next(); // Signal to complete observable streams
    this.destroy$.complete();
  }

  // Fetches dropdown data from backend service
  private loadDropdownData(): void {
    this.licenseeService.getSubDivision().subscribe((data: SubDivision[]) => {
      this.siteSubDivisions = data;
    }, error => {
      console.error('Failed to load subdivisions.', error);
    });

    this.licenseeService.getPoliceStations().subscribe((data: PoliceStation[]) => {
      this.policeStations = data;
    }, error => {
      console.error('Failed to load police stations.', error);
    });
  }

  /**
   * Filters police stations based on selected subdivision
   * @param name selected subdivision name
   */
  onSubDivisionChange(name: string): void {
    this.sitePoliceStations = this.policeStations.filter(ps => ps.SubDivisionName === name);
    console.log('Filtered police station:', this.sitePoliceStations);
  }

  // Retrieves form data from session storage
  private getFromSessionStorage(): Partial<LicenseApplication> {
    const storedData = sessionStorage.getItem('addressData');
    return storedData ? JSON.parse(storedData) as LicenseApplication : {};
  }

  // Saves current form data to session storage
  private saveToSessionStorage() {
    const formData: Partial<LicenseApplication> = this.addressForm.getRawValue();
    sessionStorage.setItem('addressData', JSON.stringify(formData));
  }

  /**
   * Updates the error message for a specific form control
   * @param field form control name
   */
  private updateErrorMessage(field: keyof typeof this.errorMessages) {
    const control = this.addressForm.get(field);

    if (control?.hasError('required')) {
      this.errorMessages[field].set('This field is required');
    } else if (control?.hasError('pattern')) {
      if (field === 'pinCode') {
        this.errorMessages[field].set('PIN Code must be a 6-digit number');
      } else {
        this.errorMessages[field].set('Invalid format');
      }
    } else {
      this.errorMessages[field].set('');
    }
  }

  // Updates all error messages on the form
  private updateAllErrorMessages() {
    Object.keys(this.errorMessages).forEach((field) => {
      this.updateErrorMessage(field as keyof typeof this.errorMessages);
    });
  }

  /**
   * Returns the current error message of a form field
   * @param field form control name
   */
  getErrorMessage(field: keyof typeof this.errorMessages) {
    return this.errorMessages[field]();
  }

  // Emits 'next' event if form is valid
  proceedToNext() {
    if (this.addressForm.valid) {
      this.next.emit();
    }
  }

  // Clears the form and session storage
  resetForm() {
    this.addressForm.reset();
    sessionStorage.removeItem('addressData');
  }

  // Emits 'back' event to navigate to the previous step
  goBack() {
    this.back.emit();
  }
}
