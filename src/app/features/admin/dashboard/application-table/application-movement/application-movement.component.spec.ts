import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplicationMovementComponent } from './application-movement.component';

describe('ApplicationMovementComponent', () => {
  let component: ApplicationMovementComponent;
  let fixture: ComponentFixture<ApplicationMovementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationMovementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApplicationMovementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
