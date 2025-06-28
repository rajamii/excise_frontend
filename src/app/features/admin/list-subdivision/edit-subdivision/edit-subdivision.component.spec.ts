import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditSubdivisionComponent } from './edit-subdivision.component';

describe('EditSubdivisionComponent', () => {
  let component: EditSubdivisionComponent;
  let fixture: ComponentFixture<EditSubdivisionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditSubdivisionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditSubdivisionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
