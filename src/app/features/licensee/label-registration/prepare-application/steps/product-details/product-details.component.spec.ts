import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MasterService } from '../../../../../../core/services/master.service';
import { BrandWarehouseService } from '../../../../supplyChain/services/brand-warehouse.service';
import { LabelRegistrationProductDetailsComponent } from './product-details.component';

describe('LabelRegistrationProductDetailsComponent', () => {
  let component: LabelRegistrationProductDetailsComponent;
  let fixture: ComponentFixture<LabelRegistrationProductDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LabelRegistrationProductDetailsComponent],
      providers: [
        {
          provide: MasterService,
          useValue: {
            getStates: () => of([])
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

    fixture = TestBed.createComponent(LabelRegistrationProductDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
