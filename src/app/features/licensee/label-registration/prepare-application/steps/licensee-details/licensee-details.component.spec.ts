import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MasterService } from '../../../../../../core/services/master.service';
import { BrandWarehouseService } from '../../../../supplyChain/services/brand-warehouse.service';
import { LabelRegistrationLicenseeDetailsComponent } from './licensee-details.component';

describe('LabelRegistrationLicenseeDetailsComponent', () => {
  let component: LabelRegistrationLicenseeDetailsComponent;
  let fixture: ComponentFixture<LabelRegistrationLicenseeDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LabelRegistrationLicenseeDetailsComponent],
      providers: [
        {
          provide: MasterService,
          useValue: {
            getLicenseCategories: () => of([])
          }
        },
        {
          provide: BrandWarehouseService,
          useValue: {
            getBrandWarehouses: () => of([])
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LabelRegistrationLicenseeDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
