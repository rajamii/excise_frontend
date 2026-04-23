import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MaterialModule } from '../../../shared/material.module';

@Component({
  selector: 'app-payment-cancel',
  standalone: true,
  imports: [CommonModule, RouterLink, MaterialModule],
  template: `
    <section class="cancel-page">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Payment Cancelled</mat-card-title>
          <mat-card-subtitle>The payment process was cancelled before completion.</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <a mat-flat-button color="primary" routerLink="/licensee/payment-integrations">
            Back to Payment Integrations
          </a>
        </mat-card-content>
      </mat-card>
    </section>
  `,
  styles: [
    `
      .cancel-page {
        padding: 24px;
      }
    `,
  ],
})
export class PaymentCancelComponent {}
