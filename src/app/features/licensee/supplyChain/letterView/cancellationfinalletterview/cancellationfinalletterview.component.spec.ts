import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CancellationfinalletterviewComponent } from './cancellationfinalletterview.component';

describe('CancellationfinalletterviewComponent', () => {
  let component: CancellationfinalletterviewComponent;
  let fixture: ComponentFixture<CancellationfinalletterviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CancellationfinalletterviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CancellationfinalletterviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
