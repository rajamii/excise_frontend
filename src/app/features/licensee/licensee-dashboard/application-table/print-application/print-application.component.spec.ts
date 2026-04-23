import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { PrintApplicationComponent } from './print-application.component';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { SalesmanBarmanRegistrationService } from '../../../../../core/services/salesman-barman-registration.service';

describe('PrintApplicationComponent', () => {
  let component: PrintApplicationComponent;
  let fixture: ComponentFixture<PrintApplicationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrintApplicationComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { application: {}, returnUrl: '/dashboard' } },
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        {
          provide: LicenseApplicationService,
          useValue: {
            printLicense: () => of({ print_count: 0 }),
            printNewLicense: () => of({ print_count: 0 })
          }
        },
        {
          provide: SalesmanBarmanRegistrationService,
          useValue: {
            printRegistration: () => of({ print_count: 0 })
          }
        },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrintApplicationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
