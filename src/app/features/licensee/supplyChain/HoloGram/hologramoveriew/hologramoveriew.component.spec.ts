import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HologramoveriewComponent } from './hologramoveriew.component';

describe('HologramoveriewComponent', () => {
  let component: HologramoveriewComponent;
  let fixture: ComponentFixture<HologramoveriewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HologramoveriewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HologramoveriewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
