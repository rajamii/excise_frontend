import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditLicensecategoryComponent } from './edit-licensecategory.component';

describe('EditLicensecategoryComponent', () => {
  let component: EditLicensecategoryComponent;
  let fixture: ComponentFixture<EditLicensecategoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditLicensecategoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditLicensecategoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
