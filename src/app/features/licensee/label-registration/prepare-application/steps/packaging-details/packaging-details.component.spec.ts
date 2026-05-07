import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SupplyChainService } from '../../../../supplyChain/services/supplychain.service';
import { LabelRegistrationPackagingDetailsComponent } from './packaging-details.component';

describe('LabelRegistrationPackagingDetailsComponent', () => {
  let component: LabelRegistrationPackagingDetailsComponent;
  let fixture: ComponentFixture<LabelRegistrationPackagingDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LabelRegistrationPackagingDetailsComponent],
      providers: [
        {
          provide: SupplyChainService,
          useValue: {
            getBottleTypes: () => of([]),
            getPurposes: () => of([])
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LabelRegistrationPackagingDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
