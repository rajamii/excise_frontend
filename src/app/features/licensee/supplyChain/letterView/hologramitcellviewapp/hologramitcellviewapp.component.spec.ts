import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HologramitcellviewappComponent } from './hologramitcellviewapp.component';

describe('HologramitcellviewappComponent', () => {
  let component: HologramitcellviewappComponent;
  let fixture: ComponentFixture<HologramitcellviewappComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HologramitcellviewappComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HologramitcellviewappComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
