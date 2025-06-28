import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListSubdivisionComponent } from './list-subdivision.component';

describe('ListSubdivisionComponent', () => {
  let component: ListSubdivisionComponent;
  let fixture: ComponentFixture<ListSubdivisionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListSubdivisionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListSubdivisionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
