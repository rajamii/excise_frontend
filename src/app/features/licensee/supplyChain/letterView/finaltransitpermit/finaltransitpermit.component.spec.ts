import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinaltransitpermitComponent } from './finaltransitpermit.component';

describe('FinaltransitpermitComponent', () => {
  let component: FinaltransitpermitComponent;
  let fixture: ComponentFixture<FinaltransitpermitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinaltransitpermitComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinaltransitpermitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
