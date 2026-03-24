import { Component, EventEmitter, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PatternConstants } from '../../../../../../shared/constants/pattern.constants';
import { MaterialModule } from '../../../../../../shared/material.module';

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

  liquorCategories = ['IMFL', 'Beer', 'Wine', 'RTD', 'Spirit', 'Country Liquor'];
  labelTypes = ['New Label', 'Label Revision', 'Export Label', 'Promotional Label'];

  errorMessages = {
    brandName: signal(''),
    labelName: signal(''),
    liquorCategory: signal(''),
    labelType: signal(''),
    abvStrength: signal(''),
    netContentMl: signal(''),
    originState: signal(''),
    ingredients: signal(''),
    declarationText: signal(''),
    barcode: signal(''),
    shelfLifeMonths: signal('')
  };

  constructor(private fb: FormBuilder) {
    const storedValues = this.getFromSessionStorage();

    this.productForm = this.fb.group({
      brandName: new FormControl(storedValues.brandName || '', [Validators.required]),
      labelName: new FormControl(storedValues.labelName || '', [Validators.required]),
      liquorCategory: new FormControl(storedValues.liquorCategory || '', [Validators.required]),
      labelType: new FormControl(storedValues.labelType || '', [Validators.required]),
      abvStrength: new FormControl(storedValues.abvStrength || '', [Validators.required, Validators.min(0), Validators.max(100)]),
      netContentMl: new FormControl(storedValues.netContentMl || '', [Validators.required, Validators.min(30)]),
      originState: new FormControl(storedValues.originState || '', [Validators.required, Validators.pattern(PatternConstants.NAME)]),
      ingredients: new FormControl(storedValues.ingredients || '', [Validators.required, Validators.maxLength(400)]),
      declarationText: new FormControl(storedValues.declarationText || '', [Validators.required, Validators.maxLength(600)]),
      barcode: new FormControl(storedValues.barcode || '', [Validators.required, Validators.pattern('^[A-Za-z0-9-]{6,30}$')]),
      shelfLifeMonths: new FormControl(storedValues.shelfLifeMonths || '', [Validators.required, Validators.min(1), Validators.max(120)])
    });

    this.productForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.saveToSessionStorage();
      this.updateAllErrorMessages();
    });
  }

  ngOnInit(): void {
    const savedData = this.getFromSessionStorage();
    if (Object.keys(savedData).length > 0) {
      this.productForm.patchValue(savedData);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getFromSessionStorage(): any {
    const storedData = sessionStorage.getItem('labelRegProductDetails');
    return storedData ? JSON.parse(storedData) : {};
  }

  private saveToSessionStorage(): void {
    sessionStorage.setItem('labelRegProductDetails', JSON.stringify(this.productForm.getRawValue()));
  }

  private updateErrorMessage(field: keyof typeof this.errorMessages): void {
    const control = this.productForm.get(field);
    if (control?.hasError('required')) {
      this.errorMessages[field].set('This field is required');
    } else if (control?.hasError('pattern')) {
      this.errorMessages[field].set('Please enter a valid value');
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
    this.productForm.reset();
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
}
