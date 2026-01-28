import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportPermitComponent } from './import-permit.component';

describe('ImportPermitComponent', () => {
  let component: ImportPermitComponent;
  let fixture: ComponentFixture<ImportPermitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportPermitComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportPermitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
