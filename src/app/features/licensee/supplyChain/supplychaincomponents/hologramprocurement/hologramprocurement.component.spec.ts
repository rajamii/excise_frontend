import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HologramprocurementComponent } from './hologramprocurement.component';

describe('HologramprocurementComponent', () => {
  let component: HologramprocurementComponent;
  let fixture: ComponentFixture<HologramprocurementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HologramprocurementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HologramprocurementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
