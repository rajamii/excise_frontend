import { Component, EventEmitter, Output, OnInit, OnDestroy, signal, DoCheck, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../shared/material.module';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { MasterService } from '../../../../../core/services/master.service';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { AccountService } from '../../../../../core/services/account.service';
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

  districts: District[] = [];
  private allSubdivisions: Subdivision[] = [];
  private allPoliceStations: PoliceStation[] = [];
  private allRoads: Road[] = [];

  siteSubdivisions: Subdivision[] = [];
  sitePoliceStations: PoliceStation[] = [];
  roadNames: Road[] = [];

  locationCategories: string[] = ['Municipal Corporation', 'Municipal Council', 'Nagar Panchayat', 'Block'];
  locationNames: string[] = ['Location 1', 'Location 2', 'Location 3', 'Location 4'];
  wardNames: string[] = ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4'];
  constructionTypes: string[] = ['RCC', 'Wooden Structure'];

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
  private prefillDistrictCode: number | null = null;
  private prefillSubdivisionCode: number | null = null;
  private prefillApplied = false;

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
    private accountService: AccountService,
    private cdr: ChangeDetectorRef
  ) {
    const storedValues: any = this.getFromSessionStorage();
    const hasDistrict = !!storedValues.district;
    const hasSubdivision = !!storedValues.subdivision;

    this.siteDetailsForm = this.fb.group({
      siteDistrict: new FormControl(storedValues.district ?? null, [Validators.required]),
      siteSubdivision: new FormControl({value: storedValues.subdivision ?? null, disabled: !hasDistrict}, [Validators.required]),
      policeStation: new FormControl({value: storedValues.police_station ?? null, disabled: !hasSubdivision}, [Validators.required]),
      locationCategory: new FormControl(storedValues.location_category ?? null, [Validators.required]),
      locationName: new FormControl(storedValues.location_name ?? null, [Validators.required]),
      wardName: new FormControl(storedValues.ward_name ?? null, [Validators.required]),
      businessAddress: new FormControl(storedValues.address ?? null, [Validators.required, Validators.maxLength(500)]),
      roadName: new FormControl({value: storedValues.road ?? null, disabled: !hasDistrict}, [Validators.required]),
      pinCode: new FormControl(storedValues.pin_code, [
        Validators.required,
        Validators.pattern(PatternConstants.PINCODE)
      ]),
      constructionType: new FormControl(storedValues.construction_type, [Validators.required]),
      length: new FormControl(storedValues.length, [
        Validators.pattern(/^\d+(\.\d{1,2})?$/)
      ]),
      breadth: new FormControl(storedValues.breadth, [
        Validators.pattern(/^\d+(\.\d{1,2})?$/)
      ]),
      siteOwned: new FormControl(storedValues.site_owned, [Validators.required]),
      nocObtained: new FormControl(storedValues.noc_obtained),
      tradeLicenseCovered: new FormControl(storedValues.trade_license_covered, [Validators.required]),
    });

    this.setupConditionalValidation();

    this.siteDetailsForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.saveToSessionStorage();
      this.updateAllErrorMessages();
    });
  }

  ngOnInit() {
    console.log('🚀 SiteDetailsComponent initialized');
    this.captureUserLocationForPrefill();
    this.loadMasterData();
    this.restoreDocuments();

    this.siteDetailsForm.get('siteDistrict')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(districtId => {
        console.log('🏛️ District changed to:', districtId);
        this.onDistrictChange(districtId);
        const siteSubdivisionCtrl = this.siteDetailsForm.get('siteSubdivision');
        const roadNameCtrl = this.siteDetailsForm.get('roadName');
        if (districtId) {
          siteSubdivisionCtrl?.enable();
          roadNameCtrl?.enable();
        } else {
          siteSubdivisionCtrl?.disable();
          roadNameCtrl?.disable();
        }
      });

    this.siteDetailsForm.get('siteSubdivision')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(subdivisionId => {
        const policeStationCtrl = this.siteDetailsForm.get('policeStation');
        if (subdivisionId) {
          policeStationCtrl?.enable();
          this.filterPoliceStations(subdivisionId);
        } else {
          policeStationCtrl?.disable();
          this.sitePoliceStations = [];
          this.siteDetailsForm.patchValue({ policeStation: null }, { emitEvent: false });
        }
      });
  }

  private captureUserLocationForPrefill(): void {
    const existingDistrict = this.siteDetailsForm.get('siteDistrict')?.value;
    const existingSubdivision = this.siteDetailsForm.get('siteSubdivision')?.value;
    if (existingDistrict || existingSubdivision) {
      return;
    }

    let profile: any = this.accountService.getCurrentUser();

    if (!profile) {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        try {
          profile = JSON.parse(storedUser);
        } catch (_e) {
          profile = null;
        }
      }
    }

    if (profile) {
      this.readPrefillCodesFromProfile(profile);
      return;
    }

    this.accountService.identity(true).pipe(takeUntil(this.destroy$)).subscribe({
      next: (user) => {
        if (user) this.readPrefillCodesFromProfile(user);
      },
      error: (err) => {
        console.error('Failed to fetch profile for district/subdivision prefill:', err);
      }
    });
  }

  private readPrefillCodesFromProfile(profile: any): void {
    const districtCode =
      profile?.district?.code ??
      profile?.district?.districtCode ??
      profile?.districtCode ??
      profile?.district_code ??
      null;

    const subdivisionCode =
      profile?.subdivision?.code ??
      profile?.subdivision?.subdivisionCode ??
      profile?.subdivisionCode ??
      profile?.subdivision_code ??
      null;

    this.prefillDistrictCode = districtCode !== null ? Number(districtCode) : null;
    this.prefillSubdivisionCode = subdivisionCode !== null ? Number(subdivisionCode) : null;
  }

  private tryApplyUserLocationPrefill(): void {
    if (this.prefillApplied) return;
    if (!this.prefillDistrictCode) return;
    if (!this.districts.length || !this.allSubdivisions.length) return;

    const district = this.districts.find(d => d.districtCode === this.prefillDistrictCode);
    if (!district) return;
    if (typeof district.id !== 'number') return;

    const siteDistrictCtrl = this.siteDetailsForm.get('siteDistrict');
    const siteSubdivisionCtrl = this.siteDetailsForm.get('siteSubdivision');
    const roadNameCtrl = this.siteDetailsForm.get('roadName');
    const policeStationCtrl = this.siteDetailsForm.get('policeStation');

    siteDistrictCtrl?.setValue(district.id, { emitEvent: false });
    siteSubdivisionCtrl?.enable({ emitEvent: false });
    roadNameCtrl?.enable({ emitEvent: false });

    this.filterSubdivisions(district.id);
    this.filterRoads(district.id);

    if (this.prefillSubdivisionCode) {
      const subdivision = this.siteSubdivisions.find(s => s.subdivisionCode === this.prefillSubdivisionCode);
      if (subdivision) {
        if (typeof subdivision.id !== 'number') return;
        siteSubdivisionCtrl?.setValue(subdivision.id, { emitEvent: false });
        policeStationCtrl?.enable({ emitEvent: false });
        this.filterPoliceStations(subdivision.id);
      }
    }

    this.prefillApplied = true;
    this.saveToSessionStorage();
    this.cdr.detectChanges();
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

  private setupConditionalValidation(): void {
    const siteOwnedCtrl = this.siteDetailsForm.get('siteOwned');
    this.updateNocRequirements(siteOwnedCtrl?.value);
    siteOwnedCtrl?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
      this.updateNocRequirements(value);
      this.cdr.detectChanges();
    });
  }

  private updateNocRequirements(siteOwnedValue: 'Yes' | 'No' | null): void {
    const nocObtainedCtrl = this.siteDetailsForm.get('nocObtained');
    const nocDoc = this.documents.find(d => d.name === 'noc_landlord');

    if (siteOwnedValue === 'Yes') {
      nocObtainedCtrl?.setValue('No');
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
      if (nocDoc) nocDoc.required = true;
    }
    nocObtainedCtrl?.updateValueAndValidity({ emitEvent: false });
  }

  // ✅ CRITICAL FIX: Save master data to sessionStorage
  private loadMasterData(): void {
    this.masterService.getDistrict().subscribe({
      next: (districts) => {
        this.districts = districts;
        // ✅ SAVE TO SESSION STORAGE
        sessionStorage.setItem('districts', JSON.stringify(districts));
        console.log('✅ Districts loaded and saved:', districts.length);
        
        const storedDistrictId = this.siteDetailsForm.get('siteDistrict')?.value;
        if (storedDistrictId) {
          this.onDistrictChange(storedDistrictId);
        }
        this.tryApplyUserLocationPrefill();
      },
      error: (err) => console.error('Failed to load districts', err)
    });

    this.masterService.getSubdivision().subscribe({
      next: (subdivisions) => {
        this.allSubdivisions = subdivisions;
        // ✅ SAVE TO SESSION STORAGE
        sessionStorage.setItem('subdivisions', JSON.stringify(subdivisions));
        console.log('✅ Subdivisions loaded and saved:', subdivisions.length);
        
        const storedDistrictId = this.siteDetailsForm.get('siteDistrict')?.value;
        if (storedDistrictId && this.districts.length > 0) {
          this.filterSubdivisions(storedDistrictId);
        }
        this.tryApplyUserLocationPrefill();
      },
      error: (err) => console.error('Failed to load subdivisions', err)
    });

    this.masterService.getPoliceStations().subscribe({
      next: (stations) => {
        this.allPoliceStations = stations;
        // ✅ SAVE TO SESSION STORAGE
        sessionStorage.setItem('policeStations', JSON.stringify(stations));
        console.log('✅ Police Stations loaded and saved:', stations.length);
        
        const storedSubdivisionId = this.siteDetailsForm.get('siteSubdivision')?.value;
        if (storedSubdivisionId && this.allSubdivisions.length > 0) {
          this.filterPoliceStations(storedSubdivisionId);
        }
      },
      error: (err) => console.error('Failed to load police stations', err)
    });

    this.masterService.getRoads().subscribe({
      next: (roads) => {
        this.allRoads = roads;
        // ✅ SAVE TO SESSION STORAGE
        sessionStorage.setItem('roads', JSON.stringify(roads));
        console.log('✅ Roads loaded and saved:', roads.length);
        
        const currentDistrictId = this.siteDetailsForm.get('siteDistrict')?.value;
        if (currentDistrictId) {
          this.filterRoads(currentDistrictId);
        }
      },
      error: (err) => console.error('❌ Failed to load roads', err)
    });
  }

  onDistrictChange(districtId: number) {
    console.log('🔄 onDistrictChange called with:', districtId);
    if (districtId) {
      this.filterSubdivisions(districtId);
      this.filterRoads(districtId);
      this.siteDetailsForm.patchValue({
        siteSubdivision: null,
        policeStation: null,
        roadName: null
      }, { emitEvent: false });
    } else {
      this.siteSubdivisions = [];
      this.roadNames = [];
      this.sitePoliceStations = [];
      this.siteDetailsForm.patchValue({
        siteSubdivision: null,
        policeStation: null,
        roadName: null
      }, { emitEvent: false });
    }
  }

  private filterSubdivisions(districtId: number): void {
    console.log('🔍 filterSubdivisions called with districtId:', districtId);
    const district = this.districts.find(d => d.id === districtId);
    if (!district) {
      console.warn('⚠️ District not found for ID:', districtId);
      this.siteSubdivisions = [];
      return;
    }

    console.log('✅ Found district:', district);
    this.siteSubdivisions = this.allSubdivisions.filter(s => s.districtCode === district.districtCode);
    console.log('✅ Filtered subdivisions:', this.siteSubdivisions);

    const current = this.siteDetailsForm.get('siteSubdivision')?.value;
    if (current && !this.siteSubdivisions.some(s => s.id === current)) {
      console.log('⚠️ Current subdivision not in filtered list, resetting');
      this.siteDetailsForm.patchValue({ siteSubdivision: null }, { emitEvent: false });
    }
    this.cdr.detectChanges();
  }

  private filterRoads(districtId: number): void {
    if (!districtId) {
      this.roadNames = [];
      return;
    }
    const selectedDistrict = this.districts.find(d => d.id === districtId);
    if (!selectedDistrict) {
      this.roadNames = [];
      return;
    }
    this.roadNames = this.allRoads.filter(road => {
      let roadDistrictId: number | undefined;
      if ((road as any).districtId !== undefined) {
        roadDistrictId = (road as any).districtId;
      } else if (typeof road.district === 'number') {
        roadDistrictId = road.district;
      } else if (road.district && typeof road.district === 'object') {
        roadDistrictId = (road.district as District).id;
      } else if ((road as any).district_id !== undefined) {
        roadDistrictId = (road as any).district_id;
      }
      return roadDistrictId === districtId;
    });
    const current = this.siteDetailsForm.get('roadName')?.value;
    if (current && !this.roadNames.some(r => r.id === current)) {
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
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5 MB');
      event.target.value = '';
      return;
    }
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
    console.log(`✅ Document ${docName} uploaded:`, file.name);
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
    return this.documents.filter(doc => doc.required).every(doc => !!doc.file);
  }

  private getFromSessionStorage(): any {
    const storedData = sessionStorage.getItem('siteDetailsData');
    if (!storedData) return {};
    return JSON.parse(storedData);
  }

  private saveToSessionStorage() {
    const formData: any = this.siteDetailsForm.getRawValue();
    
    const backendData: any = {
      district: formData.siteDistrict || null,
      subdivision: formData.siteSubdivision || null,
      police_station: formData.policeStation || null,
      road: formData.roadName || null,
      address: formData.businessAddress || null,
      location_category: formData.locationCategory || null,
      location_name: formData.locationName || null,
      ward_name: formData.wardName || null,
      pin_code: formData.pinCode ? String(formData.pinCode) : null,
      construction_type: formData.constructionType || null,
      length: formData.length || null,
      breadth: formData.breadth || null,
      site_owned: formData.siteOwned || null,
      trade_license_covered: formData.tradeLicenseCovered || null,
      noc_obtained: formData.siteOwned === 'Yes' ? 'No' : (formData.nocObtained || null)
    };
    
    console.log('💾 Saving Site Details:', backendData);
    sessionStorage.setItem('siteDetailsData', JSON.stringify(backendData));
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
      if (doc.fileUrl) URL.revokeObjectURL(doc.fileUrl);
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
