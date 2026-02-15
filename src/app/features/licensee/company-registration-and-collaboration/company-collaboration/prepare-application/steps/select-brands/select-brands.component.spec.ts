import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectBrandsComponent } from './select-brands.component';

describe('SelectBrandsComponent', () => {
  let component: SelectBrandsComponent;
  let fixture: ComponentFixture<SelectBrandsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectBrandsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectBrandsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});