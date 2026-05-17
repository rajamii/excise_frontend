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

  it('derives arrival qty from serial ranges (not roll.total_count)', () => {
    const makeRoll = (suffix: string, from: number, to: number, mutableTotalCount: number) => ({
      procurement_ref: 'HQR/1101/2026-27/0001',
      received_date: '2026-05-14T00:00:00.000Z',
      total_count: mutableTotalCount,
      carton_details: [
        {
          rollNumber: `roll-${suffix}`,
          fromSerial: String(from),
          toSerial: String(to)
          // quantity intentionally omitted to force range-based calculation
        }
      ]
    });

    const rolls = [
      makeRoll('a', 1, 20000, 19991),
      makeRoll('b', 20001, 40000, 20000),
      makeRoll('c', 40001, 60000, 20000),
      makeRoll('d', 60001, 80000, 20000),
      makeRoll('e', 80001, 100000, 20000),
      makeRoll('f', 100001, 120000, 20000),
      makeRoll('g', 120001, 140000, 20000),
      makeRoll('h', 140001, 160000, 20000),
      makeRoll('i', 160001, 180000, 20000),
      makeRoll('j', 180001, 200000, 20000)
    ];

    const aggregated = (component as any).aggregateArrivalGroup(rolls);
    expect(aggregated.total).toBe(200000);
    expect(aggregated.ranges.length).toBe(10);
  });
});
