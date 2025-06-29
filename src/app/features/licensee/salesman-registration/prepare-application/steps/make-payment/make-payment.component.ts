import { Component, EventEmitter, Output, signal } from '@angular/core';
import { MaterialModule } from '../../../../../../shared/material.module';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-make-payment',
  imports: [MaterialModule],
  templateUrl: './make-payment.component.html',
  styleUrl: './make-payment.component.scss'
})
export class MakePaymentComponent {
  makePaymentForm: FormGroup;

  @Output() next = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  constructor(private fb: FormBuilder) {
    this.makePaymentForm = this.fb.group({
    });
  }

  proceedToNext() {
    if (this.makePaymentForm.valid) {
      this.next.emit();
    }
  }

  goBack() {
    this.back.emit();
  }

  resetForm() {
    this.makePaymentForm.reset();
    sessionStorage.clear();
  }
}
