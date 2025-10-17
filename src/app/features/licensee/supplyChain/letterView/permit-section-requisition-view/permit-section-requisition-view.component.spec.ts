import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermitSectionRequisitionViewComponent } from './permit-section-requisition-view.component';

describe('PermitSectionRequisitionViewComponent', () => {
  let component: PermitSectionRequisitionViewComponent;
  let fixture: ComponentFixture<PermitSectionRequisitionViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermitSectionRequisitionViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PermitSectionRequisitionViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
