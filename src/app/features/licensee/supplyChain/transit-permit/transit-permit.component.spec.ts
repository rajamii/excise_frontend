import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransitPermitComponent } from './transit-permit.component';

describe('TransitPermitComponent', () => {
  let component: TransitPermitComponent;
  let fixture: ComponentFixture<TransitPermitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransitPermitComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransitPermitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
