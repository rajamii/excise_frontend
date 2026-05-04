/// <reference types="jasmine" />
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeclarationPaymentComponent } from './declaration-payment.component';

describe('DeclarationPaymentComponent', () => {
  let component: DeclarationPaymentComponent;
  let fixture: ComponentFixture<DeclarationPaymentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeclarationPaymentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeclarationPaymentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
