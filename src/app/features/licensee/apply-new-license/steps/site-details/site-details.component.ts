import { Component, EventEmitter, Output, OnInit, OnDestroy, signal, DoCheck, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../shared/material.module';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
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

  // Master data
  districts: District[] = [];
  // Filtered data shown in dropdowns
  siteSubdivisions: Subdivision[] = [];
  sitePoliceStations: PoliceStation[] = [];
  roadNames: Road[] = [];

  // Loading indicators
  loadingDistricts = false;
  loadingSubdivisions = false;
  loadingPoliceStations = false;
  loadingRoads = false;

  // Static dropdown values
  locationCategories: string[] = ['Municipal Corporation', 'Municipal Council', 'Nagar Panchayat', 'Block'];
  locationNames: string[] = ['Location 1', 'Location 2', 'Location 3', 'Location 4'];
  wardNames: string[] = ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4'];
  constructionTypes: string[] = ['RCC', 'Wooden Structure'];

  // Document upload configuration (backend field name: noc_landlord)
  documents: DocumentUpload[] = [
    {
      name: 'noc_landlord',
      label: 'NOC from the Land lord regarding the use of the Premises',
      file: null,
      fileUrl: '',
      required: false,
      formats: '.jpg,.jpeg,.png,.pdf'
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
    constructionType: signal(''),
    length: signal(''),
    breadth: signal(''),
    siteOwned: signal(''),
    nocObtained: signal(''),
    tradeLicenseCovered: signal(''),
  };

  constructor(
    private fb: FormBuilder,
    private masterService: MasterService,
    private licenseApplicationService: LicenseApplicationService,
    private cdr: ChangeDetectorRef
  ) {
    const storedValues: any = this.getFromSessionStorage();
    const hasDistrict = !!storedValues.siteDistrict;
    const hasSubdivision = !!storedValues.siteSubdivision;

    this.siteDetailsForm = this.fb.group({
      siteDistrict: new FormControl(storedValues.siteDistrict ?? null, [Validators.required]),
      siteSubdivision: new FormControl({ value: storedValues.siteSubdivision ?? null, disabled: !hasDistrict }, [Validators.required]),
      policeStation: new FormControl({ value: storedValues.policeStation ?? null, disabled: !hasSubdivision }, [Validators.required]),
      locationCategory: new FormControl(storedValues.locationCategory ?? null, [Validators.required]),
      locationName: new FormControl(storedValues.locationName ?? null, [Validators.required]),
      wardName: new FormControl(storedValues.wardName ?? null, [Validators.required]),
      businessAddress: new FormControl(storedValues.businessAddress ?? null, [Validators.required, Validators.maxLength(500)]),
      roadName: new FormControl({ value: storedValues.roadName ?? null, disabled: !hasDistrict }, [Validators.required]),
      pinCode: new FormControl(storedValues.pin_code, [
        Validators.required,
        Validators.pattern(PatternConstants.PINCODE)
      ]),

      // Site construction details
      constructionType: new FormControl(storedValues.constructionType, [Validators.required]),
      length: new FormControl(storedValues.length, [
        Validators.pattern(/^\d+(\.\d{1,2})?$/)
      ]),
      breadth: new FormControl(storedValues.breadth, [
        Validators.pattern(/^\d+(\.\d{1,2})?$/)
      ]),

      // Radio button fields (Backend expects "Yes"/"No" strings for ChoiceFields)
      siteOwned: new FormControl(storedValues.siteOwned, [Validators.required]),
      nocObtained: new FormControl(storedValues.nocObtained),
      tradeLicenseCovered: new FormControl(storedValues.tradeLicenseCovered, [Validators.required]),
    });

    this.setupConditionalValidation();

    this.siteDetailsForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.updateAllErrorMessages();
    });
  }

  ngOnInit() {
    this.restoreDocuments();
    this.loadingDistricts = true;
    this.masterService.getDistrict().subscribe({
      next: (districts) => {
        this.districts = districts;
        this.loadingDistricts = false;
      },
      error: (err) => {
        console.error('Failed to load districts', err);
        this.loadingDistricts = false;
      }
    });
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

      if (selectedExciseSubdivision && currentValue !== selectedExciseSubdivision) {
        console.log('🔄 Auto-setting subdivision from previous step:', selectedExciseSubdivision);
        this.siteDetailsForm.patchValue({ siteSubdivision: selectedExciseSubdivision }, { emitEvent: false });
      }
    }
  }

  trackById(index: number, item: any): number { return item.id; }

  // === Conditional Validators ===
  private setupConditionalValidation(): void {
    const siteOwnedCtrl = this.siteDetailsForm.get('siteOwned');

    // Initial state
    this.updateNocRequirements(siteOwnedCtrl?.value);

    // React to changes
    siteOwnedCtrl?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.updateNocRequirements(value);
        this.cdr.detectChanges();
      });
  }

  private updateNocRequirements(siteOwnedValue: 'Yes' | 'No' | null): void {
    const nocObtainedCtrl = this.siteDetailsForm.get('nocObtained');
    const nocDoc = this.documents.find(d => d.name === 'noc_landlord');

    if (siteOwnedValue === 'Yes') {
      nocObtainedCtrl?.setValue(null);
      nocObtainedCtrl?.clearValidators();

      if (nocDoc) {
        nocDoc.required = false;
        if (nocDoc.file) {
          URL.revokeObjectURL(nocDoc.fileUrl);
          nocDoc.file = null;
          nocDoc.fileUrl = '';
          this.licenseApplicationService.removeSiteDocument(nocDoc.name);
        }
      }
    } else if (siteOwnedValue === 'No') {
      nocObtainedCtrl?.setValidators(Validators.required);
      if (nocDoc) {
        nocDoc.required = true;
      }
    }

    nocObtainedCtrl?.updateValueAndValidity({ emitEvent: false });
  }

  // === Dropdown Change Handlers ===
  onSubdivisionChange(subdivisionCode: number): void {
    if (!subdivisionCode) {
      this.sitePoliceStations = [];
      this.siteDetailsForm.get('policeStation')?.reset();
      return;
    }

    this.loadingPoliceStations = true;
    this.masterService.getPoliceStationBySubDivision(subdivisionCode).subscribe({
      next: (policeStations) => {
        this.sitePoliceStations = policeStations;
        this.loadingPoliceStations = false;
        this.siteDetailsForm.get('policeStation')?.reset();  // Reset if needed
      },
      error: (err) => {
        console.error('Failed to load police stations', err);
        this.sitePoliceStations = [];
        this.loadingPoliceStations = false;
      }
    });
  }

  // Update onDistrictChange to fetch BOTH subdivisions and roads
  onDistrictChange(districtCode: number): void {
    if (!districtCode) {
      this.siteSubdivisions = [];
      this.sitePoliceStations = [];
      this.roadNames = [];
      this.siteDetailsForm.get('siteSubdivision')?.reset();
      this.siteDetailsForm.get('policeStation')?.reset();
      this.siteDetailsForm.get('roadName')?.reset();
      return;
    }

    // Fetch subdivisions
    this.loadingSubdivisions = true;
    this.masterService.getSubdivisionsByDistrict(districtCode).subscribe({
      next: (subdivisions) => {
        this.siteSubdivisions = subdivisions;
        this.loadingSubdivisions = false;
        this.siteDetailsForm.get('siteSubdivision')?.reset();
        this.sitePoliceStations = [];
        this.siteDetailsForm.get('policeStation')?.reset();
      },
      error: (err) => {
        console.error('Failed to load subdivisions', err);
        this.siteSubdivisions = [];
        this.loadingSubdivisions = false;
      }
    });

    // Fetch roads (populate roadNames)
    this.loadingRoads = true;
    this.masterService.getRoadsByDistrict(districtCode).subscribe({
      next: (roads) => {
        this.roadNames = roads;
        this.loadingRoads = false;
        this.siteDetailsForm.get('roadName')?.reset();
      },
      error: (err) => {
        console.error('Failed to load roads', err);
        this.roadNames = [];
        this.loadingRoads = false;
      }
    });
  }

  onDocumentSelect(event: any, docName: string) {
    const file: File = event.target.files[0];
    if (!file) return;

    const doc = this.documents.find(d => d.name === docName);
    if (!doc) return;

    // File size validation (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5 MB');
      event.target.value = '';
      return;
    }

    // Format validation
    const allowed = doc.formats.split(',').map(f => f.trim());
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      alert(`Allowed formats: ${doc.formats}`);
      event.target.value = '';
      return;
    }

    if (doc.fileUrl) {
      URL.revokeObjectURL(doc.fileUrl);
      doc.fileUrl = '';
    }

    doc.file = file;
    doc.fileUrl = URL.createObjectURL(file);
    this.licenseApplicationService.setSiteDocument(docName, file);
    console.log(`Document ${docName} uploaded:`, file.name);
    this.cdr.detectChanges();
  }

  viewDocument(doc: DocumentUpload) {
    if (doc.fileUrl) {
      window.open(doc.fileUrl, '_blank');
    }
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
      .every(doc => !!doc.file);
  }

  private getFromSessionStorage(): any {
    const storedData = sessionStorage.getItem('siteDetailsData');
    if (!storedData) return {};

    const parsed = JSON.parse(storedData);

    // Fix corrupted siteDistrict if it's an object
    if (parsed.siteDistrict && typeof parsed.siteDistrict !== 'number') {
      parsed.siteDistrict = parsed.siteDistrict.id ?? null;
      sessionStorage.setItem('siteDetailsData', JSON.stringify(parsed));
    }

    return parsed;
  }

  private saveToSessionStorage() {
    const formData: any = this.siteDetailsForm.getRawValue();


    if (formData.siteDistrict) {
      const district = this.districts.find(d => d.id === formData.siteDistrict);
      if (district) {
        formData.site_district = district.districtCode;
      }
    }

    if (formData.siteSubdivision) {
      const subdivision = this.siteSubdivisions.find(s => s.id === formData.siteSubdivision);
      if (subdivision) {
        formData.site_subdivision = subdivision.subdivisionCode;
      }
    }

    if (formData.policeStation) {
      const policeStation = this.sitePoliceStations.find(p => p.id === formData.policeStation);
      if (policeStation) {
        formData.police_station = policeStation.policeStationCode;
      }
    }

    formData.location_category = formData.locationCategory;
    formData.location_name = formData.locationName;
    formData.ward_name = formData.wardName;
    formData.business_address = formData.businessAddress;
    formData.road_name = formData.roadName;
    formData.pin_code = formData.pinCode;
    formData.construction_type = formData.constructionType;
    formData.site_owned = formData.siteOwned; 
    formData.noc_obtained = formData.nocObtained || 'No';
    formData.trade_license_covered = formData.tradeLicenseCovered;

    console.log('Saving Site Details:', formData);
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
      this.saveToSessionStorage();
      this.next.emit();
    } else {
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
      if (doc.fileUrl) {
        URL.revokeObjectURL(doc.fileUrl);
      }
      doc.file = null;
      doc.fileUrl = '';
      doc.required = false;
      this.licenseApplicationService.removeSiteDocument(doc.name);
    });
    sessionStorage.removeItem('siteDetailsData');
  }

  goBack() {
    this.back.emit();
  }
}