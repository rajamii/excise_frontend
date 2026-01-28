import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ITCELLComponent } from './itcell.component';

describe('ITCELLComponent', () => {
  let component: ITCELLComponent;
  let fixture: ComponentFixture<ITCELLComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ITCELLComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ITCELLComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
