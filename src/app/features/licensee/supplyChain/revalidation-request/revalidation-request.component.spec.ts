import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RevalidationRequestComponent } from './revalidation-request.component';

describe('RevalidationRequestComponent', () => {
  let component: RevalidationRequestComponent;
  let fixture: ComponentFixture<RevalidationRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RevalidationRequestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RevalidationRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
