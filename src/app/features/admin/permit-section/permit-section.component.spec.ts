import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermitSectionComponent } from './permit-section.component';

describe('PermitSectionComponent', () => {
  let component: PermitSectionComponent;
  let fixture: ComponentFixture<PermitSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermitSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PermitSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
