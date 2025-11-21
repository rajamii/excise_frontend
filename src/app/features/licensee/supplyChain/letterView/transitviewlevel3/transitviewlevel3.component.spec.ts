import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Transitviewlevel3Component } from './transitviewlevel3.component';

describe('Transitviewlevel3Component', () => {
  let component: Transitviewlevel3Component;
  let fixture: ComponentFixture<Transitviewlevel3Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Transitviewlevel3Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Transitviewlevel3Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
