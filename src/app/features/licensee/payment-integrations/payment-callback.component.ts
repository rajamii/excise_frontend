import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { MaterialModule } from '../../../shared/material.module';
import { PaymentIntegrationService } from '../../../core/services/payment-integration.service';

@Component({
  selector: 'app-payment-callback',
  standalone: true,
  imports: [CommonModule, RouterLink, MaterialModule],
  templateUrl: './payment-callback.component.html',
  styleUrl: './payment-callback.component.scss',
})
export class PaymentCallbackComponent implements OnInit {
  utr = '';
  billdeskStatus = '';
  rawMsg = '';

  isUpdating = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private paymentService: PaymentIntegrationService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.utr = params.get('utr') ?? '';
      this.billdeskStatus = params.get('status') ?? '';
      this.rawMsg = params.get('msg') ?? '';
    });
  }

  markSuccessForTesting(): void {
    if (!this.utr) {
      this.errorMessage = 'UTR is missing in callback URL.';
      return;
    }

    this.clearMessages();
    this.isUpdating = true;

    this.paymentService
      .updateTransactionStatus(this.utr, {
        paymentStatus: 'S',
        responseAuthstatus: '0300',
        responseString: this.rawMsg || undefined,
      })
      .pipe(finalize(() => (this.isUpdating = false)))
      .subscribe({
        next: () => {
          this.successMessage = `Transaction ${this.utr} marked as SUCCESS.`;
        },
        error: () => {
          this.errorMessage = 'Unable to update transaction status from callback.';
        },
      });
  }

  markFailedForTesting(): void {
    if (!this.utr) {
      this.errorMessage = 'UTR is missing in callback URL.';
      return;
    }

    this.clearMessages();
    this.isUpdating = true;

    this.paymentService
      .updateTransactionStatus(this.utr, {
        paymentStatus: 'F',
        responseAuthstatus: this.billdeskStatus || '0399',
        responseString: this.rawMsg || undefined,
      })
      .pipe(finalize(() => (this.isUpdating = false)))
      .subscribe({
        next: () => {
          this.successMessage = `Transaction ${this.utr} marked as FAILED.`;
        },
        error: () => {
          this.errorMessage = 'Unable to update transaction status from callback.';
        },
      });
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }
}
