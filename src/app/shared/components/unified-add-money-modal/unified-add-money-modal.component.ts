import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type AddMoneyWalletType = 'excise' | 'education' | 'hologram' | 'brewery';

export interface AddMoneyViewContext {
  walletType: AddMoneyWalletType;
  moduleLabel: string;
  walletLabel: string;
  hoa: string;
}

@Component({
  selector: 'app-unified-add-money-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './unified-add-money-modal.component.html',
  styleUrls: ['./unified-add-money-modal.component.scss']
})
export class UnifiedAddMoneyModalComponent {
  @Input() context: AddMoneyViewContext | null = null;
  @Input() transactionId = '';
  @Input() amount = 0;

  @Output() amountChange = new EventEmitter<number>();
  @Output() proceed = new EventEmitter<number>();
  @Output() close = new EventEmitter<void>();

  onAmountChange(value: number | string | null): void {
    const parsed = Number(value);
    this.amountChange.emit(Number.isFinite(parsed) ? parsed : 0);
  }

  onProceedClick(): void {
    this.proceed.emit(this.amount);
  }

  onCloseClick(): void {
    this.close.emit();
  }
}
