import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddPolicestationComponent } from './add-policestation.component';

describe('AddPolicestationComponent', () => {
  let component: AddPolicestationComponent;
  let fixture: ComponentFixture<AddPolicestationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddPolicestationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddPolicestationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
