import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocalSalesRegisterComponent } from './local-sales-register.component';

describe('LocalSalesRegisterComponent', () => {
  let component: LocalSalesRegisterComponent;
  let fixture: ComponentFixture<LocalSalesRegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalSalesRegisterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LocalSalesRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
