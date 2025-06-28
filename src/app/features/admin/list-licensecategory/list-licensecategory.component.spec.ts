import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListLicensecategoryComponent } from './list-licensecategory.component';

describe('ListLicensecategoryComponent', () => {
  let component: ListLicensecategoryComponent;
  let fixture: ComponentFixture<ListLicensecategoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListLicensecategoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListLicensecategoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
