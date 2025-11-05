import { Component, EventEmitter, Output, OnInit, OnDestroy, signal, DoCheck, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '../../../../../shared/material.module';
import { PatternConstants } from '../../../../../shared/constants/pattern.constants';
import { LicenseApplication } from '../../../../../core/models/license-application.model';
import { MasterService } from '../../../../../core/services/master.service';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';

interface Subdivision {
  id: number;
  subdivision: string;
  subdivisionCode?: number;
  subdivision_code?: number;
}

interface PoliceStation {
  id: number;
  policeStation: string;
  police_station?: string;
  policeStationCode?: number;
  police_station_code?: number;
  subdivisionId?: number;
  subdivision_id?: number;
  subdivisionCode?: number;
  subdivision_code?: number;
  // Note: Backend returns subdivision_code as the foreign key
}

interface Road {
  id: number;
  roadName: string;
  road_name?: string;
}

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
  siteDistrict = '';

  // Raw data from API for dropdowns
  subdivisions: Subdivision[] = [];
  private allPoliceStations: PoliceStation[] = [];
  private allRoads: Road[] = [];

  // Filtered data shown in dropdowns
  sitePoliceStations: PoliceStation[] = [];
  roadNames: string[] = [];

  // Static dropdown values
  locationCategories: string[] = ['Gyalshing', 'Namchi', 'Gangtok', 'Mangan', 'Rangpo', 'Jorethang', 'Singtam', 'Pakyong', 'Soreng', 'Chungthang'];
  locationNames: string[] = ['Location 1', 'Location 2', 'Location 3', 'Location 4'];
  wardNames: string[] = ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4'];
  constructionTypes: string[] = ['RCC', 'Wooden Structure'];

  // Document upload configuration
  documents: DocumentUpload[] = [
    {
      name: 'aadharCard',
      label: 'Aadhaar Card',
      file: null,
      fileUrl: '',
      required: true,
      formats: '.jpg, .png, .pdf'
    },
    {
      name: 'sikkimCertificate',
      label: 'Sikkim Subject Certificate/ Certificate of Identification / Residential Certificate',
      file: null,
      fileUrl: '',
      required: true,
      formats: '.jpg, .png, .pdf'
    },
    {
      name: 'birthProof',
      label: 'Date of Birth Proof',
      file: null,
      fileUrl: '',
      required: true,
      formats: '.jpg, .png, .pdf'
    },
    {
      name: 'nocLandlord',
      label: 'NOC from the Land lord regarding the use of the Premises',
      file: null,
      fileUrl: '',
      required: false,
      formats: '.jpg, .png, .pdf, .doc, .docx'
    },
    {
      name: 'tradeLicense',
      label: 'Trade License',
      file: null,
      fileUrl: '',
      required: false,
      formats: '.jpg, .png, .pdf'
    }
  ];

  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  errorMessages = {
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
      // Address fields - siteSubdivision should NOT be disabled initially
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
    this.loadDropdownData();
    this.restoreDocuments();

    // Watch for subdivision changes to filter police stations
    this.siteDetailsForm.get('siteSubdivision')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((subdivisionId) => {
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
        console.log(' Auto-setting subdivision from previous step:', selectedExciseSubdivision);
        siteSubdivisionControl?.setValue(selectedExciseSubdivision, { emitEvent: true });
        siteSubdivisionControl?.disable({ emitEvent: false });
        
        // Trigger filtering after subdivisions are loaded
        if (this.subdivisions.length > 0) {
          this.filterPoliceStations(selectedExciseSubdivision);
        }
      } else if (!selectedExciseSubdivision && siteSubdivisionControl?.disabled) {
        // If no exciseSubdivision from previous step, enable the dropdown
        siteSubdivisionControl?.enable({ emitEvent: false });
      }
    }
  }

  private loadDropdownData(): void {
    console.log(' Loading subdivisions...');
    
    // Load subdivisions
    this.masterService.getSubdivision().subscribe({
      next: (data: any[]) => {
        console.log(' Raw subdivisions from backend:', data);
        
        if (data.length > 0) {
          console.log(' First subdivision structure:', JSON.stringify(data[0], null, 2));
        }
        
        this.subdivisions = data.map(item => ({
          id: item.id,
          subdivision: item.subdivision || item.name,
          subdivisionCode: item.subdivisionCode || item.subdivision_code || item.id, // Use ID as fallback
          subdivision_code: item.subdivision_code || item.id
        }));
        
        console.log(' Mapped subdivisions:', this.subdivisions);
        console.log('Subdivision codes:', this.subdivisions.map(s => ({ id: s.id, code: s.subdivisionCode })));
        
        // After subdivisions load, trigger filtering if subdivision is already set
        const currentSubdivision = this.siteDetailsForm.get('siteSubdivision')?.value;
        if (currentSubdivision && this.allPoliceStations.length > 0) {
          this.filterPoliceStations(currentSubdivision);
        }
      },
      error: (error) => {
        console.error(' Failed to load subdivisions:', error);
      }
    });

    console.log(' Loading police stations...');
    
    // Load police stations
    this.masterService.getPoliceStations().subscribe({
      next: (data: any[]) => {
        console.log(' Raw police stations from backend:', data);
        
        if (data.length > 0) {
          console.log(' First police station structure:', JSON.stringify(data[0], null, 2));
        }
        
        // Store all police stations with flexible field mapping
        this.allPoliceStations = data.map(item => ({
          id: item.id,
          policeStation: item.policeStation || item.police_station || item.name,
          police_station: item.police_station,
          policeStationCode: item.policeStationCode || item.police_station_code,
          police_station_code: item.police_station_code,
          subdivisionId: item.subdivisionId || item.subdivision_id,
          subdivision_id: item.subdivision_id,
          subdivisionCode: item.subdivisionCode || item.subdivision_code,
          subdivision_code: item.subdivision_code
        }));
        
        console.log(' Mapped police stations:', this.allPoliceStations);
        console.log(' Police station subdivision codes:', 
          this.allPoliceStations.map(ps => ({ id: ps.id, name: ps.policeStation, subdivisionCode: ps.subdivision_code })));
        
        // Filter police stations if subdivision is already selected
        const storedSubdivision = this.siteDetailsForm.get('siteSubdivision')?.value;
        if (storedSubdivision) {
          this.filterPoliceStations(storedSubdivision);
        }
      },
      error: (error) => {
        console.error(' Failed to load police stations:', error);
      }
    });

    console.log('Loading roads...');
    
    // Load roads from master service
    this.masterService.getRoads().subscribe({
      next: (data: any[]) => {
        console.log(' Raw roads from backend:', data);
        
        if (data.length > 0) {
          console.log(' First road structure:', JSON.stringify(data[0], null, 2));
        }
        
        // Store all roads
        this.allRoads = data.map(item => ({
          id: item.id,
          roadName: item.roadName || item.road_name || item.name,
          road_name: item.road_name
        }));
        
        // Extract road names for dropdown
        this.roadNames = this.allRoads.map(road => road.roadName);
        
        console.log(' Mapped roads:', this.allRoads);
        console.log(' Road names for dropdown:', this.roadNames);
      },
      error: (error) => {
        console.error(' Failed to load roads:', error);
        // Fallback to static values if API fails
        this.roadNames = ['Road 1', 'Road 2', 'Road 3', 'Road 4'];
      }
    });
  }

  private filterPoliceStations(subdivisionId: number): void {
    console.log(' Filtering police stations for subdivision ID:', subdivisionId);
    console.log('All subdivisions:', this.subdivisions);
    console.log(' All police stations:', this.allPoliceStations);
    
    // Find the selected subdivision
    const selectedSubdivision = this.subdivisions.find(sub => sub.id === subdivisionId);
    console.log(' Selected subdivision:', selectedSubdivision);
    
    if (!selectedSubdivision) {
      console.warn(' Subdivision not found in subdivisions array');
      this.sitePoliceStations = [];
      this.cdr.detectChanges();
      return;
    }

    // CRITICAL: Get the subdivision_code from the selected subdivision
    // Police stations reference subdivisions by subdivision_code, NOT by ID
    const subdivisionCode = selectedSubdivision.subdivision_code || selectedSubdivision.subdivisionCode;
    console.log(' Subdivision code from selected subdivision:', subdivisionCode);
    console.log(' Selected subdivision object:', {
      id: selectedSubdivision.id,
      name: selectedSubdivision.subdivision,
      code: subdivisionCode
    });
    
    if (!subdivisionCode) {
      console.error(' Selected subdivision does not have a subdivision_code!');
      this.sitePoliceStations = [];
      this.cdr.detectChanges();
      return;
    }
    
    // Filter police stations by matching their subdivision_code with the subdivision's subdivision_code
    this.sitePoliceStations = this.allPoliceStations.filter(ps => {
      const psSubdivisionCode = ps.subdivision_code || ps.subdivisionCode;
      
      // Match by code (this is the correct relationship)
      const matches = psSubdivisionCode === subdivisionCode;
      
      console.log(`  Police Station ${ps.id} (${ps.policeStation}):`, {
        ps_subdivision_code: psSubdivisionCode,
        looking_for_subdivision_code: subdivisionCode,
        matches: matches
      });
      
      return matches;
    });
    
    console.log(' Filtered police stations count:', this.sitePoliceStations.length);
    console.log(' Filtered police stations:', this.sitePoliceStations.map(ps => ({
      id: ps.id,
      name: ps.policeStation,
      subdivision_code: ps.subdivision_code
    })));
    
    if (this.sitePoliceStations.length === 0) {
      console.warn(' No police stations found!');
      console.warn(' Looking for subdivision_code:', subdivisionCode);
      console.warn(' Available subdivision_codes in police stations:', 
        [...new Set(this.allPoliceStations.map(ps => ps.subdivision_code || ps.subdivisionCode))]);
    }
    
    // Reset police station selection if current selection is not in filtered list
    const currentPoliceStation = this.siteDetailsForm.get('policeStation')?.value;
    const isCurrentValid = this.sitePoliceStations.some(ps => ps.id === currentPoliceStation);
    
    if (!isCurrentValid) {
      this.siteDetailsForm.patchValue({ policeStation: null }, { emitEvent: false });
    }
    
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
      .every(doc => doc.file !== null);
  }

  private getFromSessionStorage(): Partial<LicenseApplication> {
    const storedData = sessionStorage.getItem('siteDetailsData');
    return storedData ? JSON.parse(storedData) as LicenseApplication : {};
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
      } else if (field === 'latitude' || field === 'longitude') {
        this.errorMessages[field].set('Invalid coordinate format');
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