import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SbiepayComponent } from './sbiepay.component';

describe('SbiepayComponent', () => {
  let component: SbiepayComponent;
  let fixture: ComponentFixture<SbiepayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SbiepayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SbiepayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
