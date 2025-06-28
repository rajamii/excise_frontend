import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditPolicestationComponent } from './edit-policestation.component';

describe('EditPolicestationComponent', () => {
  let component: EditPolicestationComponent;
  let fixture: ComponentFixture<EditPolicestationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditPolicestationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditPolicestationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
