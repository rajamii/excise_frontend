import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HologramrequestComponent } from './hologramrequest.component';

describe('HologramrequestComponent', () => {
  let component: HologramrequestComponent;
  let fixture: ComponentFixture<HologramrequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HologramrequestComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HologramrequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
