import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

import { MaterialModule } from '../../../shared/material.module';
import { environment } from '../../../../environments/environment';
import {
  PaymentGateway,
  PaymentHoa,
  PaymentInitiateResponse,
  PaymentModule,
  PaymentModuleHoaMapping,
  PaymentTransaction,
  PaymentWalletRow,
} from '../../../core/models/payment-integration.model';
import { PaymentIntegrationService } from '../../../core/services/payment-integration.service';

@Component({
  selector: 'app-payment-integrations',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './payment-integrations.component.html',
  styleUrl: './payment-integrations.component.scss',
})
export class PaymentIntegrationsComponent implements OnInit {
  paymentForm: FormGroup;
  statusForm: FormGroup;
  filterForm: FormGroup;

  modules: PaymentModule[] = [];
  gateways: PaymentGateway[] = [];
  allHoas: PaymentHoa[] = [];
  moduleHoaMappings: PaymentModuleHoaMapping[] = [];
  moduleHoaOptions: PaymentModuleHoaMapping[] = [];

  walletRows: PaymentWalletRow[] = [];
  transactions: PaymentTransaction[] = [];

  latestInitiation: PaymentInitiateResponse | null = null;
  selectedTransaction: PaymentTransaction | null = null;

  isMasterLoading = false;
  isInitiating = false;
  isWalletLoading = false;
  isTransactionsLoading = false;
  isStatusUpdating = false;

  successMessage = '';
  errorMessage = '';

  readonly paymentGatewayUrl =
    environment.payment?.billdeskGatewayUrl || 'https://uat1.billdesk.com/pgidsk/PGIMerchantPayment';
  readonly callbackUrl = environment.payment?.callbackUrl || 'http://localhost:4200/payment/callback';
  readonly cancelUrl = environment.payment?.cancelUrl || 'http://localhost:4200/payment/cancel';

  constructor(
    private fb: FormBuilder,
    private paymentService: PaymentIntegrationService
  ) {
    this.paymentForm = this.fb.group({
      paymentModuleCode: ['', Validators.required],
      payerId: ['', Validators.required],
      licenseeId: [''],
      gatewaySlNo: [null],
      requisitionIdNo: [''],
      items: this.fb.array([this.createItemFormGroup()]),
    });

    this.statusForm = this.fb.group({
      utr: ['', Validators.required],
      paymentStatus: ['S', Validators.required],
      responseAuthstatus: ['0300'],
      responseErrorstatus: [''],
      responseErrordescription: [''],
      responseTxnreferenceno: [''],
      responseBankreferenceno: [''],
      responseTxnamount: [null],
    });

    this.filterForm = this.fb.group({
      payerId: [''],
      paymentModuleCode: [''],
      paymentStatus: [''],
      utr: [''],
      limit: [20, [Validators.min(1), Validators.max(500)]],
    });
  }

  ngOnInit(): void {
    this.loadMasterData();

    this.paymentForm.get('paymentModuleCode')?.valueChanges.subscribe((moduleCode: string) => {
      this.updateModuleHoaOptions(moduleCode);
      this.resetItemHeadSelection();
    });
  }

  get itemRows(): FormArray {
    return this.paymentForm.get('items') as FormArray;
  }

  get selectedModuleCode(): string {
    return this.paymentForm.get('paymentModuleCode')?.value as string;
  }

  addItemRow(): void {
    this.itemRows.push(this.createItemFormGroup());
  }

  removeItemRow(index: number): void {
    if (this.itemRows.length === 1) {
      return;
    }
    this.itemRows.removeAt(index);
  }

  loadMasterData(): void {
    this.isMasterLoading = true;
    this.clearMessages();

    this.paymentService
      .getMasterData()
      .pipe(finalize(() => (this.isMasterLoading = false)))
      .subscribe({
        next: (res) => {
          this.modules = res.modules ?? [];
          this.gateways = res.gateways ?? [];
          this.allHoas = res.hoas ?? [];
          this.moduleHoaMappings = res.moduleHoaMappings ?? [];
          this.updateModuleHoaOptions(this.selectedModuleCode);
        },
        error: (err) => this.setError(err),
      });
  }

  loadWalletBalance(): void {
    const licenseeId = (this.paymentForm.get('licenseeId')?.value as string)?.trim();
    if (!licenseeId) {
      this.errorMessage = 'Enter Licensee ID to fetch wallet balance.';
      return;
    }

    this.isWalletLoading = true;
    this.clearMessages();

    this.paymentService.clearWalletCache(licenseeId);
    this.paymentService
      .getWalletBalance(licenseeId)
      .pipe(finalize(() => (this.isWalletLoading = false)))
      .subscribe({
        next: (res) => {
          this.walletRows = res.results ?? [];
          this.successMessage = `Wallet balances loaded for ${licenseeId}.`;
        },
        error: (err) => this.setError(err),
      });
  }

  initiatePayment(): void {
    this.clearMessages();
    this.paymentForm.markAllAsTouched();

    if (this.paymentForm.invalid) {
      this.errorMessage = 'Please complete required payment fields.';
      return;
    }

    const items = this.itemRows.controls.map((ctrl: AbstractControl) => ({
      headOfAccount: String(ctrl.get('headOfAccount')?.value || '').trim(),
      amount: Number(ctrl.get('amount')?.value || 0),
    }));

    if (items.some((x) => !x.headOfAccount || x.amount <= 0)) {
      this.errorMessage = 'Each HOA row requires a valid Head of Account and amount.';
      return;
    }

    this.isInitiating = true;
    const gatewaySlNoValue = this.paymentForm.get('gatewaySlNo')?.value;

    this.paymentService
      .initiatePayment({
        paymentModuleCode: this.paymentForm.get('paymentModuleCode')?.value,
        payerId: this.paymentForm.get('payerId')?.value,
        items,
        gatewaySlNo:
          gatewaySlNoValue === null || gatewaySlNoValue === '' ? undefined : Number(gatewaySlNoValue),
        requisitionIdNo: this.paymentForm.get('requisitionIdNo')?.value || undefined,
      })
      .pipe(finalize(() => (this.isInitiating = false)))
      .subscribe({
        next: (res) => {
          this.latestInitiation = res;
          this.statusForm.patchValue({
            utr: res.utr,
            responseTxnamount: res.transactionAmount,
          });
          this.successMessage = `Transaction initiated successfully. UTR: ${res.utr}`;
          this.loadTransactions();
          this.loadTransactionDetail(res.utr);
        },
        error: (err) => this.setError(err),
      });
  }

  loadTransactions(): void {
    this.isTransactionsLoading = true;

    const limitRaw = this.filterForm.get('limit')?.value;
    const limitValue = Number(limitRaw);

    this.paymentService
      .listTransactions({
        payerId: this.filterForm.get('payerId')?.value || undefined,
        paymentModuleCode: this.filterForm.get('paymentModuleCode')?.value || undefined,
        paymentStatus: this.filterForm.get('paymentStatus')?.value || undefined,
        utr: this.filterForm.get('utr')?.value || undefined,
        limit: Number.isFinite(limitValue) ? limitValue : 20,
      })
      .pipe(finalize(() => (this.isTransactionsLoading = false)))
      .subscribe({
        next: (res) => {
          this.transactions = res.results ?? [];
        },
        error: (err) => this.setError(err),
      });
  }

  loadTransactionDetail(utr: string): void {
    if (!utr) {
      return;
    }

    this.paymentService.getTransaction(utr).subscribe({
      next: (res) => {
        this.selectedTransaction = res;
      },
      error: (err) => this.setError(err),
    });
  }

  selectTransaction(txn: PaymentTransaction): void {
    this.selectedTransaction = txn;
    this.statusForm.patchValue({
      utr: txn.utr,
      paymentStatus: txn.paymentStatus || 'P',
      responseAuthstatus: txn.responseAuthstatus || '',
      responseErrorstatus: txn.responseErrorstatus || '',
      responseErrordescription: txn.responseErrordescription || '',
      responseTxnreferenceno: txn.responseTxnreferenceno || '',
      responseBankreferenceno: txn.responseBankreferenceno || '',
      responseTxnamount: txn.responseTxnamount ?? txn.transactionAmount ?? null,
    });
  }

  updateTransactionStatus(): void {
    this.clearMessages();
    this.statusForm.markAllAsTouched();
    if (this.statusForm.invalid) {
      this.errorMessage = 'Please provide UTR and payment status.';
      return;
    }

    const utr = this.statusForm.get('utr')?.value as string;
    if (!utr) {
      this.errorMessage = 'UTR is required to update status.';
      return;
    }

    const amount = this.statusForm.get('responseTxnamount')?.value;
    const payload = {
      paymentStatus: this.statusForm.get('paymentStatus')?.value,
      responseAuthstatus: this.statusForm.get('responseAuthstatus')?.value || undefined,
      responseErrorstatus: this.statusForm.get('responseErrorstatus')?.value || undefined,
      responseErrordescription:
        this.statusForm.get('responseErrordescription')?.value || undefined,
      responseTxnreferenceno: this.statusForm.get('responseTxnreferenceno')?.value || undefined,
      responseBankreferenceno:
        this.statusForm.get('responseBankreferenceno')?.value || undefined,
      responseTxnamount:
        amount === null || amount === '' || Number.isNaN(Number(amount))
          ? undefined
          : Number(amount),
    } as const;

    this.isStatusUpdating = true;
    this.paymentService
      .updateTransactionStatus(utr, payload)
      .pipe(finalize(() => (this.isStatusUpdating = false)))
      .subscribe({
        next: (res) => {
          this.selectedTransaction = res;
          this.successMessage = `Status updated for UTR ${utr}.`;
          this.loadTransactions();
        },
        error: (err) => this.setError(err),
      });
  }

  getHoaDescription(hoaCode: string): string {
    const row = this.allHoas.find((x) => x.headOfAccount === hoaCode);
    return row?.detailedHeadDriscription || '';
  }

  getGatewaySummary(): string {
    const slNo = this.paymentForm.get('gatewaySlNo')?.value;
    const gateway = this.gateways.find((x) => x.slNo === Number(slNo));
    if (!gateway) {
      return 'Default active gateway from backend will be used.';
    }
    return `${gateway.paymentGatewayName} | Merchant: ${gateway.merchantid}`;
  }

  private createItemFormGroup(): FormGroup {
    return this.fb.group({
      headOfAccount: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
    });
  }

  private updateModuleHoaOptions(moduleCode: string): void {
    if (!moduleCode) {
      this.moduleHoaOptions = [];
      return;
    }
    this.moduleHoaOptions = this.moduleHoaMappings.filter(
      (row) => row.moduleCode === moduleCode && row.isActive === 'Y'
    );
  }

  private resetItemHeadSelection(): void {
    this.itemRows.controls.forEach((ctrl: AbstractControl) => {
      ctrl.get('headOfAccount')?.setValue('');
    });
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  private setError(err: unknown): void {
    const httpErr = err as HttpErrorResponse;
    this.errorMessage =
      (httpErr?.error?.detail as string) ||
      (httpErr?.error?.message as string) ||
      httpErr?.message ||
      'Payment integration request failed.';
  }
}
