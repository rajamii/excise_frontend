import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmitApplicationComponent } from './submit-application.component';

describe('SubmitApplicationComponent', () => {
  let component: SubmitApplicationComponent;
  let fixture: ComponentFixture<SubmitApplicationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubmitApplicationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubmitApplicationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
