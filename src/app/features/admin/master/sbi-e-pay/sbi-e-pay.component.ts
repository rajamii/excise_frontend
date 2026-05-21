import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MaterialModule } from '../../../../shared/material.module';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-sbi-e-pay',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './sbi-e-pay.component.html',
  styleUrl: './sbi-e-pay.component.scss'
})
export class SbiEPayComponent implements OnInit {
  activeTab: 'wallet' | 'excise' = 'wallet';
  amount: number = 0;
  
  // Dummy values based on user requirements and standard mockup
  walletTransactionId = 'SBI1779345750775500025';
  exciseTransactionId = 'SBIEXCISEDUTYEX9827463920194837261';
  
  headOfAccountWallet = '0039-00-105-45-01';
  headOfAccountExcise = '0039-00-106-01-01';
  
  constructor(private router: Router) {}

  ngOnInit(): void {}

  selectTab(tab: 'wallet' | 'excise'): void {
    this.activeTab = tab;
  }

  getCurrentTransactionId(): string {
    return this.activeTab === 'wallet' ? this.walletTransactionId : this.exciseTransactionId;
  }

  getCurrentHeadOfAccount(): string {
    return this.activeTab === 'wallet' ? this.headOfAccountWallet : this.headOfAccountExcise;
  }

  onProceed(): void {
    if (this.amount <= 0 || !this.amount) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Amount',
        text: 'Please enter a valid amount greater than 0.',
        confirmButtonColor: '#0d6efd'
      });
      return;
    }

    Swal.fire({
      title: 'Proceeding to SBI ePAY',
      html: `
        <div class="swal-payment-info" style="text-align: left; font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #333;">
          <div style="margin-bottom: 8px;"><strong style="color: #555;">Payment Mode:</strong> ${this.activeTab === 'wallet' ? 'Wallet Advance' : 'Excise Duty'}</div>
          <div style="margin-bottom: 8px;"><strong style="color: #555;">Transaction ID:</strong> ${this.getCurrentTransactionId()}</div>
          <div style="margin-bottom: 8px;"><strong style="color: #555;">Head Of Account:</strong> ${this.getCurrentHeadOfAccount()}</div>
          <div style="margin-bottom: 8px;"><strong style="color: #555;">Amount:</strong> <span style="font-weight: bold; color: #1b7f4a;">Rs. ${this.amount}</span></div>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">
          <p style="color: #666; font-size: 12px; font-style: italic; text-align: center; margin: 0;">(This is a dummy frontend simulation of SBI ePAY gateway.)</p>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#1b7f4a',
      cancelButtonColor: '#0d6efd',
      confirmButtonText: 'Confirm & Pay',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          icon: 'success',
          title: 'Payment Confirmed',
          text: `Payment of Rs. ${this.amount} has been successfully simulated using SBI ePAY!`,
          confirmButtonColor: '#1b7f4a'
        });
      }
    });
  }

  onBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
