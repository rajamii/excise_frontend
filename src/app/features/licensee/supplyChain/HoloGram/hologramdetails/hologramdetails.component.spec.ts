import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HologramdetailsComponent } from './hologramdetails.component';

describe('HologramdetailsComponent', () => {
  let component: HologramdetailsComponent;
  let fixture: ComponentFixture<HologramdetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HologramdetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HologramdetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
