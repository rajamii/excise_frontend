import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyhologramstatementOICComponent } from './monthlyhologramstatement-oic.component';

describe('MonthlyhologramstatementOICComponent', () => {
  let component: MonthlyhologramstatementOICComponent;
  let fixture: ComponentFixture<MonthlyhologramstatementOICComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonthlyhologramstatementOICComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonthlyhologramstatementOICComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
