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
    constructionType: signal(''),
    length: signal(''),
    breadth: signal(''),
    siteOwned: signal(''),
    nocObtained: signal(''),
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
      nocObtained: new FormControl(storedValues.nocObtained),
    });

    this.setupConditionalValidation();

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
        this.siteDetailsForm.patchValue({ siteSubdivision: selectedExciseSubdivision }, { emitEvent: false });
      }
    }
  }

  // === Conditional Validators ===
  private setupConditionalValidation(): void {
    const siteOwnedCtrl = this.siteDetailsForm.get('siteOwned');
    const nocObtainedCtrl = this.siteDetailsForm.get('nocObtained');

    // Initial state
    this.updateNocRequirements(siteOwnedCtrl?.value);

    // React to changes
    siteOwnedCtrl?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.updateNocRequirements(value);
        this.cdr.detectChanges(); // Ensure UI updates (e.g. button)
      });
  }

  private updateNocRequirements(siteOwnedValue: 'Yes' | 'No' | null): void {
    const nocObtainedCtrl = this.siteDetailsForm.get('nocObtained');
    const nocDoc = this.documents.find(d => d.name === 'nocLandlord');

    if (siteOwnedValue === 'Yes') {
      // Clear value and validators
      nocObtainedCtrl?.setValue(null);
      nocObtainedCtrl?.clearValidators();

      // Clear document
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
      // Apply required validator
      nocObtainedCtrl?.setValidators(Validators.required);
      if (nocDoc) {
        nocDoc.required = true;
      }
    }

    nocObtainedCtrl?.updateValueAndValidity({ emitEvent: false });
  }

  private loadMasterData(): void {
    // Districts
    this.masterService.getDistrict().subscribe({
      next: (districts) => {
        this.districts = districts;
        this.restoreDistrictIfNeeded();
      },
      error: (err) => console.error('Failed to load districts', err)
    });

    // Subdivisions
    this.masterService.getSubdivision().subscribe({
      next: (subdivisions) => {
        this.allSubdivisions = subdivisions;
        this.restoreSubdivisionIfNeeded();
      },
      error: (err) => console.error('Failed to load subdivisions', err)
    });

    // Police Stations
    this.masterService.getPoliceStations().subscribe({
      next: (stations) => {
        this.allPoliceStations = stations;
        this.restorePoliceStationIfNeeded();
      },
      error: (err) => console.error('Failed to load police stations', err)
    });

    // Roads
    this.masterService.getRoads().subscribe({
      next: (roads) => {
        this.allRoads = roads;
        this.restoreRoadIfNeeded();
      },
      error: (err) => console.error('Failed to load roads', err)
    });
  }

  onDistrictChange(districtId: number) {
    this.filterSubdivisions(districtId);
    this.filterRoads(districtId);
    this.siteDetailsForm.patchValue({
      siteSubdivision: null,
      policeStation: null,
      roadName: null
    }, { emitEvent: false });
  }

  private filterSubdivisions(districtId: number): void {
    const district = this.districts.find(d => d.id === districtId);
    if (!district) {
      this.siteSubdivisions = [];
      return;
    }

    this.siteSubdivisions = this.allSubdivisions.filter(s => s.districtCode === district.districtCode);

    const current = this.siteDetailsForm.get('siteSubdivision')?.value;
    if (current && !this.siteSubdivisions.some(s => s.id === current)) {
      this.siteDetailsForm.patchValue({ siteSubdivision: null }, { emitEvent: false });
    }

    this.cdr.detectChanges();
  }

  private filterRoads(districtId: number): void {
    const district = this.districts.find(d => d.id === districtId);
    const districtCode = district?.districtCode;
    if (!districtCode) {
      this.roadNames = [];
      return;
    }

    this.roadNames = this.allRoads
      .filter(road => {
        if (typeof road.district === 'number') {
          return road.district === districtCode;
        } else if (road.district && 'districtCode' in road.district) {
          return road.district.districtCode === districtCode;
        }
        return false;
      })
      .map(road => road.roadName)
      .sort();

    const current = this.siteDetailsForm.get('roadName')?.value;
    if (current && !this.roadNames.includes(current)) {
      this.siteDetailsForm.patchValue({ roadName: null }, { emitEvent: false });
    }

    this.cdr.detectChanges();
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

  onDocumentSelect(event: any, docName: string) {
    const file: File = event.target.files[0];
    if (!file) return;

    const doc = this.documents.find(d => d.name === docName);
    if (!doc) return;

    // Revoke old URL if exists
    if (doc.fileUrl) {
      URL.revokeObjectURL(doc.fileUrl);
      doc.fileUrl = '';
    }

    doc.file = file;
    doc.fileUrl = URL.createObjectURL(file);
    this.licenseApplicationService.setSiteDocument(docName, file);
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

  private restoreDistrictIfNeeded(): void {
    const stored = this.getFromSessionStorage();
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
      .every(doc => !!doc.file);
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
    if (doc.fileUrl) {
      URL.revokeObjectURL(doc.fileUrl);
    }
    doc.file = null;
    doc.fileUrl = '';
    doc.required = false; // Reset required flag
    this.licenseApplicationService.removeSiteDocument(doc.name);
  });
  sessionStorage.removeItem('siteDetailsData');
}

  goBack() {
    this.back.emit();
  }
}
