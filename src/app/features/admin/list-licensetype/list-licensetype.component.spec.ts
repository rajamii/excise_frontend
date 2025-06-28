import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListLicensetypeComponent } from './list-licensetype.component';

describe('ListLicensetypeComponent', () => {
  let component: ListLicensetypeComponent;
  let fixture: ComponentFixture<ListLicensetypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListLicensetypeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListLicensetypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
