import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfficerInChargeComponent } from './officer-in-charge.component';

describe('OfficerInChargeComponent', () => {
  let component: OfficerInChargeComponent;
  let fixture: ComponentFixture<OfficerInChargeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficerInChargeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfficerInChargeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
