import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditLicensetypeComponent } from './edit-licensetype.component';

describe('EditLicensetypeComponent', () => {
  let component: EditLicensetypeComponent;
  let fixture: ComponentFixture<EditLicensetypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditLicensetypeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditLicensetypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
