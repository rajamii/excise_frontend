import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-permit-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './permit-section.component.html',
  styleUrls: ['./permit-section.component.scss']
})
export class PermitSectionComponent {

  constructor(private router: Router) {}

  navigateToImportPermit(): void {
    this.router.navigate(['/dev-import-permit']);
  }

  navigateToTransitPermit(): void {
    this.router.navigate(['/dev-transit-permit']);
  }

  navigateToSupplyChain(): void {
    this.router.navigate(['/dev-supply-chain']);
  }

  navigateToPaymentConfirmation(): void {
    this.router.navigate(['/dev-payment-confirmation']);
  }

  navigateToPaymentReceipt(): void {
    this.router.navigate(['/dev-payment-receipt']);
  }
}
