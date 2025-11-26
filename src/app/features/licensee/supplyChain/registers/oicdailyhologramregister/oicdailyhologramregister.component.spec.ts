import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OicdailyhologramregisterComponent } from './oicdailyhologramregister.component';

describe('OicdailyhologramregisterComponent', () => {
  let component: OicdailyhologramregisterComponent;
  let fixture: ComponentFixture<OicdailyhologramregisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OicdailyhologramregisterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OicdailyhologramregisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
