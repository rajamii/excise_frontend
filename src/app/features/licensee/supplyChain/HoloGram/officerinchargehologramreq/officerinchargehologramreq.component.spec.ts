import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfficerinchargehologramreqComponent } from './officerinchargehologramreq.component';

describe('OfficerinchargehologramreqComponent', () => {
  let component: OfficerinchargehologramreqComponent;
  let fixture: ComponentFixture<OfficerinchargehologramreqComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficerinchargehologramreqComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfficerinchargehologramreqComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
