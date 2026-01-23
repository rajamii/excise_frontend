import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrandwarehouseComponent } from './brandwarehouse.component';

describe('BrandwarehouseComponent', () => {
  let component: BrandwarehouseComponent;
  let fixture: ComponentFixture<BrandwarehouseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandwarehouseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrandwarehouseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
