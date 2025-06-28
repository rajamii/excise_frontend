import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddLicensecategoryComponent } from './add-licensecategory.component';

describe('AddLicensecategoryComponent', () => {
  let component: AddLicensecategoryComponent;
  let fixture: ComponentFixture<AddLicensecategoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddLicensecategoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddLicensecategoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
