import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BottlerDetailsComponent } from './bottler-details.component';

describe('BottlerDetailsComponent', () => {
  let component: BottlerDetailsComponent;
  let fixture: ComponentFixture<BottlerDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottlerDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BottlerDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});