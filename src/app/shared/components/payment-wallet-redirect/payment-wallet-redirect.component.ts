import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-payment-wallet-redirect',
  standalone: true,
  template: ''
})
export class PaymentWalletRedirectComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const existingParams = this.route.snapshot.queryParams || {};

    this.router.navigate(['/dashboard'], {
      queryParams: {
        ...existingParams,
        section: 'wallet'
      },
      replaceUrl: true
    });
  }
}
