import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrepareApplicationComponent } from './prepare-application.component';

describe('PrepareApplicationComponent', () => {
  let component: PrepareApplicationComponent;
  let fixture: ComponentFixture<PrepareApplicationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrepareApplicationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrepareApplicationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
