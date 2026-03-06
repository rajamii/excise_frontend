import { Component, EventEmitter, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
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

  districts = [
    'Gangtok',
    'Mangan',
    'Gyalshing',
    'Namchi',
    'Pakyong',
    'Soreng'
  ];

  packagingTypes = ['Bottle', 'Can', 'Tetra Pack', 'PET', 'Keg'];

  errorMessages = {
    marketDistricts: signal(''),
    proposedLaunchDate: signal(''),
    annualProjectedSales: signal(''),
    remarks: signal('')
  };

  constructor(private fb: FormBuilder) {
    const storedValues = this.getFromSessionStorage();
    const rows = Array.isArray(storedValues.packagingRows) && storedValues.packagingRows.length > 0
      ? storedValues.packagingRows
      : [{}];

    this.packagingForm = this.fb.group({
      packagingRows: this.fb.array(rows.map((row: any) => this.createPackagingRow(row))),
      marketDistricts: new FormControl(storedValues.marketDistricts || [], [Validators.required]),
      proposedLaunchDate: new FormControl(storedValues.proposedLaunchDate || '', [Validators.required]),
      annualProjectedSales: new FormControl(storedValues.annualProjectedSales || '', [Validators.required, Validators.min(1)]),
      remarks: new FormControl(storedValues.remarks || '', [Validators.maxLength(400)])
    });

    this.packagingForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.saveToSessionStorage();
      this.updateAllErrorMessages();
    });
  }

  ngOnInit(): void {
    const savedData = this.getFromSessionStorage();
    if (Object.keys(savedData).length > 0) {
      this.packagingForm.patchValue({
        marketDistricts: savedData.marketDistricts || [],
        proposedLaunchDate: savedData.proposedLaunchDate || '',
        annualProjectedSales: savedData.annualProjectedSales || '',
        remarks: savedData.remarks || ''
      });
    }
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
      sizeMl: new FormControl(data.sizeMl || '', [Validators.required, Validators.min(30)]),
      packagingType: new FormControl(data.packagingType || '', [Validators.required]),
      unitsPerCase: new FormControl(data.unitsPerCase || '', [Validators.required, Validators.min(1)]),
      mrp: new FormControl(data.mrp || '', [Validators.required, Validators.min(1)])
    });
  }

  private getFromSessionStorage(): any {
    const storedData = sessionStorage.getItem('labelRegPackagingDetails');
    return storedData ? JSON.parse(storedData) : {};
  }

  private saveToSessionStorage(): void {
    sessionStorage.setItem('labelRegPackagingDetails', JSON.stringify(this.packagingForm.getRawValue()));
  }

  private updateErrorMessage(field: keyof typeof this.errorMessages): void {
    const control = this.packagingForm.get(field);
    if (control?.hasError('required')) {
      this.errorMessages[field].set('This field is required');
    } else if (control?.hasError('min')) {
      this.errorMessages[field].set('Value must be greater than zero');
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

  hasInvalidPackagingRows(): boolean {
    return this.packagingRows.controls.some((row) => row.invalid);
  }

  getEstimatedAverageMrp(): number {
    const rows = this.packagingRows.getRawValue();
    if (!rows.length) {
      return 0;
    }
    const total = rows.reduce((sum: number, row: any) => sum + Number(row.mrp || 0), 0);
    return total / rows.length;
  }

  resetForm(): void {
    sessionStorage.removeItem('labelRegPackagingDetails');
    while (this.packagingRows.length > 0) {
      this.packagingRows.removeAt(0);
    }
    this.packagingRows.push(this.createPackagingRow());
    this.packagingForm.patchValue({
      marketDistricts: [],
      proposedLaunchDate: '',
      annualProjectedSales: '',
      remarks: ''
    });
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
    this.updateAllErrorMessages();
  }
}
