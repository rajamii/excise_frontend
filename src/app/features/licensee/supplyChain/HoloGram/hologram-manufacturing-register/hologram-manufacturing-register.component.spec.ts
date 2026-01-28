import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HologramManufacturingRegisterComponent } from './hologram-manufacturing-register.component';

describe('HologramManufacturingRegisterComponent', () => {
  let component: HologramManufacturingRegisterComponent;
  let fixture: ComponentFixture<HologramManufacturingRegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HologramManufacturingRegisterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HologramManufacturingRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
