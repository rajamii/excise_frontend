import { Component, EventEmitter, Output, OnInit, OnDestroy, signal, DoCheck, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../shared/material.module';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { LicenseApplication } from '../../../../../core/models/license-application.model';
import { MasterService } from '../../../../../core/services/master.service';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { District } from '../../../../../core/models/district.model';
import { Road } from '../../../../../core/models/road.model';
import { Subdivision } from '../../../../../core/models/subdivision.model';
import { PoliceStation } from '../../../../../core/models/policestation.model';

interface DocumentUpload {
  name: string;
  label: string;
  file: File | null;
  fileUrl: string;
  required: boolean;
  formats: string;
}

@Component({
  selector: 'app-site-details',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './site-details.component.html',
  styleUrl: './site-details.component.scss',
})
export class SiteDetailsComponent implements OnInit, OnDestroy, DoCheck {
  siteDetailsForm: FormGroup;

  // Raw data from API for dropdowns
  districts: District[] = [];
  private allSubdivisions: Subdivision[] = [];
  private allPoliceStations: PoliceStation[] = [];
  private allRoads: Road[] = [];

  // Filtered data shown in dropdowns
  siteSubdivisions: Subdivision[] = [];
  sitePoliceStations: PoliceStation[] = [];
  roadNames: string[] = [];

  // Static dropdown values
  locationCategories: string[] = ['Municipal Corporation', 'Municipal Council', 'Nagar Panchayat', 'Block'];
  locationNames: string[] = ['Location 1', 'Location 2', 'Location 3', 'Location 4'];
  wardNames: string[] = ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4'];
  constructionTypes: string[] = ['RCC', 'Wooden Structure'];

  // Document upload configuration
  documents: DocumentUpload[] = [
    {
      name: 'nocLandlord',
      label: 'NOC from the Land lord regarding the use of the Premises',
      file: null,
      fileUrl: '',
      required: false,
      formats: '.jpg, .png, .pdf, .doc, .docx'
    },
  ];

  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  errorMessages = {
    siteDistrict: signal(''),
    siteSubdivision: signal(''),
    policeStation: signal(''),
    locationCategory: signal(''),
    locationName: signal(''),
    wardName: signal(''),
    businessAddress: signal(''),
    roadName: signal(''),
    pinCode: signal(''),
    latitude: signal(''),
    longitude: signal(''),
    constructionType: signal(''),
    length: signal(''),
    breadth: signal(''),
    siteOwned: signal(''),
    nocObtained: signal(''),
    tradeLicenseCovered: signal('')
  };

  constructor(
    private fb: FormBuilder,
    private masterService: MasterService,
    private licenseApplicationService: LicenseApplicationService,
    private cdr: ChangeDetectorRef
  ) {
    const storedValues = this.getFromSessionStorage();

    this.siteDetailsForm = this.fb.group({
      siteDistrict: new FormControl(storedValues.siteDistrict ?? null, [Validators.required]),
      siteSubdivision: new FormControl(storedValues.siteSubdivision, [Validators.required]),
      policeStation: new FormControl(storedValues.policeStation, [Validators.required]),
      locationCategory: new FormControl(storedValues.locationCategory, [Validators.required]),
      locationName: new FormControl(storedValues.locationName, [Validators.required]),
      wardName: new FormControl(storedValues.wardName, [Validators.required]),
      businessAddress: new FormControl(storedValues.businessAddress, [Validators.required, Validators.maxLength(500)]),
      roadName: new FormControl(storedValues.roadName, [Validators.required]),
      pinCode: new FormControl(storedValues.pinCode, [
        Validators.required,
        Validators.pattern(PatternConstants.PINCODE)
      ]),

      // Geo-coordinates with backend-matching validation
      latitude: new FormControl(storedValues.latitude, [
        Validators.min(-90),
        Validators.max(90),
        Validators.pattern(/^-?\d+(\.\d+)?$/)
      ]),
      longitude: new FormControl(storedValues.longitude, [
        Validators.min(-180),
        Validators.max(180),
        Validators.pattern(/^-?\d+(\.\d+)?$/)
      ]),

      // Site construction details
      constructionType: new FormControl(storedValues.constructionType, [Validators.required]),
      length: new FormControl(storedValues.length, [
        Validators.pattern(/^\d+(\.\d{1,2})?$/)
      ]),
      breadth: new FormControl(storedValues.breadth, [
        Validators.pattern(/^\d+(\.\d{1,2})?$/)
      ]),

      // Radio button fields
      siteOwned: new FormControl(storedValues.siteOwned, [Validators.required]),
      nocObtained: new FormControl(storedValues.nocObtained, [Validators.required]),
      tradeLicenseCovered: new FormControl(storedValues.tradeLicenseCovered, [Validators.required])
    });

    this.siteDetailsForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.saveToSessionStorage();
      this.updateAllErrorMessages();
    });
  }

  ngOnInit() {
    this.loadMasterData();
    this.restoreDocuments();

    /// Watch district → subdivision → police station
    this.siteDetailsForm.get('siteDistrict')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(districtId => {
        this.onDistrictChange(districtId);
      });

    this.siteDetailsForm.get('siteSubdivision')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(subdivisionId => {
        if (subdivisionId) {
          this.filterPoliceStations(subdivisionId);
        } else {
          this.sitePoliceStations = [];
          this.siteDetailsForm.patchValue({ policeStation: null }, { emitEvent: false });
        }
      });

    // Initialise the NOC validator based on the stored value
    const owned = this.siteDetailsForm.get('siteOwned')?.value;
    if (owned === 'Yes') {
      this.siteDetailsForm.get('nocObtained')?.clearValidators();
    } else {
      this.siteDetailsForm.get('nocObtained')?.setValidators(Validators.required);
    }
    this.siteDetailsForm.get('nocObtained')?.updateValueAndValidity({ emitEvent: false });
  }

  ngOnDestroy() {
    this.clearAllDocumentUrls();
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngDoCheck(): void {
    const selectLicenseData = sessionStorage.getItem('selectLicenseData');
    if (selectLicenseData) {
      const parsed = JSON.parse(selectLicenseData);
      const selectedExciseSubdivision = parsed?.exciseSubdivision;

      const siteSubdivisionControl = this.siteDetailsForm.get('siteSubdivision');
      const currentValue = siteSubdivisionControl?.value;

      // If exciseSubdivision is set from previous step and current value is different
      if (selectedExciseSubdivision && currentValue !== selectedExciseSubdivision) {
        console.log('🔄 Auto-setting subdivision from previous step:', selectedExciseSubdivision);
        siteSubdivisionControl?.setValue(selectedExciseSubdivision, { emitEvent: true });
        siteSubdivisionControl?.disable({ emitEvent: false });

        // Trigger filtering after subdivisions are loaded
        if (this.siteSubdivisions.length > 0) {
          this.filterPoliceStations(selectedExciseSubdivision);
        }
      } else if (!selectedExciseSubdivision && siteSubdivisionControl?.disabled) {
        // If no exciseSubdivision from previous step, enable the dropdown
        siteSubdivisionControl?.enable({ emitEvent: false });
      }
    }
  }

  private loadMasterData(): void {
    // Load Districts
    this.masterService.getDistrict().subscribe({
      next: (districts) => {
        this.districts = districts.filter(d => d.isActive);
        this.restoreDistrictIfNeeded();
      },
      error: (err) => console.error('Failed to load districts', err)
    });

    // Load All Subdivisions (for filtering by district)
    this.masterService.getSubdivision().subscribe({
      next: (allSubs) => {
        this.allSubdivisions = allSubs.filter(s => s.isActive);
        this.restoreSubdivisionIfNeeded();
      },
      error: (err) => console.error('Failed to load subdivisions', err)
    });

    // Load All Police Stations
    this.masterService.getPoliceStations().subscribe({
      next: (stations) => {
        this.allPoliceStations = stations.filter(p => p.isActive);
        this.restorePoliceStationIfNeeded();
      },
      error: (err) => console.error('Failed to load police stations', err)
    });

    // Load All Roads
    this.masterService.getRoads().subscribe({
      next: (roads) => {
        this.allRoads = roads;
        this.restoreRoadIfNeeded();
      },
      error: (err) => console.error('Failed to load roads', err)
    });
  }

  onDistrictChange(districtId: number): void {
  const district = this.districts.find(d => d.id === districtId);
  if (!district) {
    this.siteSubdivisions = [];
    this.roadNames = [];
    this.siteDetailsForm.patchValue({
      siteSubdivision: null,
      policeStation: null,
      roadName: null
    }, { emitEvent: false });
    return;
  }

  // Filter subdivisions
  this.siteSubdivisions = this.allSubdivisions.filter(s => s.districtCode === district.districtCode);

  // Filter roads
  this.roadNames = this.allRoads
    .filter(r => typeof r.district === 'number' && r.district === district.districtCode)
    .map(r => r.roadName)
    .sort();

  this.siteDetailsForm.patchValue({
    siteSubdivision: null,
    policeStation: null,
    roadName: null
  }, { emitEvent: false });

  this.cdr.detectChanges();
}

  // Document handling methods
  onDocumentSelect(event: Event, docName: string) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const doc = this.documents.find(d => d.name === docName);

    if (file && doc) {
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('File size must be less than 5MB');
        input.value = '';
        return;
      }

      // Validate file type
      const validTypes = doc.formats.split(', ').map(f => f.trim());
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!validTypes.includes(fileExtension)) {
        alert(`Invalid file type. Allowed types: ${doc.formats}`);
        input.value = '';
        return;
      }

      doc.file = file;
      doc.fileUrl = URL.createObjectURL(file);
      this.licenseApplicationService.setSiteDocument(docName, file);
      this.cdr.detectChanges();
    }
  }

  viewDocument(doc: DocumentUpload) {
    if (doc.fileUrl) {
      window.open(doc.fileUrl, '_blank');
    }
  }

  /** Called when the “site owned” radio changes */
  onSiteOwnedChange(event: any): void {
    const nocCtrl = this.siteDetailsForm.get('nocObtained');

    if (event.value === 'Yes') {
      // Clear & remove required validator when the site is owned
      nocCtrl?.setValue(null);
      nocCtrl?.clearValidators();
    } else {
      // Re-apply required validator when the site is NOT owned
      nocCtrl?.setValidators(Validators.required);
    }

    nocCtrl?.updateValueAndValidity({ emitEvent: false });
    this.updateAllErrorMessages();   // keep error signals in sync
  }

  private filterPoliceStations(subdivisionId: number): void {
    const subdivision = this.allSubdivisions.find(s => s.id === subdivisionId);
    if (!subdivision) {
      this.sitePoliceStations = [];
      return;
    }

    this.sitePoliceStations = this.allPoliceStations.filter(ps =>
      ps.subdivisionCode === subdivision.subdivisionCode
    );

    const current = this.siteDetailsForm.get('policeStation')?.value;
    if (current && !this.sitePoliceStations.some(p => p.id === current)) {
      this.siteDetailsForm.patchValue({ policeStation: null }, { emitEvent: false });
    }

    this.cdr.detectChanges();
  }

  private restoreDocuments() {
    this.documents.forEach(doc => {
      const storedFile = this.licenseApplicationService.getSiteDocument(doc.name);
      if (storedFile) {
        doc.file = storedFile;
        doc.fileUrl = URL.createObjectURL(storedFile);
      }
    });
  }

  private restoreDistrictIfNeeded(): void {
  const stored = this.getFromSessionStorage();

  // stored.siteDistrict could be:
  //   - number (correct)
  //   - District object (wrong, but possible due to bug)
  //   - undefined

  let districtId: number | undefined;

  if (stored.siteDistrict != null) {
    if (typeof stored.siteDistrict === 'number') {
      districtId = stored.siteDistrict;
    } else if (typeof (stored.siteDistrict as any).id === 'number') {
      // Backward compatibility: someone saved full object
      districtId = (stored.siteDistrict as any).id;
    }
  }

  if (districtId != null && this.districts.some(d => d.id === districtId)) {
    this.siteDetailsForm.patchValue(
      { siteDistrict: districtId },
      { emitEvent: false }
    );

    setTimeout(() => this.onDistrictChange(districtId), 0);
  }
}

  private restoreSubdivisionIfNeeded(): void {
    const stored = this.getFromSessionStorage();
    if (stored.siteSubdivision && this.siteSubdivisions.length > 0) {
      const valid = this.siteSubdivisions.some(s => s.id === stored.siteSubdivision);
      if (valid) {
        this.siteDetailsForm.patchValue({ siteSubdivision: stored.siteSubdivision }, { emitEvent: false });
      }
    }
  }

  private restorePoliceStationIfNeeded(): void {
    const stored = this.getFromSessionStorage();
    if (stored.policeStation && this.sitePoliceStations.length > 0) {
      const valid = this.sitePoliceStations.some(p => p.id === stored.policeStation);
      if (valid) {
        this.siteDetailsForm.patchValue({ policeStation: stored.policeStation }, { emitEvent: false });
      }
    }
  }

  private restoreRoadIfNeeded(): void {
    const stored = this.getFromSessionStorage();
    if (stored.roadName && this.roadNames.length > 0) {
      const valid = this.roadNames.includes(stored.roadName);
      if (valid) {
        this.siteDetailsForm.patchValue({ roadName: stored.roadName }, { emitEvent: false });
      }
    }
  }

  private clearAllDocumentUrls() {
    this.documents.forEach(doc => {
      if (doc.fileUrl) {
        URL.revokeObjectURL(doc.fileUrl);
        doc.fileUrl = '';
      }
    });
  }

  areRequiredDocumentsUploaded(): boolean {
    return this.documents
      .filter(doc => doc.required)
      .every(doc => doc.file !== null);
  }

  private getFromSessionStorage(): Partial<LicenseApplication> {
  const storedData = sessionStorage.getItem('siteDetailsData');
  if (!storedData) return {};

  const parsed = JSON.parse(storedData);

  // Fix corrupted siteDistrict if it's an object
  if (parsed.siteDistrict && typeof parsed.siteDistrict !== 'number') {
    parsed.siteDistrict = parsed.siteDistrict.id ?? null;
    sessionStorage.setItem('siteDetailsData', JSON.stringify(parsed)); // auto-fix
  }

  return parsed;
}

  private saveToSessionStorage() {
    const formData: Partial<LicenseApplication> = this.siteDetailsForm.getRawValue();
    sessionStorage.setItem('siteDetailsData', JSON.stringify(formData));
  }

  private updateErrorMessage(field: keyof typeof this.errorMessages) {
    const control = this.siteDetailsForm.get(field);

    if (control?.hasError('required')) {
      this.errorMessages[field].set('This field is required');
    } else if (control?.hasError('pattern')) {
      if (field === 'pinCode') {
        this.errorMessages[field].set('PIN Code must be a 6-digit number');
      } else if (field === 'length' || field === 'breadth') {
        this.errorMessages[field].set('Please enter a valid number (up to 2 decimal places)');
      } else {
        this.errorMessages[field].set('Invalid format');
      }
    } else if (control?.hasError('min')) {
      if (field === 'latitude') {
        this.errorMessages[field].set('Latitude must be between -90 and 90');
      } else if (field === 'longitude') {
        this.errorMessages[field].set('Longitude must be between -180 and 180');
      }
    } else if (control?.hasError('max')) {
      if (field === 'latitude') {
        this.errorMessages[field].set('Latitude must be between -90 and 90');
      } else if (field === 'longitude') {
        this.errorMessages[field].set('Longitude must be between -180 and 180');
      }
    } else if (control?.hasError('maxlength')) {
      this.errorMessages[field].set('Maximum 500 characters allowed');
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
    if (this.siteDetailsForm.valid && this.areRequiredDocumentsUploaded()) {
      this.next.emit();
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.siteDetailsForm.controls).forEach(key => {
        this.siteDetailsForm.get(key)?.markAsTouched();
      });

      if (!this.areRequiredDocumentsUploaded()) {
        alert('Please upload all required documents before proceeding.');
      }
    }
  }

  resetForm() {
    this.siteDetailsForm.reset();
    this.documents.forEach(doc => {
      doc.file = null;
      if (doc.fileUrl) {
        URL.revokeObjectURL(doc.fileUrl);
        doc.fileUrl = '';
      }
      this.licenseApplicationService.removeSiteDocument(doc.name);
    });
    sessionStorage.removeItem('siteDetailsData');
  }

  goBack() {
    this.back.emit();
  }
}