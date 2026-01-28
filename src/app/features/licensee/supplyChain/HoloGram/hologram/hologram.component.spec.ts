import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HologramComponent } from './hologram.component';

describe('HologramComponent', () => {
  let component: HologramComponent;
  let fixture: ComponentFixture<HologramComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HologramComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HologramComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
