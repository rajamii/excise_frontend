import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SiteEnquiryFormComponent } from './site-enquiry-form.component';

describe('SiteEnquiryFormComponent', () => {
  let component: SiteEnquiryFormComponent;
  let fixture: ComponentFixture<SiteEnquiryFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteEnquiryFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SiteEnquiryFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
