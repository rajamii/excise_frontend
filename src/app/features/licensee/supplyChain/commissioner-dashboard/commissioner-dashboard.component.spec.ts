import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommissionerDashboardComponent } from './commissioner-dashboard.component';

describe('CommissionerDashboardComponent', () => {
  let component: CommissionerDashboardComponent;
  let fixture: ComponentFixture<CommissionerDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommissionerDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommissionerDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
