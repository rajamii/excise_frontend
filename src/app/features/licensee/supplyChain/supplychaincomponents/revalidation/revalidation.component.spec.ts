import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RevalidationComponent } from './revalidation.component';

describe('RevalidationComponent', () => {
  let component: RevalidationComponent;
  let fixture: ComponentFixture<RevalidationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RevalidationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RevalidationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
