import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyhologramrecordregisterComponent } from './dailyhologramrecordregister.component';

describe('DailyhologramrecordregisterComponent', () => {
  let component: DailyhologramrecordregisterComponent;
  let fixture: ComponentFixture<DailyhologramrecordregisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyhologramrecordregisterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DailyhologramrecordregisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
