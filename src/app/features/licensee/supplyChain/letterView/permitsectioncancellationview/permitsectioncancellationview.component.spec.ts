import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermitsectioncancellationviewComponent } from './permitsectioncancellationview.component';

describe('PermitsectioncancellationviewComponent', () => {
  let component: PermitsectioncancellationviewComponent;
  let fixture: ComponentFixture<PermitsectioncancellationviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermitsectioncancellationviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PermitsectioncancellationviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
