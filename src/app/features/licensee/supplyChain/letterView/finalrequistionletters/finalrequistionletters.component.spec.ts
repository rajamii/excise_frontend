import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinalrequistionlettersComponent } from './finalrequistionletters.component';

describe('FinalrequistionlettersComponent', () => {
  let component: FinalrequistionlettersComponent;
  let fixture: ComponentFixture<FinalrequistionlettersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinalrequistionlettersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinalrequistionlettersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
