import { Component, EventEmitter, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MasterService } from '../../../../../../core/services/master.service';
import { BrandWarehouseService } from '../../../../supplyChain/services/brand-warehouse.service';
import { MaterialModule } from '../../../../../../shared/material.module';

type LiquorBrandSize = { brandName: string; sizes: number[]; manufacturingUnit?: string };

@Component({
  selector: 'app-label-registration-product-details',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.scss'
})
export class LabelRegistrationProductDetailsComponent implements OnInit, OnDestroy {
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  productForm: FormGroup;
  private destroy$ = new Subject<void>();

  countries: string[] = ['India', 'Nepal', 'Bhutan', 'China'];
  private readonly fallbackStates: string[] = ['Sikkim', 'West Bengal', 'Bihar', 'Assam'];
  states: string[] = [...this.fallbackStates];
  bottlers: string[] = [];
  brandTypes: string[] = [];

  brandOwnerTypes: string[] = [
    'Manufactured in Sikkim',
    'Imported from other States/Country',
    'Bottled in Sikkim (Collaboration)'
  ];

  strengthUnits: string[] = ['% ABV', 'Proof'];

  brandOwners: string[] = [];
  brands: LiquorBrandSize[] = [];

  isLoadingBottlers = false;
  isLoadingBrandOwners = false;
  isLoadingBrandTypes = false;
  isLoadingBrands = false;
  bottlersError = '';
  brandOwnersError = '';
  brandTypesError = '';
  brandsError = '';

  errorMessages = {
    bottlerOrigin: signal(''),
    bottlerState: signal(''),
    bottlerName: signal(''),
    bottlerAddress: signal(''),
    brandOwnerType: signal(''),
    brandOwnerCode: signal(''),
    brandOwnerName: signal(''),
    brandOwnerAddress: signal(''),
    liquorKind: signal(''),
    liquorType: signal(''),
    brandCode: signal(''),
    brandName: signal(''),
    allowedStrength: signal(''),
    strengthValue: signal(''),
    strengthUnit: signal('')
  };

  constructor(
    private fb: FormBuilder,
    private masterService: MasterService,
    private brandWarehouseService: BrandWarehouseService
  ) {
    const storedValues = this.getFromSessionStorage();

    this.productForm = this.fb.group({
      // Manufacturer
      bottlerOrigin: new FormControl(storedValues.bottlerOrigin || '', [Validators.required]),
      bottlerState: new FormControl(storedValues.bottlerState || ''),
      bottlerName: new FormControl(storedValues.bottlerName || '', [Validators.required]),
      bottlerAddress: new FormControl(storedValues.bottlerAddress || '', [Validators.required, Validators.maxLength(500)]),

      // Brand owner
      brandOwnerType: new FormControl(storedValues.brandOwnerType || '', [Validators.required]),
      brandOwnerCode: new FormControl(storedValues.brandOwnerCode || '', [Validators.required]),
      brandOwnerName: new FormControl(storedValues.brandOwnerName || '', [Validators.required]),
      brandOwnerAddress: new FormControl(storedValues.brandOwnerAddress || '', [Validators.required, Validators.maxLength(800)]),

      // Brand
      liquorKind: new FormControl(storedValues.liquorKind || '', [Validators.required]),
      liquorType: new FormControl(storedValues.liquorType || '', [Validators.required]),
      brandCode: new FormControl(storedValues.brandCode || '', [Validators.required]),
      brandName: new FormControl(storedValues.brandName || '', [Validators.required]),

      // Strength
      allowedStrength: new FormControl(storedValues.allowedStrength ?? '', [Validators.required, Validators.min(0), Validators.max(100)]),
      strengthValue: new FormControl(storedValues.strengthValue ?? '', [Validators.required, Validators.min(0), Validators.max(100)]),
      strengthUnit: new FormControl(storedValues.strengthUnit || '% ABV', [Validators.required])
    });

    this.productForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.saveToSessionStorage();
      this.updateAllErrorMessages();
    });

    this.productForm
      .get('brandOwnerCode')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((code) => this.handleBrandOwnerSelection(code));

    this.productForm
      .get('bottlerName')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => this.handleBottlerSelection(value));

    this.productForm
      .get('liquorKind')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => this.handleLiquorKindSelection(value));

    this.productForm
      .get('brandCode')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((code) => this.handleBrandSelection(code));
  }

  ngOnInit(): void {
    this.loadStates();
    this.loadBottlers();
    this.refreshBrandWarehouseDependencies();
    this.handleBrandOwnerSelection(this.productForm.get('brandOwnerCode')?.value);
    this.handleBrandSelection(this.productForm.get('brandCode')?.value);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isManualBrandOwner(): boolean {
    return this.productForm.get('brandOwnerCode')?.value === 'MANUAL';
  }

  get isManualBrand(): boolean {
    return this.productForm.get('brandCode')?.value === 'MANUAL';
  }

  private getFromSessionStorage(): any {
    const storedData = sessionStorage.getItem('labelRegProductDetails');
    return storedData ? JSON.parse(storedData) : {};
  }

  private saveToSessionStorage(): void {
    sessionStorage.setItem('labelRegProductDetails', JSON.stringify(this.productForm.getRawValue()));
  }

  private loadBottlers(): void {
    this.isLoadingBottlers = true;
    this.bottlersError = '';

    this.brandWarehouseService
      .getBrandWarehouses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows: any) => {
          const items = Array.isArray(rows) ? rows : [];
          const values = items
            .map((item: any) => this.getDistilleryName(item))
            .filter(Boolean);
          this.bottlers = this.uniqueValues(values);
          this.isLoadingBottlers = false;
        },
        error: (error: any) => {
          console.error('Failed to load bottlers from brand warehouse:', error);
          this.bottlers = [];
          this.isLoadingBottlers = false;
          this.bottlersError = 'Unable to load bottlers. Please try again later.';
        }
      });
  }

  private refreshBrandWarehouseDependencies(): void {
    const distillery = String(this.productForm.get('bottlerName')?.value || '').trim();
    if (!distillery) {
      this.brandOwners = [];
      this.brandTypes = [];
      this.brands = [];
      return;
    }

    this.loadBrandOwners(distillery);
    this.loadBrandTypes(distillery);

    const brandType = String(this.productForm.get('liquorKind')?.value || '').trim();
    if (brandType) {
      this.loadBrands(distillery, brandType);
    }
  }

  private loadBrandOwners(distillery: string): void {
    this.isLoadingBrandOwners = true;
    this.brandOwnersError = '';

    this.brandWarehouseService
      .getBrandWarehouses({ distillery_name: distillery })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows: any) => {
          const items = Array.isArray(rows) ? rows : [];
          const owners: string[] = [];
          items.forEach((item: any) => {
            this.getBrandOwnerCandidates(item).forEach((candidate) => {
              const text = this.coalesceText(candidate);
              if (text) {
                owners.push(text);
              }
            });
          });

          const uniqueOwners = this.uniqueValues(owners);
          if (uniqueOwners.length) {
            this.brandOwners = uniqueOwners;
          } else {
            const fallback = items
              .map((item: any) => this.getDistilleryName(item))
              .filter(Boolean);
            this.brandOwners = this.uniqueValues(fallback);
          }
          this.isLoadingBrandOwners = false;

          const code = this.productForm.get('brandOwnerCode')?.value;
          if (code && code !== 'MANUAL') {
            this.applyBrandOwnerFromList(String(code));
          }
        },
        error: (error: any) => {
          console.error('Failed to load brand owners for label registration:', error);
          this.brandOwners = [];
          this.isLoadingBrandOwners = false;
          this.brandOwnersError = 'Unable to load brand owners. You can use manual entry.';
        }
      });
  }

  private handleBrandOwnerSelection(code: unknown): void {
    const selected = String(code || '').trim();
    if (!selected) {
      return;
    }

    if (selected === 'MANUAL') {
      this.productForm.patchValue(
        {
          brandOwnerName: '',
          strengthUnit: this.productForm.get('strengthUnit')?.value || '% ABV'
        },
        { emitEvent: false }
      );
      this.saveToSessionStorage();
      this.updateAllErrorMessages();
      return;
    }

    this.applyBrandOwnerFromList(selected);
  }

  private applyBrandOwnerFromList(brandOwnerCode: string): void {
    const owner = this.brandOwners.find((item) => String(item) === String(brandOwnerCode));
    if (!owner) {
      return;
    }

    this.productForm.patchValue(
      {
        brandOwnerName: owner
      },
      { emitEvent: false }
    );
    this.saveToSessionStorage();
    this.updateAllErrorMessages();
  }

  private loadBrandTypes(distillery: string): void {
    this.isLoadingBrandTypes = true;
    this.brandTypesError = '';
    this.brandTypes = [];

    this.brandWarehouseService
      .getBrandWarehouses({ distillery_name: distillery })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows: any) => {
          const items = Array.isArray(rows) ? rows : [];
          const values = items
            .map((item: any) => this.getBrandType(item))
            .filter(Boolean);
          this.brandTypes = this.uniqueValues(values);
          this.isLoadingBrandTypes = false;
        },
        error: (error: any) => {
          console.error('Failed to load liquor kinds from brand warehouse:', error);
          this.brandTypes = [];
          this.isLoadingBrandTypes = false;
          this.brandTypesError = 'Unable to load liquor kinds. You can enter manually.';
        }
      });
  }

  private loadBrands(distillery: string, brandType: string): void {
    this.isLoadingBrands = true;
    this.brandsError = '';
    this.brands = [];

    this.brandWarehouseService
      .getBrandWarehouses({ distillery_name: distillery, brand_type: brandType })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows: any) => {
          const items = Array.isArray(rows) ? rows : [];
          const grouped = new Map<string, LiquorBrandSize>();

          items.forEach((item: any) => {
            const brandName = this.getBrandName(item);
            if (!brandName) {
              return;
            }

            const key = brandName.toLowerCase();
            const entry = grouped.get(key) || { brandName, sizes: [] };
            const size = Number(
              item?.capacity_size ??
              item?.capacitySize ??
              item?.pack_size ??
              item?.pack_size_ml ??
              item?.capacity
            );
            if (Number.isFinite(size) && size > 0 && !entry.sizes.includes(size)) {
              entry.sizes.push(size);
            }

            if (!entry.manufacturingUnit) {
              entry.manufacturingUnit = this.getDistilleryName(item);
            }

            grouped.set(key, entry);
          });

          this.brands = Array.from(grouped.values());
          this.isLoadingBrands = false;

          const storedBrandCode = this.productForm.get('brandCode')?.value;
          if (storedBrandCode && storedBrandCode !== 'MANUAL') {
            this.applyBrandFromList(String(storedBrandCode));
          }
        },
        error: (error: any) => {
          console.error('Failed to load brands for label registration:', error);
          this.brands = [];
          this.isLoadingBrands = false;
          this.brandsError = 'Unable to load brands. You can use manual entry.';
        }
      });
  }

  private handleBottlerSelection(value: unknown): void {
    const distillery = String(value || '').trim();

    this.productForm.patchValue(
      {
        brandOwnerCode: '',
        brandOwnerName: '',
        liquorKind: '',
        brandCode: '',
        brandName: ''
      },
      { emitEvent: false }
    );
    this.saveToSessionStorage();
    this.updateAllErrorMessages();

    if (!distillery) {
      this.brandOwners = [];
      this.brandTypes = [];
      this.brands = [];
      return;
    }

    this.loadBrandOwners(distillery);
    this.loadBrandTypes(distillery);
  }

  private handleLiquorKindSelection(value: unknown): void {
    const brandType = String(value || '').trim();
    const distillery = String(this.productForm.get('bottlerName')?.value || '').trim();

    this.productForm.patchValue(
      {
        brandCode: '',
        brandName: ''
      },
      { emitEvent: false }
    );
    this.saveToSessionStorage();
    this.updateAllErrorMessages();

    if (!distillery || !brandType) {
      this.brands = [];
      return;
    }

    this.loadBrands(distillery, brandType);
  }

  private handleBrandSelection(code: unknown): void {
    const selected = String(code || '').trim();
    if (!selected) {
      return;
    }

    if (selected === 'MANUAL') {
      this.productForm.patchValue(
        {
          brandName: '',
          strengthUnit: this.productForm.get('strengthUnit')?.value || '% ABV'
        },
        { emitEvent: false }
      );
      this.saveToSessionStorage();
      this.updateAllErrorMessages();
      return;
    }

    this.productForm.patchValue(
      {
        brandName: selected,
        strengthUnit: this.productForm.get('strengthUnit')?.value || '% ABV'
      },
      { emitEvent: false }
    );
    this.saveToSessionStorage();
    this.updateAllErrorMessages();
  }

  private applyBrandFromList(brandCode: string): void {
    const brand = this.brands.find((item) => String(item.brandName) === String(brandCode));
    if (!brand) {
      return;
    }

    this.productForm.patchValue(
      {
        brandName: brand.brandName,
        strengthUnit: this.productForm.get('strengthUnit')?.value || '% ABV'
      },
      { emitEvent: false }
    );
    this.saveToSessionStorage();
    this.updateAllErrorMessages();
  }

  private updateErrorMessage(field: keyof typeof this.errorMessages): void {
    const control = this.productForm.get(field);
    if (control?.hasError('required')) {
      this.errorMessages[field].set('This field is required');
    } else if (control?.hasError('min') || control?.hasError('max')) {
      this.errorMessages[field].set('Entered value is out of allowed range');
    } else if (control?.hasError('maxlength')) {
      this.errorMessages[field].set('Maximum allowed characters exceeded');
    } else {
      this.errorMessages[field].set('');
    }
  }

  private updateAllErrorMessages(): void {
    Object.keys(this.errorMessages).forEach((field) => {
      this.updateErrorMessage(field as keyof typeof this.errorMessages);
    });
  }

  getErrorMessage(field: keyof typeof this.errorMessages): string {
    return this.errorMessages[field]();
  }

  resetForm(): void {
    this.productForm.reset({
      bottlerOrigin: '',
      bottlerState: '',
      bottlerName: '',
      bottlerAddress: '',
      brandOwnerType: '',
      brandOwnerCode: '',
      brandOwnerName: '',
      brandOwnerAddress: '',
      liquorKind: '',
      liquorType: '',
      brandCode: '',
      brandName: '',
      allowedStrength: '',
      strengthValue: '',
      strengthUnit: '% ABV'
    });

    this.brands = [];
    this.brandsError = '';
    sessionStorage.removeItem('labelRegProductDetails');
  }

  goBack(): void {
    this.back.emit();
  }

  proceedToNext(): void {
    if (this.productForm.valid) {
      this.next.emit();
      return;
    }
    this.productForm.markAllAsTouched();
    this.updateAllErrorMessages();
  }

  private loadStates(): void {
    this.masterService
      .getStates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const rows = Array.isArray(data) ? data : [];
          const values = rows.map((item: any) => String(item?.state ?? '').trim()).filter(Boolean);
          this.states = values.length ? values : [...this.fallbackStates];
        },
        error: (error) => {
          console.error('Failed to load states for label registration:', error);
          this.states = [...this.fallbackStates];
        }
      });
  }

  private getBrandOwnerCandidates(item: any): unknown[] {
    const liquorDetails = item?.liquor_data_details || item?.liquorDataDetails || {};
    return [
      item?.brandOwner,
      item?.brand_owner,
      item?.brandOwnerName,
      item?.brand_owner_name,
      liquorDetails?.brandOwner,
      liquorDetails?.brand_owner,
      liquorDetails?.brandOwnerName,
      liquorDetails?.brand_owner_name,
      liquorDetails?.companyName,
      liquorDetails?.company_name,
      liquorDetails?.brandOwnerCompany,
      liquorDetails?.brand_owner_company
    ];
  }

  private getDistilleryName(item: any): string {
    return this.coalesceText(
      item?.distillery_name,
      item?.distilleryName
    );
  }

  private getBrandType(item: any): string {
    return this.coalesceText(
      item?.brand_type,
      item?.brandType
    );
  }

  private getBrandName(item: any): string {
    return this.coalesceText(
      item?.brand_details,
      item?.brandDetails
    );
  }

  private coalesceText(...values: unknown[]): string {
    for (const value of values) {
      const text = String(value ?? '').trim();
      if (text) {
        return text;
      }
    }
    return '';
  }

  private uniqueValues(values: string[]): string[] {
    const seen = new Set<string>();
    const unique: string[] = [];
    values.forEach((value) => {
      const text = String(value ?? '').trim();
      if (!text || seen.has(text)) {
        return;
      }
      seen.add(text);
      unique.push(text);
    });
    return unique;
  }
}
