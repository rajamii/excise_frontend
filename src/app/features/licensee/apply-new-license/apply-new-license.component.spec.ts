/// <reference types="jasmine" />
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplyNewLicenseComponent } from './apply-new-license.component';

describe('ApplyNewLicenseComponent', () => {
  let component: ApplyNewLicenseComponent;
  let fixture: ComponentFixture<ApplyNewLicenseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplyNewLicenseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApplyNewLicenseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
