import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Transitviewlevel2Component } from './transitviewlevel2.component';

describe('Transitviewlevel2Component', () => {
  let component: Transitviewlevel2Component;
  let fixture: ComponentFixture<Transitviewlevel2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Transitviewlevel2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Transitviewlevel2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
