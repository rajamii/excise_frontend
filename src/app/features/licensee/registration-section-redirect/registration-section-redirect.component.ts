import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-registration-section-redirect',
  standalone: true,
  template: ''
})
export class RegistrationSectionRedirectComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const section = this.route.snapshot.data['section'] as string | undefined;

    this.router.navigate(['/dashboard'], {
      queryParams: { section: section || 'company-registration' },
      replaceUrl: true
    });
  }
}
