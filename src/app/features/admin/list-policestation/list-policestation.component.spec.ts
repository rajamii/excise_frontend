import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListPolicestationComponent } from './list-policestation.component';

describe('ListPolicestationComponent', () => {
  let component: ListPolicestationComponent;
  let fixture: ComponentFixture<ListPolicestationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListPolicestationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListPolicestationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
