import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HologramMonthlyReportComponent } from './hologram-monthly-report.component';

describe('HologramMonthlyReportComponent', () => {
  let component: HologramMonthlyReportComponent;
  let fixture: ComponentFixture<HologramMonthlyReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HologramMonthlyReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HologramMonthlyReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
