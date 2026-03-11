import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AccountService } from '../../../../core/services/account.service';
import { LabelRegistrationPrepareApplicationComponent } from './prepare-application.component';

describe('LabelRegistrationPrepareApplicationComponent', () => {
  let component: LabelRegistrationPrepareApplicationComponent;
  let fixture: ComponentFixture<LabelRegistrationPrepareApplicationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LabelRegistrationPrepareApplicationComponent],
      providers: [
        {
          provide: AccountService,
          useValue: {
            getUserProfileSync: () => ({ id: 1 }),
            identity: () => of({})
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LabelRegistrationPrepareApplicationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
