import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddLicensetypeComponent } from './add-licensetype.component';

describe('AddLicensetypeComponent', () => {
  let component: AddLicensetypeComponent;
  let fixture: ComponentFixture<AddLicensetypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddLicensetypeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddLicensetypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
