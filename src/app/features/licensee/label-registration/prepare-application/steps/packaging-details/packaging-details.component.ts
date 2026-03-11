import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SupplyChainService } from '../../../../supplyChain/services/supplychain.service';
import { MaterialModule } from '../../../../../../shared/material.module';

@Component({
  selector: 'app-label-registration-packaging-details',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './packaging-details.component.html',
  styleUrl: './packaging-details.component.scss'
})
export class LabelRegistrationPackagingDetailsComponent implements OnInit, OnDestroy {
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  packagingForm: FormGroup;
  private destroy$ = new Subject<void>();

  private readonly fallbackPackageTypes = ['Bottle', 'Can', 'Tetra Pack', 'PET', 'Keg'];
  private readonly fallbackPurposeSaleOptions = ['Regular', 'Duty Free', 'Export', 'Import', 'Institutional'];

  packageTypes = [...this.fallbackPackageTypes];
  purposeSaleOptions = [...this.fallbackPurposeSaleOptions];
  mrpRangeOptions = ['0-100', '101-200', '201-500', '501-1000', '1000+'];

  displayedColumns: string[] = [
    'measureValueMl',
    'packageType',
    'purposeSale',
    'bottlesPerCase',
    'edpPerCase',
    'mrpPerBottle',
    'exciseDutyPerCase',
    'bottlingFeePerCase',
    'importPerCase',
    'exportPerCase',
    'mrpRange',
    'action'
  ];

  constructor(
    private fb: FormBuilder,
    private supplyChainService: SupplyChainService
  ) {
    const storedValues = this.getFromSessionStorage();
    const rows = Array.isArray(storedValues.packagingRows) && storedValues.packagingRows.length > 0
      ? storedValues.packagingRows
      : [{}];

    this.packagingForm = this.fb.group({
      packagingRows: this.fb.array(rows.map((row: any) => this.createPackagingRow(row)))
    });

    this.packagingForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.saveToSessionStorage();
    });
  }

  ngOnInit(): void {
    this.loadPackageTypes();
    this.loadPurposeSaleOptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get packagingRows(): FormArray {
    return this.packagingForm.get('packagingRows') as FormArray;
  }

  addPackagingRow(): void {
    this.packagingRows.push(this.createPackagingRow());
  }

  removePackagingRow(index: number): void {
    if (this.packagingRows.length === 1) {
      return;
    }
    this.packagingRows.removeAt(index);
  }

  private createPackagingRow(data: any = {}): FormGroup {
    return this.fb.group({
      measureValueMl: new FormControl(data.measureValueMl ?? data.sizeMl ?? '', [Validators.required, Validators.min(1)]),
      packageType: new FormControl(data.packageType ?? data.packagingType ?? '', [Validators.required]),
      purposeSale: new FormControl(data.purposeSale ?? '', [Validators.required]),
      bottlesPerCase: new FormControl(data.bottlesPerCase ?? data.unitsPerCase ?? '', [Validators.required, Validators.min(1)]),
      edpPerCase: new FormControl(data.edpPerCase ?? '', [Validators.required, Validators.min(0)]),
      mrpPerBottle: new FormControl(data.mrpPerBottle ?? data.mrp ?? '', [Validators.required, Validators.min(0)]),
      exciseDutyPerCase: new FormControl(data.exciseDutyPerCase ?? '', [Validators.min(0)]),
      bottlingFeePerCase: new FormControl(data.bottlingFeePerCase ?? '', [Validators.min(0)]),
      importPerCase: new FormControl(data.importPerCase ?? '', [Validators.min(0)]),
      exportPerCase: new FormControl(data.exportPerCase ?? '', [Validators.min(0)]),
      mrpRange: new FormControl(data.mrpRange ?? '')
    });
  }

  private getFromSessionStorage(): any {
    const storedData = sessionStorage.getItem('labelRegPackagingDetails');
    return storedData ? JSON.parse(storedData) : {};
  }

  private saveToSessionStorage(): void {
    sessionStorage.setItem('labelRegPackagingDetails', JSON.stringify(this.packagingForm.getRawValue()));
  }

  hasInvalidPackagingRows(): boolean {
    return this.packagingRows.controls.some((row) => row.invalid);
  }

  getEstimatedAverageMrp(): number {
    const rows = this.packagingRows.getRawValue();
    if (!rows.length) {
      return 0;
    }
    const total = rows.reduce((sum: number, row: any) => sum + Number(row.mrpPerBottle || 0), 0);
    return total / rows.length;
  }

  resetForm(): void {
    sessionStorage.removeItem('labelRegPackagingDetails');
    while (this.packagingRows.length > 0) {
      this.packagingRows.removeAt(0);
    }
    this.packagingRows.push(this.createPackagingRow());
  }

  goBack(): void {
    this.back.emit();
  }

  proceedToNext(): void {
    if (this.packagingForm.valid && !this.hasInvalidPackagingRows()) {
      this.next.emit();
      return;
    }
    this.packagingForm.markAllAsTouched();
    this.packagingRows.controls.forEach((row) => row.markAllAsTouched());
  }

  private loadPackageTypes(): void {
    this.supplyChainService
      .getBottleTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const rows = Array.isArray(data) ? data : [];
          const values = rows
            .map((item: any) => String(item?.bottleType ?? item?.bottle_type ?? item ?? '').trim())
            .filter(Boolean);
          const unique = Array.from(new Set(values));
          this.packageTypes = unique.length ? unique : [...this.fallbackPackageTypes];
        },
        error: (error) => {
          console.error('Failed to load package types:', error);
          this.packageTypes = [...this.fallbackPackageTypes];
        }
      });
  }

  private loadPurposeSaleOptions(): void {
    this.supplyChainService
      .getPurposes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const rows = Array.isArray(data) ? data : [];
          const values = rows
            .map((item: any) => String(item?.purposeName ?? item?.purpose_name ?? item ?? '').trim())
            .filter(Boolean);
          const unique = Array.from(new Set(values));
          this.purposeSaleOptions = unique.length ? unique : [...this.fallbackPurposeSaleOptions];
        },
        error: (error) => {
          console.error('Failed to load purpose sale options:', error);
          this.purposeSaleOptions = [...this.fallbackPurposeSaleOptions];
        }
      });
  }
}
