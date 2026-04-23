import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfficerinchargehologramreqComponent } from './officerinchargehologramreq.component';

describe('OfficerinchargehologramreqComponent', () => {
  let component: OfficerinchargehologramreqComponent;
  let fixture: ComponentFixture<OfficerinchargehologramreqComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficerinchargehologramreqComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfficerinchargehologramreqComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('allocates FIFO when receivedDate is same (earliest fromSerial first)', () => {
    component.hologramInventory = [
      {
        id: 1,
        cartoonNumber: 'a1(d)',
        type: 'LOCAL',
        fromSerial: '701',
        toSerial: '1000',
        totalCount: 300,
        availableCount: 300,
        usedCount: 0,
        damagedCount: 0,
        status: 'AVAILABLE',
        receivedDate: '2026-04-17',
        actualAvailableRanges: [{ fromSerial: '701', toSerial: '1000', count: 300 }]
      },
      {
        id: 2,
        cartoonNumber: 'a1(a)',
        type: 'LOCAL',
        fromSerial: '1',
        toSerial: '200',
        totalCount: 200,
        availableCount: 200,
        usedCount: 0,
        damagedCount: 0,
        status: 'AVAILABLE',
        receivedDate: '2026-04-17',
        actualAvailableRanges: [{ fromSerial: '1', toSerial: '200', count: 200 }]
      }
    ] as any;

    const result = component.calculateHologramAllocation(9, 'LOCAL');
    expect(result.canAllocate).toBeTrue();
    expect(result.allocations[0].cartoonNumber).toBe('a1(a)');
    expect(result.allocations[0].fromSerial).toBe('1');
    expect(result.allocations[0].toSerial).toBe('9');
  });
});
