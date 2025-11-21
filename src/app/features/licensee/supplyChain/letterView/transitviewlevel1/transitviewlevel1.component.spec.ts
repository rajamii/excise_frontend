import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Transitviewlevel1Component } from './transitviewlevel1.component';

describe('Transitviewlevel1Component', () => {
  let component: Transitviewlevel1Component;
  let fixture: ComponentFixture<Transitviewlevel1Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Transitviewlevel1Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Transitviewlevel1Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
