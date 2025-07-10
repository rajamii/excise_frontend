import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintApplicationComponent } from './print-application.component';

describe('PrintApplicationComponent', () => {
  let component: PrintApplicationComponent;
  let fixture: ComponentFixture<PrintApplicationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrintApplicationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrintApplicationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
