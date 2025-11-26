import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HologramDailyregisteroicComponent } from './hologram-dailyregisteroic.component';

describe('HologramDailyregisteroicComponent', () => {
  let component: HologramDailyregisteroicComponent;
  let fixture: ComponentFixture<HologramDailyregisteroicComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HologramDailyregisteroicComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HologramDailyregisteroicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
