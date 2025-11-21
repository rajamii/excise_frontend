import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Hologramrequestlevel1Component } from './hologramrequestlevel1.component';

describe('Hologramrequestlevel1Component', () => {
  let component: Hologramrequestlevel1Component;
  let fixture: ComponentFixture<Hologramrequestlevel1Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Hologramrequestlevel1Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Hologramrequestlevel1Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
