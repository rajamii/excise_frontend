import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OicTransitPermitComponent } from './oic-transit-permit.component';

describe('OicTransitPermitComponent', () => {
  let component: OicTransitPermitComponent;
  let fixture: ComponentFixture<OicTransitPermitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OicTransitPermitComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OicTransitPermitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
