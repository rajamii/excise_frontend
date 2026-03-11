import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { LabelRegistrationService } from '../../../../../../core/services/label-registration.service';
import { LabelRegistrationSubmitApplicationComponent } from './submit-application.component';

describe('LabelRegistrationSubmitApplicationComponent', () => {
  let component: LabelRegistrationSubmitApplicationComponent;
  let fixture: ComponentFixture<LabelRegistrationSubmitApplicationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LabelRegistrationSubmitApplicationComponent],
      providers: [
        {
          provide: Router,
          useValue: {
            navigate: () => Promise.resolve(true)
          }
        },
        {
          provide: LabelRegistrationService,
          useValue: {
            applyLabelRegistration: () => of({})
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LabelRegistrationSubmitApplicationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
