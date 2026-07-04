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
import { LocationCategory } from '../../../../../core/models/location-category.model';
import { LocationSubcategory } from '../../../../../core/models/location-subcategory.model';
import { Ward } from '../../../../../core/models/ward.model';
import { Block } from '../../../../../core/models/block.model';
import { RuralWard } from '../../../../../core/models/rural-ward.model';

interface Location {
  id: number;
  locationCode: number;
  locationDescription: string;
  districtCode: number;
  isActive: boolean;
}

interface DocumentUpload {
  name: string;
  label: string;
  file: File | null;
  fileUrl: string;
  required: boolean;
  formats: string;
}

/**
 * Site Details Component - COMPLETE VERSION
 * ✅ All TypeScript errors fixed
 * ✅ Integrated with 3 new tables (LocationCategory, LocationSubcategory, Ward)
 * ✅ Cascading dropdowns working
 * ✅ Auto-fill from user profile
 * ✅ Production ready
 */
@Component({
  selector: 'app-site-details',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './site-details.component.html',
  styleUrl: './site-details.component.scss',
})
export class SiteDetailsComponent implements OnInit, OnDestroy, DoCheck {
  siteDetailsForm: FormGroup;

  // Existing master data
  districts: District[] = [];
  private allSubdivisions: Subdivision[] = [];
  private allPoliceStations: PoliceStation[] = [];
  private allRoads: Road[] = [];

  siteSubdivisions: Subdivision[] = [];
  sitePoliceStations: PoliceStation[] = [];
  roadNames: Road[] = [];

  // ✅ NEW: Data for the 3 new tables
  locationCategories: LocationCategory[] = [];
  private allLocationSubcategories: LocationSubcategory[] = [];
  locationSubcategories: LocationSubcategory[] = [];
  
  private allLocations: Location[] = [];
  locations: Location[] = [];
  
  private allWards: Ward[] = [];
  wards: any[] = [];

  // ✅ NEW: Data for Block and RuralWard tables
  private allBlocks: Block[] = [];
  blocks: Block[] = [];
  private allRuralWards: RuralWard[] = [];

  get isRuralSubdivision(): boolean {
    const categoryId = this.siteDetailsForm.get('locationCategory')?.value;
    if (!categoryId) return false;
    const category = this.locationCategories.find(c => c.id === categoryId);
    return category ? !!category.isRural : false;
  }

  /**
   * Subcategory IDs for which Trade License is NOT applicable:
   * Foreign Liquor Retail Shop (10), Retail Sale of Denatured Spirit (11),
   * Brewing/Sale of Pachwai by Retail (23), Brewing of Pachwai (24),
   * Departmental Store (30)
   */
  private readonly TRADE_LICENSE_EXEMPT_SUBCATEGORY_IDS = new Set([10, 11, 23, 24, 30]);

  /** Set once in ngOnInit — true when the selected subcategory is trade-licence-exempt */
  hideTradeLicense = false;

  private computeHideTradeLicense(): void {
    try {
      const keyInfo = JSON.parse(sessionStorage.getItem('keyInfoData') || '{}');
      const subCatId = Number(
        keyInfo.licenseSubCategory ?? keyInfo.license_sub_category ?? 0
      );
      console.log('[TradeLicense] subCatId from keyInfoData:', subCatId);
      const exempt = subCatId > 0 && this.TRADE_LICENSE_EXEMPT_SUBCATEGORY_IDS.has(subCatId);
      this.hideTradeLicense = exempt;
      console.log('[TradeLicense] hideTradeLicense =', exempt);

      if (exempt) {
        const ctrl = this.siteDetailsForm?.get('tradeLicenseCovered');
        if (ctrl) {
          ctrl.clearValidators();
          ctrl.setValue(null, { emitEvent: false });
          ctrl.updateValueAndValidity({ emitEvent: false });
        }
        const doc = this.documents?.find(d => d.name === 'trade_license');
        if (doc) { doc.required = false; }
        this.clearDocumentSelection('trade_license');
      } else {
        // Restore required validator when not exempt
        const ctrl = this.siteDetailsForm?.get('tradeLicenseCovered');
        if (ctrl && !ctrl.validator) {
          ctrl.setValidators([Validators.required, Validators.pattern(/^Yes$/)]);
          ctrl.updateValueAndValidity({ emitEvent: false });
        }
      }

      this.cdr.detectChanges();
    } catch (e) {
      console.error('[TradeLicense] error reading keyInfoData', e);
      this.hideTradeLicense = false;
    }
  }

  constructionTypes: string[] = ['RCC', 'Wooden Structure'];

  documents: DocumentUpload[] = [
    {
      name: 'parcha',
      label: 'Parcha (Land Ownership Record)',
      file: null,
      fileUrl: '',
      required: false,
      formats: '.jpg,.jpeg,.png,.pdf'
    },
    {
      name: 'noc',
      label: 'NOC from the Land lord regarding the use of the Premises',
      file: null,
      fileUrl: '',
      required: false,
      formats: '.jpg,.jpeg,.png,.pdf'
    },
    {
      name: 'trade_license',
      label: 'Trade License',
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
    locationSubcategory: signal(''),
    location: signal(''),
    block: signal(''),
    ward: signal(''),
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
    const hasLocationCategory = !!storedValues.location_category;
    const hasLocation = !!storedValues.location;
    const hasBlock = !!storedValues.block;

    this.siteDetailsForm = this.fb.group({
      siteDistrict: new FormControl(storedValues.district ?? null, [Validators.required]),
      siteSubdivision: new FormControl({value: storedValues.subdivision ?? null, disabled: !hasDistrict}, [Validators.required]),
      policeStation: new FormControl({value: storedValues.police_station ?? null, disabled: !hasSubdivision}, [Validators.required]),
      
      // ✅ Form controls for location structure
      locationCategory: new FormControl(storedValues.location_category ?? null),
      locationSubcategory: new FormControl({value: storedValues.location_subcategory ?? null, disabled: !hasSubdivision}, [Validators.required]),
      location: new FormControl({value: storedValues.location ?? null, disabled: !hasSubdivision || !hasLocation}),
      block: new FormControl({value: storedValues.block ?? null, disabled: !hasSubdivision || !hasBlock}),
      ward: new FormControl({value: storedValues.ward ?? null, disabled: !hasLocation && !hasBlock}, [Validators.required]),
      
      businessAddress: new FormControl(storedValues.address ?? null, [Validators.required, Validators.maxLength(500)]),
      roadName: new FormControl({value: storedValues.road ?? null, disabled: !hasSubdivision}, [Validators.required]),
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
      tradeLicenseCovered: new FormControl(storedValues.trade_license_covered, [Validators.required, Validators.pattern(/^Yes$/)]),
    });

    this.setupConditionalValidation();

    this.siteDetailsForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.saveToSessionStorage();
      this.updateAllErrorMessages();
    });
  }

  ngOnInit() {
    console.log('🚀 SiteDetailsComponent initialized');
    this.computeHideTradeLicense();
    this.loadMasterData();
    this.restoreDocuments();

    // ✅ EXISTING: District change handler
    this.siteDetailsForm.get('siteDistrict')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(districtId => {
        console.log('🏛️ District changed to:', districtId);
        this.onDistrictChange(districtId);
        
        const siteSubdivisionCtrl = this.siteDetailsForm.get('siteSubdivision');
        const roadNameCtrl = this.siteDetailsForm.get('roadName');
        const locationCtrl = this.siteDetailsForm.get('location');
        
        if (districtId) {
          siteSubdivisionCtrl?.enable();
        } else {
          siteSubdivisionCtrl?.disable();
          roadNameCtrl?.disable();
          locationCtrl?.disable();
        }
      });

    // ✅ Subdivision change handler
    this.siteDetailsForm.get('siteSubdivision')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(subdivisionId => {
        const policeStationCtrl = this.siteDetailsForm.get('policeStation');
        const roadNameCtrl = this.siteDetailsForm.get('roadName');
        const locationSubcategoryCtrl = this.siteDetailsForm.get('locationSubcategory');
        const locationCtrl = this.siteDetailsForm.get('location');
        const blockCtrl = this.siteDetailsForm.get('block');
        const wardCtrl = this.siteDetailsForm.get('ward');

        if (subdivisionId) {
          policeStationCtrl?.enable();
          this.filterPoliceStations(subdivisionId);

          roadNameCtrl?.enable();
          this.filterRoadsBySubdivision(subdivisionId);

          // Clear previous choices
          this.siteDetailsForm.patchValue({
            locationCategory: null,
            locationSubcategory: null,
            location: null,
            block: null,
            ward: null
          }, { emitEvent: false });

          // Enable Location Category
          this.siteDetailsForm.get('locationCategory')?.enable();

          // Disable dependent fields initially
          locationSubcategoryCtrl?.disable();
          locationCtrl?.disable();
          blockCtrl?.disable();
          wardCtrl?.disable();

        } else {
          policeStationCtrl?.disable();
          this.sitePoliceStations = [];
          this.siteDetailsForm.patchValue({ policeStation: null }, { emitEvent: false });

          roadNameCtrl?.disable();
          this.roadNames = [];
          this.siteDetailsForm.patchValue({ roadName: null }, { emitEvent: false });

          locationSubcategoryCtrl?.disable();
          this.locationSubcategories = [];
          this.siteDetailsForm.patchValue({ locationSubcategory: null }, { emitEvent: false });

          locationCtrl?.disable();
          this.locations = [];
          this.siteDetailsForm.patchValue({ location: null }, { emitEvent: false });

          blockCtrl?.disable();
          this.blocks = [];
          this.siteDetailsForm.patchValue({ block: null }, { emitEvent: false });

          wardCtrl?.disable();
          this.wards = [];
          this.siteDetailsForm.patchValue({ ward: null }, { emitEvent: false });
        }
      });

    // Location Category change handler
    this.siteDetailsForm.get('locationCategory')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(categoryId => {
        console.log('📂 Location Category changed to:', categoryId);
        const locationSubcategoryCtrl = this.siteDetailsForm.get('locationSubcategory');
        const locationCtrl = this.siteDetailsForm.get('location');
        const blockCtrl = this.siteDetailsForm.get('block');
        const wardCtrl = this.siteDetailsForm.get('ward');
        
        if (categoryId) {
          const category = this.locationCategories.find(c => c.id === categoryId);
          const isRural = category ? !!category.isRural : false;
          
          this.updateValidatorsBasedOnSubdivision(isRural);

          // Clear lower-level choices
          this.siteDetailsForm.patchValue({
            locationSubcategory: null,
            location: null,
            block: null,
            ward: null
          }, { emitEvent: false });

          // Enable Location Subcategory
          locationSubcategoryCtrl?.enable();
          this.filterLocationSubcategories(categoryId);

          // Disable downstream controls initially until subcategory is selected
          locationCtrl?.disable();
          blockCtrl?.disable();
          wardCtrl?.disable();
        } else {
          locationSubcategoryCtrl?.disable();
          this.locationSubcategories = [];
          this.siteDetailsForm.patchValue({ locationSubcategory: null }, { emitEvent: false });

          locationCtrl?.disable();
          this.locations = [];
          this.siteDetailsForm.patchValue({ location: null }, { emitEvent: false });

          blockCtrl?.disable();
          this.blocks = [];
          this.siteDetailsForm.patchValue({ block: null }, { emitEvent: false });

          wardCtrl?.disable();
          this.wards = [];
          this.siteDetailsForm.patchValue({ ward: null }, { emitEvent: false });
        }
      });

    // Location Subcategory change handler
    this.siteDetailsForm.get('locationSubcategory')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(subcategoryId => {
        console.log('📂 Location Subcategory changed to:', subcategoryId);
        const categoryId = this.siteDetailsForm.get('locationCategory')?.value;
        const category = this.locationCategories.find(c => c.id === categoryId);
        const isRural = category ? !!category.isRural : false;

        const subdivisionId = this.siteDetailsForm.get('siteSubdivision')?.value;
        const subdivision = this.allSubdivisions.find(s => s.id === subdivisionId);
        const locationCtrl = this.siteDetailsForm.get('location');
        const blockCtrl = this.siteDetailsForm.get('block');

        if (subcategoryId) {
          const subcat = this.allLocationSubcategories.find(s => s.id === subcategoryId);
          if (subcat) {
            // Auto-set the Category!
            this.siteDetailsForm.patchValue({ locationCategory: subcat.categoryId }, { emitEvent: false });
          }

          if (isRural) {
            blockCtrl?.enable();
            this.filterBlocks(subcategoryId);
          } else {
            locationCtrl?.enable();
            if (subdivision) {
              const parentDistrict = this.districts.find(d => d.districtCode === subdivision.districtCode);
              if (parentDistrict?.id != null) {
                this.filterLocations(parentDistrict.id);
              }
            }
          }
        } else {
          if (isRural) {
            blockCtrl?.disable();
            this.blocks = [];
            this.siteDetailsForm.patchValue({ block: null }, { emitEvent: false });
          } else {
            locationCtrl?.disable();
            this.locations = [];
            this.siteDetailsForm.patchValue({ location: null }, { emitEvent: false });
          }
        }
      });

    // Block change handler
    this.siteDetailsForm.get('block')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(blockId => {
        console.log('🧱 Block changed to:', blockId);
        const wardCtrl = this.siteDetailsForm.get('ward');

        if (blockId) {
          wardCtrl?.enable();
          this.filterRuralWards(blockId);
        } else {
          wardCtrl?.disable();
          this.wards = [];
          this.siteDetailsForm.patchValue({ ward: null }, { emitEvent: false });
        }
      });

    // ✅ EXISTING: Location change handler (Urban only)
    this.siteDetailsForm.get('location')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(locationId => {
        console.log('📍 Location changed to:', locationId);
        const wardCtrl = this.siteDetailsForm.get('ward');
        
        if (locationId) {
          wardCtrl?.enable();
          this.filterWards(locationId);
        } else {
          wardCtrl?.disable();
          this.wards = [];
          this.siteDetailsForm.patchValue({ ward: null }, { emitEvent: false });
        }
      });

    // ✅ Auto-fill from user profile
    this.autoFillFromUserProfile();
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

  private setupConditionalValidation() {
    const siteOwnedControl = this.siteDetailsForm.get('siteOwned');
    const nocControl = this.siteDetailsForm.get('nocObtained');
    const tradeLicenseCoveredControl = this.siteDetailsForm.get('tradeLicenseCovered');

    siteOwnedControl?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        const parchaDocument = this.documents.find((document) => document.name === 'parcha');
        const nocDocument = this.documents.find((document) => document.name === 'noc');

        if (parchaDocument) {
          parchaDocument.required = value === 'Yes';
        }

        if (value === 'Yes') {
          nocControl?.clearValidators();
          nocControl?.setValue(null, { emitEvent: false });
          if (nocDocument) {
            nocDocument.required = false;
          }
          this.clearDocumentSelection('noc');
        } else if (value === 'No') {
          nocControl?.setValidators([Validators.required, Validators.pattern(/^Yes$/)]);
          this.clearDocumentSelection('parcha');
        } else {
          nocControl?.clearValidators();
          nocControl?.setValue(null, { emitEvent: false });
          if (nocDocument) {
            nocDocument.required = false;
          }
          this.clearDocumentSelection('parcha');
          this.clearDocumentSelection('noc');
        }

        nocControl?.updateValueAndValidity({ emitEvent: false });
        this.saveToSessionStorage();
        this.cdr.detectChanges();
      });

    nocControl?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        const nocDocument = this.documents.find((document) => document.name === 'noc');

        if (nocDocument) {
          nocDocument.required = siteOwnedControl?.value === 'No' && value === 'Yes';
        }

        if (value !== 'Yes') {
          this.clearDocumentSelection('noc');
        }

        this.saveToSessionStorage();
        this.cdr.detectChanges();
      });

    tradeLicenseCoveredControl?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        const tradeLicenseDocument = this.documents.find((document) => document.name === 'trade_license');

        if (tradeLicenseDocument) {
          tradeLicenseDocument.required = value === 'Yes';
        }

        if (value !== 'Yes') {
          this.clearDocumentSelection('trade_license');
        }

        this.saveToSessionStorage();
        this.cdr.detectChanges();
      });

    const currentSiteOwnedValue = siteOwnedControl?.value;
    const currentTradeLicenseValue = tradeLicenseCoveredControl?.value;
    const parchaDocument = this.documents.find((document) => document.name === 'parcha');
    const nocDocument = this.documents.find((document) => document.name === 'noc');
    const tradeLicenseDocument = this.documents.find((document) => document.name === 'trade_license');

    if (parchaDocument) {
      parchaDocument.required = currentSiteOwnedValue === 'Yes';
    }
    if (nocDocument) {
      nocDocument.required = currentSiteOwnedValue === 'No' && nocControl?.value === 'Yes';
    }
    if (tradeLicenseDocument) {
      tradeLicenseDocument.required = currentTradeLicenseValue === 'Yes';
    }

    if (currentSiteOwnedValue === 'Yes') {
      nocControl?.clearValidators();
      nocControl?.setValue(null, { emitEvent: false });
    } else if (currentSiteOwnedValue === 'No') {
      nocControl?.setValidators([Validators.required, Validators.pattern(/^Yes$/)]);
    }

    nocControl?.updateValueAndValidity({ emitEvent: false });
  }

  /**
   * ✅ FIXED: Auto-fill site details from logged-in user profile
   * No more TypeScript errors!
   */
  private autoFillFromUserProfile(): void {
    const sessionData = sessionStorage.getItem('siteDetailsData');
    if (sessionData) {
      console.log('📋 Site details already in session, skipping auto-fill');
      return;
    }

    let userProfile = this.accountService.getUserProfileSync();
    
    if (!userProfile) {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        try {
          userProfile = JSON.parse(storedUser);
          console.log('✅ User profile loaded from localStorage for site details');
        } catch (e) {
          console.error('❌ Failed to parse stored user profile:', e);
          return;
        }
      }
    }

    if (!userProfile) {
      console.log('ℹ️ No user profile available for auto-fill');
      return;
    }

    const fillData: any = {};
    
    // ✅ FIXED: Safe property access - address
    if (!this.siteDetailsForm.get('businessAddress')?.value && userProfile.address) {
      fillData.businessAddress = userProfile.address;
    }
    
    // ✅ FIXED: Safe property access - pinCode with type assertion
    if (!this.siteDetailsForm.get('pinCode')?.value) {
      const possiblePinCode = (userProfile as any).pinCode 
                           || (userProfile as any).pin_code 
                           || (userProfile as any).zipCode 
                           || (userProfile as any).postalCode;
      
      if (possiblePinCode) {
        fillData.pinCode = possiblePinCode;
      }
    }

    if (Object.keys(fillData).length > 0) {
      console.log('🔄 Auto-filling site details from user profile:', fillData);
      this.siteDetailsForm.patchValue(fillData, { emitEvent: false });
    }
  }

  /**
   * ✅ Load all master data including new 3 tables
   */
  private loadMasterData(): void {
    console.log('📡 Loading master data...');
    
    // Load existing data
    this.loadDistricts();
    this.loadSubdivisions();
    this.loadPoliceStations();
    this.loadRoads();
    
    // ✅ NEW: Load data for 3 new tables
    this.loadLocationCategories();
    this.loadLocationSubcategories();
    this.loadLocations();
    this.loadWards();
    this.loadBlocks();
    this.loadRuralWards();
  }

  // =========================================================================
  // EXISTING DATA LOADERS
  // =========================================================================

  private loadDistricts(): void {
    this.masterService.getDistricts().subscribe({
      next: (data: District[]) => {
        this.districts = data;
        // ✅ FIX: Cache in sessionStorage so prepareNewLicenseFormData() can look up codes at submission time
        sessionStorage.setItem('districts', JSON.stringify(data));
        console.log('✅ Districts loaded:', this.districts.length);
        this.restoreAllFromSession();
      },
      error: (err) => console.error('❌ Failed to load districts:', err)
    });
  }

  private loadSubdivisions(): void {
    this.masterService.getSubdivisions().subscribe({
      next: (data: Subdivision[]) => {
        this.allSubdivisions = data;
        // ✅ FIX: Cache in sessionStorage so prepareNewLicenseFormData() can look up codes at submission time
        sessionStorage.setItem('subdivisions', JSON.stringify(data));
        console.log('✅ Subdivisions loaded:', this.allSubdivisions.length);
        this.restoreAllFromSession();
      },
      error: (err) => console.error('❌ Failed to load subdivisions:', err)
    });
  }

  private loadPoliceStations(): void {
    this.masterService.getPoliceStations().subscribe({
      next: (data: PoliceStation[]) => {
        this.allPoliceStations = data;
        // ✅ FIX: Cache in sessionStorage so prepareNewLicenseFormData() can look up codes at submission time
        sessionStorage.setItem('policeStations', JSON.stringify(data));
        console.log('✅ Police stations loaded:', this.allPoliceStations.length);
        this.restoreAllFromSession();
      },
      error: (err) => console.error('❌ Failed to load police stations:', err)
    });
  }

  private loadRoads(): void {
    this.masterService.getRoads().subscribe({
      next: (data: Road[]) => {
        this.allRoads = data;
        // ✅ FIX: Cache in sessionStorage so prepareNewLicenseFormData() can look up road name at submission time
        sessionStorage.setItem('roads', JSON.stringify(data));
        console.log('✅ Roads loaded:', this.allRoads.length);
        this.restoreAllFromSession();
      },
      error: (err) => console.error('❌ Failed to load roads:', err)
    });
  }

  // =========================================================================
  // ✅ NEW: DATA LOADERS FOR 3 NEW TABLES
  // =========================================================================

  private loadLocationCategories(): void {
    this.masterService.getLocationCategories().subscribe({
      next: (data: any[]) => {
        this.locationCategories = data.map(item => ({
          id: item.id,
          categoryName: item.categoryName || item.category_name,
          description: item.description,
          isActive: item.isActive ?? item.is_active ?? true,
          isRural: item.isRural ?? item.is_rural ?? false,
          status: item.status,
          subcategoryCount: item.subcategoryCount || item.subcategory_count
        }));
        sessionStorage.setItem('locationCategories', JSON.stringify(this.locationCategories));
        console.log('✅ Location Categories loaded:', this.locationCategories.length);
        this.restoreAllFromSession();
      },
      error: (err) => console.error('❌ Failed to load location categories:', err)
    });
  }

  private loadLocationSubcategories(): void {
    this.masterService.getLocationSubcategories().subscribe({
      next: (data: any[]) => {
        this.allLocationSubcategories = data.map(item => ({
          id: item.id,
          subcategoryName: item.subcategoryName || item.subcategory_name,
          categoryId: item.categoryId || item.category_id || item.category,
          categoryName: item.categoryName || item.category_name,
          description: item.description,
          isActive: item.isActive ?? item.is_active ?? true,
          status: item.status,
          subDivision: item.subDivision || item.sub_division
        }));
        sessionStorage.setItem('locationSubcategories', JSON.stringify(this.allLocationSubcategories));
        console.log('✅ Location Subcategories loaded:', this.allLocationSubcategories.length);
        this.restoreAllFromSession();
      },
      error: (err) => console.error('❌ Failed to load location subcategories:', err)
    });
  }

  private loadLocations(): void {
    this.masterService.getLocations().subscribe({
      next: (data: any[]) => {
        this.allLocations = data.map(item => ({
          id: item.id,
          locationCode: item.locationCode || item.location_code,
          locationDescription: item.locationDescription || item.location_description,
          districtCode: item.districtCode || item.district_code || item.district,
          isActive: item.isActive ?? item.is_active ?? true
        }));
        sessionStorage.setItem('locations', JSON.stringify(this.allLocations));
        console.log('✅ Locations loaded:', this.allLocations.length);
        this.restoreAllFromSession();
      },
      error: (err) => console.error('❌ Failed to load locations:', err)
    });
  }

  private loadBlocks(): void {
    this.masterService.getBlocks().subscribe({
      next: (data: any[]) => {
        this.allBlocks = data.map(item => ({
          id: item.id,
          blockName: item.blockName || item.block_name,
          subcategory: item.subcategory,
          subcategoryName: item.subcategoryName || item.subcategory_name,
          isActive: item.isActive || item.is_active
        }));
        sessionStorage.setItem('blocks', JSON.stringify(this.allBlocks));
        console.log('✅ Blocks loaded:', this.allBlocks.length);
        this.restoreAllFromSession();
      },
      error: (err) => console.error('❌ Failed to load blocks:', err)
    });
  }

  private loadRuralWards(): void {
    this.masterService.getRuralWards().subscribe({
      next: (data: any[]) => {
        this.allRuralWards = data.map(item => ({
          id: item.id,
          wardName: item.wardName || item.ward_name,
          wardNumber: item.wardNumber || item.ward_number,
          block: item.block,
          blockName: item.blockName || item.block_name,
          isActive: item.isActive || item.is_active
        }));
        sessionStorage.setItem('ruralWards', JSON.stringify(this.allRuralWards));
        console.log('✅ Rural Wards loaded:', this.allRuralWards.length);
        this.restoreAllFromSession();
      },
      error: (err) => console.error('❌ Failed to load rural wards:', err)
    });
  }

  // =========================================================================
  // RESTORE FUNCTIONS
  // =========================================================================

  private restoreAllFromSession(): void {
    // Only run once all 10 data arrays are populated
    if (
      this.districts.length === 0 ||
      this.allSubdivisions.length === 0 ||
      this.allPoliceStations.length === 0 ||
      this.allRoads.length === 0 ||
      this.locationCategories.length === 0 ||
      this.allLocationSubcategories.length === 0 ||
      this.allLocations.length === 0 ||
      this.allWards.length === 0 ||
      this.allBlocks.length === 0 ||
      this.allRuralWards.length === 0
    ) {
      return; // More loaders still pending — one of them will call us again
    }

    const stored = this.getFromSessionStorage();
    if (!stored || Object.keys(stored).length === 0) return;

    console.log('🔄 All master data ready — running full session restore cascade');

    // Step 1: District → filter subdivisions only
    const districtId = stored.district;
    if (districtId && this.districts.some(d => d.id === districtId)) {
      this.siteDetailsForm.get('siteDistrict')?.setValue(districtId, { emitEvent: false });
      this.filterSubdivisions(districtId);
      this.siteDetailsForm.get('siteSubdivision')?.enable();
    }

    // Step 2: Subdivision → filter police stations, roads
    const subdivisionId = stored.subdivision;
    if (subdivisionId && this.siteSubdivisions.some(s => s.id === subdivisionId)) {
      this.siteDetailsForm.get('siteSubdivision')?.setValue(subdivisionId, { emitEvent: false });
      this.filterPoliceStations(subdivisionId);
      this.filterRoadsBySubdivision(subdivisionId);
      
      this.siteDetailsForm.get('policeStation')?.enable();
      this.siteDetailsForm.get('roadName')?.enable();
    }

    // Step 3: Police Station
    const policeStationId = stored.police_station;
    if (policeStationId && this.sitePoliceStations.some(p => p.id === policeStationId)) {
      this.siteDetailsForm.get('policeStation')?.setValue(policeStationId, { emitEvent: false });
    }

    // Step 4: Road
    const roadId = stored.road;
    if (roadId && this.roadNames.some(r => r.id === roadId)) {
      this.siteDetailsForm.get('roadName')?.setValue(roadId, { emitEvent: false });
    }

    // Step 5: Location Category
    const locationCategoryId = stored.location_category;
    let isRural = false;
    if (locationCategoryId && this.locationCategories.some(c => c.id === locationCategoryId)) {
      this.siteDetailsForm.get('locationCategory')?.setValue(locationCategoryId, { emitEvent: false });
      this.siteDetailsForm.get('locationCategory')?.enable();

      const category = this.locationCategories.find(c => c.id === locationCategoryId);
      isRural = category ? !!category.isRural : false;
      this.updateValidatorsBasedOnSubdivision(isRural);

      this.siteDetailsForm.get('locationSubcategory')?.enable();
      this.filterLocationSubcategories(locationCategoryId);
    }

    // Step 6: Location Subcategory
    const locationSubcategoryId = stored.location_subcategory;
    if (locationSubcategoryId && this.locationSubcategories.some(s => s.id === locationSubcategoryId)) {
      this.siteDetailsForm.get('locationSubcategory')?.setValue(locationSubcategoryId, { emitEvent: false });
      
      const subcat = this.allLocationSubcategories.find(s => s.id === locationSubcategoryId);
      if (subcat && !locationCategoryId) {
        this.siteDetailsForm.patchValue({ locationCategory: subcat.categoryId }, { emitEvent: false });
      }

      if (isRural) {
        this.filterBlocks(locationSubcategoryId);
        this.siteDetailsForm.get('block')?.enable();
      } else {
        const subdivision = this.allSubdivisions.find(s => s.id === subdivisionId);
        if (subdivision) {
          const parentDistrict = this.districts.find(d => d.districtCode === subdivision.districtCode);
          if (parentDistrict?.id != null) {
            this.filterLocations(parentDistrict.id);
            this.siteDetailsForm.get('location')?.enable();
          }
        }
      }
    }

    if (isRural) {
      // Step 7 Rural: Block → filter rural wards
      const blockId = stored.block;
      if (blockId && this.blocks.some(b => b.id === blockId)) {
        this.siteDetailsForm.get('block')?.setValue(blockId, { emitEvent: false });
        this.filterRuralWards(blockId);
        this.siteDetailsForm.get('ward')?.enable();
      }
    } else {
      // Step 7 Urban: Location → filter wards
      const locationId = stored.location;
      if (locationId && this.locations.some(l => l.id === locationId)) {
        this.siteDetailsForm.get('location')?.setValue(locationId, { emitEvent: false });
        this.filterWards(locationId);
        this.siteDetailsForm.get('ward')?.enable();
      }
    }

    // Step 8: Ward (shared control)
    const wardId = stored.ward;
    if (wardId && this.wards.some(w => w.id === wardId)) {
      this.siteDetailsForm.get('ward')?.setValue(wardId, { emitEvent: false });
    }

    this.cdr.detectChanges();
    console.log('✅ Full session restore complete');
  }

  // =========================================================================
  // FILTER FUNCTIONS
  // =========================================================================

  onDistrictChange(districtId: number): void {
    if (!districtId) return;
    
    this.filterSubdivisions(districtId);
    this.filterLocations(districtId);
    
    // Reset subdivision-dependent dropdowns (location is subdivision-dependent too)
    this.siteDetailsForm.patchValue({ 
      siteSubdivision: null, 
      policeStation: null,
      roadName: null,
      location: null,
      ward: null
    }, { emitEvent: false });

    // Disable until subdivision is selected
    this.siteDetailsForm.get('policeStation')?.disable();
    this.siteDetailsForm.get('roadName')?.disable();
    this.siteDetailsForm.get('location')?.disable(); // ✅ Location Name disabled until subdivision chosen
    this.siteDetailsForm.get('ward')?.disable();
    this.roadNames = [];
    this.wards = [];
    this.locations = [];
  }

  private filterSubdivisions(districtId: number): void {
    console.log('🔍 filterSubdivisions called with districtId:', districtId);
    const district = this.districts.find(d => d.id === districtId);
    if (!district) {
      console.warn('⚠️ District not found for ID:', districtId);
      this.siteSubdivisions = [];
      return;
    }

    this.siteSubdivisions = this.allSubdivisions.filter(s => s.districtCode === district.districtCode);
    console.log('✅ Filtered subdivisions:', this.siteSubdivisions.length);

    const current = this.siteDetailsForm.get('siteSubdivision')?.value;
    if (current && !this.siteSubdivisions.some(s => s.id === current)) {
      this.siteDetailsForm.patchValue({ siteSubdivision: null }, { emitEvent: false });
    }
    this.cdr.detectChanges();
  }

  // ✅ UPDATED: Filter roads by subdivision (via subdivision's districtCode)
  private filterRoadsBySubdivision(subdivisionId: number): void {
    const subdivision = this.allSubdivisions.find(s => s.id === subdivisionId);
    if (!subdivision) {
      this.roadNames = [];
      return;
    }
    // Roads are linked to district; use subdivision's districtCode to find the parent district id
    const parentDistrict = this.districts.find(
      d => d.districtCode === subdivision.districtCode
    );
    if (!parentDistrict?.id) {
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
      return roadDistrictId === parentDistrict!.id;
    });
    const current = this.siteDetailsForm.get('roadName')?.value;
    if (current && !this.roadNames.some(r => r.id === current)) {
      this.siteDetailsForm.patchValue({ roadName: null }, { emitEvent: false });
    }
    console.log('✅ Filtered roads by subdivision:', this.roadNames.length);
    this.cdr.detectChanges();
  }

  // ✅ UPDATED: Filter wards by subdivision (via subdivision's districtCode → locations)
  private filterWardsBySubdivision(subdivisionId: number): void {
    const subdivision = this.allSubdivisions.find(s => s.id === subdivisionId);
    if (!subdivision) {
      this.wards = [];
      return;
    }
    // Find all locations in the same district as this subdivision
    const locationCodesInDistrict = this.allLocations
      .filter(l => l.districtCode === subdivision.districtCode)
      .map(l => l.locationCode);

    this.wards = this.allWards.filter(
      ward => locationCodesInDistrict.includes(ward.locationCode)
    );
    const current = this.siteDetailsForm.get('ward')?.value;
    if (current && !this.wards.some(w => w.id === current)) {
      this.siteDetailsForm.patchValue({ ward: null }, { emitEvent: false });
    }
    console.log('✅ Filtered wards by subdivision:', this.wards.length);
    this.cdr.detectChanges();
  }

  // Keep old filterRoads for any remaining internal use (e.g. restore)
  private filterRoads(districtId: number): void {
    if (!districtId) { this.roadNames = []; return; }
    const selectedDistrict = this.districts.find(d => d.id === districtId);
    if (!selectedDistrict) { this.roadNames = []; return; }
    this.roadNames = this.allRoads.filter(road => {
      let roadDistrictId: number | undefined;
      if ((road as any).districtId !== undefined) roadDistrictId = (road as any).districtId;
      else if (typeof road.district === 'number') roadDistrictId = road.district;
      else if (road.district && typeof road.district === 'object') roadDistrictId = (road.district as District).id;
      else if ((road as any).district_id !== undefined) roadDistrictId = (road as any).district_id;
      return roadDistrictId === districtId;
    });
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

  private loadWards(): void {
    this.masterService.getWards().subscribe({
      next: (data: any[]) => {
        this.allWards = data.map(item => ({
          id: item.id,
          wardName: item.wardName || item.ward_name,
          wardNumber: item.wardNumber || item.ward_number,
          locationCode: item.locationCode || item.location_code,
          isActive: item.isActive || item.is_active
        }));
        sessionStorage.setItem('wards', JSON.stringify(this.allWards));
        console.log('✅ Wards loaded:', this.allWards.length);
        this.restoreAllFromSession();
      },
      error: (err) => console.error('❌ Failed to load wards:', err)
    });
  }

  private filterLocationSubcategoriesBySubdivision(subdivisionId: number): void {
    console.log('🔍 Filtering location subcategories for subdivision:', subdivisionId);
    this.locationSubcategories = this.allLocationSubcategories.filter(
      sub => sub.subDivision === subdivisionId
    );
    console.log('✅ Filtered location subcategories by subdivision:', this.locationSubcategories.length);
    const current = this.siteDetailsForm.get('locationSubcategory')?.value;
    if (current && !this.locationSubcategories.some(s => s.id === current)) {
      this.siteDetailsForm.patchValue({ locationSubcategory: null }, { emitEvent: false });
    }
    this.cdr.detectChanges();
  }

  private filterBlocks(subcategoryId: number): void {
    console.log('🔍 Filtering blocks for subcategory:', subcategoryId);
    this.blocks = this.allBlocks.filter(
      b => b.subcategory === subcategoryId
    );
    console.log('✅ Filtered blocks:', this.blocks.length);
    const current = this.siteDetailsForm.get('block')?.value;
    if (current && !this.blocks.some(b => b.id === current)) {
      this.siteDetailsForm.patchValue({ block: null, ward: null }, { emitEvent: false });
    }
    this.cdr.detectChanges();
  }

  private filterRuralWards(blockId: number): void {
    console.log('🔍 Filtering rural wards for block:', blockId);
    this.wards = this.allRuralWards.filter(
      w => w.block === blockId
    );
    console.log('✅ Filtered rural wards:', this.wards.length);
    const current = this.siteDetailsForm.get('ward')?.value;
    if (current && !this.wards.some(w => w.id === current)) {
      this.siteDetailsForm.patchValue({ ward: null }, { emitEvent: false });
    }
    this.cdr.detectChanges();
  }

  private updateValidatorsBasedOnSubdivision(isRural: boolean): void {
    const locationCategoryCtrl = this.siteDetailsForm.get('locationCategory');
    const locationCtrl = this.siteDetailsForm.get('location');
    const blockCtrl = this.siteDetailsForm.get('block');

    locationCategoryCtrl?.setValidators([Validators.required]);

    if (isRural) {
      locationCtrl?.clearValidators();
      blockCtrl?.setValidators([Validators.required]);
    } else {
      locationCtrl?.setValidators([Validators.required]);
      blockCtrl?.clearValidators();
    }

    locationCategoryCtrl?.updateValueAndValidity({ emitEvent: false });
    locationCtrl?.updateValueAndValidity({ emitEvent: false });
    blockCtrl?.updateValueAndValidity({ emitEvent: false });
  }

  // ✅ NEW: Filter location subcategories by category
  private filterLocationSubcategories(categoryId: number): void {
    console.log('🔍 Filtering location subcategories for category:', categoryId);
    this.locationSubcategories = this.allLocationSubcategories.filter(
      sub => sub.categoryId === categoryId
    );
    console.log('✅ Filtered location subcategories:', this.locationSubcategories.length);
    
    const current = this.siteDetailsForm.get('locationSubcategory')?.value;
    if (current && !this.locationSubcategories.some(s => s.id === current)) {
      this.siteDetailsForm.patchValue({ locationSubcategory: null }, { emitEvent: false });
    }
    this.cdr.detectChanges();
  }

  // ✅ NEW: Filter locations by district
  private filterLocations(districtId: number): void {
    console.log('🔍 Filtering locations for district:', districtId);
    const district = this.districts.find(d => d.id === districtId);
    if (!district) {
      this.locations = [];
      return;
    }
    
    this.locations = this.allLocations.filter(
      loc => loc.districtCode === district.districtCode
    );
    console.log('✅ Filtered locations:', this.locations.length);
    
    const current = this.siteDetailsForm.get('location')?.value;
    if (current && !this.locations.some(l => l.id === current)) {
      this.siteDetailsForm.patchValue({ location: null, ward: null }, { emitEvent: false });
    }
    this.cdr.detectChanges();
  }

  // ✅ NEW: Filter wards by location
  private filterWards(locationId: number): void {
    console.log('🔍 Filtering wards for location:', locationId);
    const location = this.allLocations.find(l => l.id === locationId);
    if (!location) {
      this.wards = [];
      return;
    }
    
    this.wards = this.allWards.filter(
      ward => ward.locationCode === location.locationCode
    );
    console.log('✅ Filtered wards:', this.wards.length);
    
    const current = this.siteDetailsForm.get('ward')?.value;
    if (current && !this.wards.some(w => w.id === current)) {
      this.siteDetailsForm.patchValue({ ward: null }, { emitEvent: false });
    }
    this.cdr.detectChanges();
  }

  // =========================================================================
  // DOCUMENT HANDLING
  // =========================================================================

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
    this.saveToSessionStorage();
    this.cdr.detectChanges();
  }

  private clearDocumentSelection(docName: string) {
    const document = this.documents.find(doc => doc.name === docName);
    if (!document) {
      return;
    }

    if (document.fileUrl) {
      URL.revokeObjectURL(document.fileUrl);
    }

    document.file = null;
    document.fileUrl = '';
    this.licenseApplicationService.removeSiteDocument(docName);
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

  // =========================================================================
  // SESSION STORAGE
  // =========================================================================

  private saveToSessionStorage() {
    const formData: any = this.siteDetailsForm.getRawValue();
    
    const backendData: any = {
      district: formData.siteDistrict || null,
      subdivision: formData.siteSubdivision || null,
      police_station: formData.policeStation || null,
      road: formData.roadName || null,
      address: formData.businessAddress || null,
      
      // ✅ Save IDs for 3 new tables
      location_category: formData.locationCategory || null,
      location_category_name: this.getLocationCategoryDisplayName(formData.locationCategory),
      location_subcategory: formData.locationSubcategory || null,
      location_subcategory_name: this.getLocationSubcategoryDisplayName(formData.locationSubcategory),
      location: formData.location || null,
      block: formData.block || null,
      block_name: this.getBlockDisplayName(formData.block),
      ward: formData.ward || null,

      // ✅ FIXED: Also save display names so the service & declaration page can use them
      location_name: this.getLocationDisplayName(formData.location),
      ward_name: this.getWardDisplayName(formData.ward),
      
      pin_code: formData.pinCode ? String(formData.pinCode) : null,
      construction_type: formData.constructionType || null,
      length: formData.length || null,
      breadth: formData.breadth || null,
      site_owned: formData.siteOwned || null,
      trade_license_covered: this.hideTradeLicense ? null : (formData.tradeLicenseCovered || null),
      noc_obtained: formData.siteOwned === 'No' ? formData.nocObtained || null : null,
      parcha: this.getDocumentReference('parcha'),
      noc: this.getDocumentReference('noc'),
      trade_license: this.getDocumentReference('trade_license')
    };
    
    console.log('💾 Saving Site Details:', backendData);
    sessionStorage.setItem('siteDetailsData', JSON.stringify(backendData));
  }

  private getFromSessionStorage(): any {
    const storedData = sessionStorage.getItem('siteDetailsData');
    if (!storedData) return {};
    return JSON.parse(storedData);
  }

  // ✅ Helper to get block display name from loaded array
  private getBlockDisplayName(blockId: number | null): string | null {
    if (!blockId) return null;
    const block = this.allBlocks.find(b => b.id === blockId);
    return block?.blockName || null;
  }

  // ✅ FIXED: Helper to get location display name from loaded array
  private getLocationDisplayName(locationId: number | null): string | null {
    if (!locationId) return null;
    const location = this.allLocations.find(l => l.id === locationId);
    return location?.locationDescription || null;
  }

  // ✅ FIXED: Helper to get ward display name from loaded array (searches both urban and rural)
  private getWardDisplayName(wardId: number | null): string | null {
    if (!wardId) return null;
    const ward = this.wards.find(w => w.id === wardId) || 
                 this.allWards.find(w => w.id === wardId) || 
                 this.allRuralWards.find(w => w.id === wardId);
    return ward?.wardName || null;
  }

  // ✅ FIXED: Helper to get location category name (backend expects string, not ID)
  private getLocationCategoryDisplayName(categoryId: number | null): string | null {
    if (!categoryId) return null;
    const cat = this.locationCategories.find(c => c.id === categoryId);
    return cat?.categoryName || null;
  }

  private getLocationSubcategoryDisplayName(subcategoryId: number | null): string | null {
    if (!subcategoryId) return null;
    const subcategory = this.allLocationSubcategories.find(s => s.id === subcategoryId);
    return subcategory?.subcategoryName || null;
  }

  private getDocumentReference(docName: string): string | null {
    const document = this.documents.find(doc => doc.name === docName);
    return document?.file?.name ?? null;
  }

  // =========================================================================
  // ERROR MESSAGES
  // =========================================================================

  private updateErrorMessage(field: keyof typeof this.errorMessages) {
    const control = this.siteDetailsForm.get(field);
    if (control?.hasError('required')) {
      this.errorMessages[field].set('This field is required');
    } else if (control?.hasError('pattern')) {
      if (field === 'pinCode') {
        this.errorMessages[field].set('PIN Code must be a 6-digit number');
      } else if (field === 'nocObtained') {
        this.errorMessages[field].set('NOC must be obtained to proceed');
      } else if (field === 'tradeLicenseCovered') {
        this.errorMessages[field].set('Trade License must cover the proposed shop to proceed');
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

  // =========================================================================
  // NAVIGATION
  // =========================================================================

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
