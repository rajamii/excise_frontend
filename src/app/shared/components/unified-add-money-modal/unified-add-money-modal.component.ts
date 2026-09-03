import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type AddMoneyWalletType =
  | 'excise'
  | 'education'
  | 'hologram'
  | 'brewery'
  | 'distillery'
  | 'security_deposit'
  | 'license_fee';

export interface AddMoneyViewContext {
  walletType: AddMoneyWalletType;
  moduleLabel: string;
  walletLabel: string;
  hoa: string;
  purposeLabel?: string;
}

@Component({
  selector: 'app-unified-add-money-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './unified-add-money-modal.component.html',
  styleUrls: ['./unified-add-money-modal.component.scss']
})
export class UnifiedAddMoneyModalComponent implements OnInit, OnDestroy {
  @Input() context: AddMoneyViewContext | null = null;
  @Input() transactionId = '';
  @Input() amount = 0;

  @Output() amountChange = new EventEmitter<number>();
  @Output() proceed = new EventEmitter<number>();
  @Output() forcePay = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  constructor(private el: ElementRef) {}

  ngOnInit(): void {
    document.body.appendChild(this.el.nativeElement);
  }

  // 3. Clean up the DOM to prevent memory leaks when navigating away
  ngOnDestroy(): void {
    if (this.el.nativeElement) {
      this.el.nativeElement.remove();
    }
  }

  onAmountChange(value: number | string | null): void {
    const parsed = Number(value);
    this.amountChange.emit(Number.isFinite(parsed) ? parsed : 0);
  }

  onProceedClick(): void {
    this.proceed.emit(this.amount);
  }

  onForcePayClick(): void {
    this.forcePay.emit();
  }

  onCloseClick(): void {
    this.close.emit();
  }
}
