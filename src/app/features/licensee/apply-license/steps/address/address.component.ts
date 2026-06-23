import { Component, EventEmitter, Output, OnInit, OnDestroy, signal, DoCheck } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Subdivision } from '../../../../../core/models/subdivision.model';
import { PoliceStation } from '../../../../../core/models/policestation.model';
import { Road } from '../../../../../core/models/road.model';
import { MaterialModule } from '../../../../../shared/material.module';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { LicenseApplication } from '../../../../../core/models/license-application.model';
import { MasterService } from '../../../../../core/services/master.service';
import { AccountService } from '../../../../../core/services/account.service';

@Component({
  selector: 'app-address',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './address.component.html',
  styleUrl: './address.component.scss',
})
export class AddressComponent implements OnInit, OnDestroy, DoCheck {
  addressForm: FormGroup;
  siteDistrict = '';

  subdivisions: Subdivision[] = [];
  private policeStations: PoliceStation[] = [];
  sitePoliceStations: PoliceStation[] = [];
  
  roads: Road[] = [];

  locationCategories: string[] = ['Gyalshing', 'Namchi', 'Gangtok', 'Mangan', 'Rangpo', 'Jorethang', 'Singtam', 'Pakyong', 'Soreng', 'Chungthang'];
  locationNames: string[] = ['Location 1', 'Location 2', 'Location 3'];
  wardNames: string[] = ['Ward 1', 'Ward 2', 'Ward 3'];

  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  private destroy$ = new Subject<void>();
  private dataLoaded = false;

  errorMessages = {
    site_subdivision: signal(''),
    police_station: signal(''),
    location_category: signal(''),
    location_name: signal(''),
    ward_name: signal(''),
    business_address: signal(''),
    road_name: signal(''),
    pin_code: signal(''),
    latitude: signal(''),
    longitude: signal('')
  };

  constructor(
    private fb: FormBuilder, 
    private masterService: MasterService,
    private accountService: AccountService
  ) {
    const storedValues = this.getFromSessionStorage();

    this.addressForm = this.fb.group({
      site_subdivision: new FormControl({ value: storedValues.site_subdivision, disabled: true }, [Validators.required]),
      police_station: new FormControl(storedValues.police_station, [Validators.required]),
      location_category: new FormControl(storedValues.location_category, [Validators.required]),
      location_name: new FormControl(storedValues.location_name, [Validators.required]),
      ward_name: new FormControl(storedValues.ward_name, [Validators.required]),
      business_address: new FormControl(storedValues.business_address, [Validators.required, Validators.maxLength(500)]),
      road_name: new FormControl(storedValues.road_name, [Validators.required]),
      pin_code: new FormControl(storedValues.pin_code, [Validators.required, Validators.pattern(PatternConstants.PINCODE)]),
      latitude: new FormControl(storedValues.latitude),
      longitude: new FormControl(storedValues.longitude),
    });

    this.addressForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.saveToSessionStorage();
      this.updateAllErrorMessages();
    });
  }

  ngOnInit() {
    this.loadDropdownData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngDoCheck(): void {
    if (!this.dataLoaded) return;

    const selectLicenseData = sessionStorage.getItem('selectLicenseData');
    if (selectLicenseData) {
      const parsed = JSON.parse(selectLicenseData);
      const selectedExciseSubdivision = parsed?.excise_subdivision;

      const siteSubdivisionControl = this.addressForm.get('site_subdivision');
      const currentValue = siteSubdivisionControl?.value;

      if (selectedExciseSubdivision && currentValue !== selectedExciseSubdivision) {
        siteSubdivisionControl?.setValue(selectedExciseSubdivision);
        siteSubdivisionControl?.disable({ emitEvent: false });
        this.onSubDivisionChange(selectedExciseSubdivision);
      }
    }
  }

  /**
   * ✅ Load subdivisions, police stations, and roads AND save to sessionStorage
   */
  private loadDropdownData(): void {
    forkJoin({
      subdivisions: this.masterService.getSubdivision(),
      policeStations: this.masterService.getPoliceStations(),
      roads: this.masterService.getRoads()
    }).subscribe({
      next: ({ subdivisions, policeStations, roads }) => {
        this.subdivisions = subdivisions;
        this.policeStations = policeStations;
        this.roads = roads;
        this.dataLoaded = true;
        
        sessionStorage.setItem('policeStations', JSON.stringify(policeStations));
        sessionStorage.setItem('roads', JSON.stringify(roads));
        this.autoFillFromUserProfile();
        
        const storedSubdivision = this.addressForm.get('site_subdivision')?.value;
        if (storedSubdivision) {
          this.onSubDivisionChange(storedSubdivision);
        }
      },
      error: (error) => {
        console.error('Failed to load address master data:', error);
      }
    });
  }


  private autoFillFromUserProfile(): void {
    const sessionData = sessionStorage.getItem('addressData');
    if (sessionData) {
      return;
    }

    const userProfile = this.accountService.getUserProfileSync();
    
    if (!userProfile) {
      this.accountService.identity(true).subscribe({
        next: (profile) => {
          if (profile) {
            this.fillFormWithProfile(profile);
          }
        },
        error: (err) => {
          console.error('Failed to fetch user profile:', err);
        }
      });
    } else {
      this.fillFormWithProfile(userProfile);
    }
  }


  private fillFormWithProfile(profile: any): void {
    if (!this.dataLoaded) {
      return;
    }

    if (profile.address) {
      this.addressForm.patchValue({
        business_address: profile.address
      }, { emitEvent: true });
    }
  }

  onSubDivisionChange(subdivisionId: number): void {
    if (!this.dataLoaded || this.subdivisions.length === 0 || this.policeStations.length === 0) {
      return;
    }
    
    const subdivision = this.subdivisions.find(s => s.id === subdivisionId);
    
    if (!subdivision) {
      console.warn('Subdivision not found for ID:', subdivisionId);
      this.sitePoliceStations = [];
      return;
    }
    
    this.sitePoliceStations = this.policeStations.filter(
      ps => ps.subdivisionCode === subdivision.subdivisionCode
    );
  }

  private getFromSessionStorage(): Partial<LicenseApplication> {
    const storedData = sessionStorage.getItem('addressData');
    return storedData ? JSON.parse(storedData) as LicenseApplication : {};
  }

  private saveToSessionStorage() {
    const formData: Partial<LicenseApplication> = this.addressForm.getRawValue();

    // Convert number fields to actual numbers
    const parsedNumbers = {
      pin_code: formData.pin_code ? Number(formData.pin_code) : null,
      latitude: formData.latitude ? Number(formData.latitude) : null,
      longitude: formData.longitude ? Number(formData.longitude) : null,
    };

    const enrichedData: any = {
      ...formData,
      ...parsedNumbers
    };
    
    // Get subdivision code
    if (formData.site_subdivision) {
      const subdivision = this.subdivisions.find(s => s.id === formData.site_subdivision);
      if (subdivision) {
        enrichedData.site_subdivision_code = subdivision.subdivisionCode;
      }
    }
    
    // Get police station code
    if (formData.police_station) {
      const policeStation = this.policeStations.find(ps => ps.id === formData.police_station);
      if (policeStation) {
        enrichedData.police_station_code = policeStation.policeStationCode;
      }
    }
    sessionStorage.setItem('addressData', JSON.stringify(enrichedData));
  }

  private updateErrorMessage(field: keyof typeof this.errorMessages) {
    const control = this.addressForm.get(field);

    if (control?.hasError('required')) {
      this.errorMessages[field].set('This field is required');
    } else if (control?.hasError('pattern')) {
      if (field === 'pin_code') {
        this.errorMessages[field].set('PIN Code must be a 6-digit number');
      } else {
        this.errorMessages[field].set('Invalid format');
      }
    } else {
      this.errorMessages[field].set('');
    }
  }

  private updateAllErrorMessages() {
    Object.keys(this.errorMessages).forEach((field) => {
      this.updateErrorMessage(field as keyof typeof this.errorMessages);
    });
  }

  getErrorMessage(field: keyof typeof this.errorMessages) {
    return this.errorMessages[field]();
  }

  proceedToNext() {
    if (this.addressForm.valid) {
      this.next.emit();
    }
  }

  resetForm() {
    this.addressForm.reset();
    sessionStorage.removeItem('addressData');
  }

  goBack() {
    this.back.emit();
  }
}