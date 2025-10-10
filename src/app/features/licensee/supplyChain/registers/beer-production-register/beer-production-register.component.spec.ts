import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BeerProductionRegisterComponent } from './beer-production-register.component';

describe('BeerProductionRegisterComponent', () => {
  let component: BeerProductionRegisterComponent;
  let fixture: ComponentFixture<BeerProductionRegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BeerProductionRegisterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BeerProductionRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
