import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BilldeskWalletRechargeInitiatePayload,
  BilldeskWalletRechargeInitiateResponse,
  BilldeskLicenseFeeInitiatePayload,
  BilldeskSecurityDepositInitiatePayload,
  BilldeskNewLicenseApplicationFeeInitiatePayload,
  ModuleHoaResponse,
  PaymentInitiatePayload,
  PaymentInitiateResponse,
  PaymentMasterDataResponse,
  PaymentStatusUpdatePayload,
  PaymentTransaction,
  PaymentTransactionListResponse,
  WalletBalanceResponse,
  WalletSummaryResponse,
  WalletTransactionResponse,
} from '../models/payment-integration.model';

import { getDeviceMetadata } from '../../shared/utils/device-utils';
import Swal from 'sweetalert2';

// Centralized SDK definition
declare global {
  interface Window {
    loadBillDeskSdk: (config: any) => void;
  }
}

@Injectable({
  providedIn: 'root',
})
export class PaymentIntegrationService {
  private readonly baseUrl = `${environment.apiBaseUrl}/transactional/payment`;
  private readonly gatewayUrl = `${environment.apiBaseUrl}/transactional/payment-gateway`;

  // Use a Subject to tell components when a payment is finished
  private paymentStatusSource = new Subject<{ status: string, applicationId: string }>();
  paymentStatus$ = this.paymentStatusSource.asObservable();

  private readonly billdeskRetryStateKey = 'new_license_billdesk_retry_state_v1';
  private readonly billdeskCooldownSeconds = 15 * 60;

  constructor(private http: HttpClient) { }

  getMasterData(moduleCode?: string): Observable<PaymentMasterDataResponse> {
    let params = new HttpParams();
    if (moduleCode) {
      params = params.set('module_code', moduleCode);
    }
    return this.http.get<PaymentMasterDataResponse>(`${this.baseUrl}/master-data/`, { params });
  }

  getModuleHoas(moduleCode: string): Observable<ModuleHoaResponse> {
    return this.http.get<ModuleHoaResponse>(`${this.baseUrl}/modules/${moduleCode}/hoas/`);
  }

  getWalletBalance(licenseeId: string): Observable<WalletBalanceResponse> {
    return this.http.get<WalletBalanceResponse>(`${this.baseUrl}/wallet/${licenseeId}/`);
  }

  getWalletSummary(licenseeId: string, moduleType?: string): Observable<WalletSummaryResponse> {
    let params = new HttpParams();
    if (moduleType) {
      params = params.set('module_type', moduleType);
    }
    return this.http.get<WalletSummaryResponse>(`${this.baseUrl}/wallet/${licenseeId}/summary/`, { params });
  }

  getWalletRecharge(licenseeId: string, limit = 200): Observable<WalletTransactionResponse> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<WalletTransactionResponse>(`${this.baseUrl}/wallet/${licenseeId}/recharge/`, { params });
  }

  creditWalletRecharge(
    licenseeId: string,
    payload: {
      transaction_id: string;
      wallet_type: string;
      head_of_account: string;
      amount: number;
      remarks?: string;
    }
  ): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/wallet/${licenseeId}/recharge/credit/`, payload);
  }

  getWalletHistory(licenseeId: string, limit = 500): Observable<WalletTransactionResponse> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<WalletTransactionResponse>(`${this.baseUrl}/wallet/${licenseeId}/history/`, { params });
  }

  initiatePayment(payload: PaymentInitiatePayload): Observable<PaymentInitiateResponse> {
    return this.http.post<PaymentInitiateResponse>(`${this.baseUrl}/transactions/initiate/`, payload);
  }

  initiateBilldeskWalletRecharge(
    payload: BilldeskWalletRechargeInitiatePayload
  ): Observable<BilldeskWalletRechargeInitiateResponse> {
    return this.http.post<BilldeskWalletRechargeInitiateResponse>(
      `${this.gatewayUrl}/billdesk/initiate/`,
      payload
    );
  }

  initiateBilldeskLicenseFee(
    payload: BilldeskLicenseFeeInitiatePayload
  ): Observable<BilldeskWalletRechargeInitiateResponse> {
    return this.http.post<BilldeskWalletRechargeInitiateResponse>(
      `${this.gatewayUrl}/billdesk/initiate/license-fee/`,
      payload
    );
  }

  initiateBilldeskSecurityDeposit(
    payload: BilldeskSecurityDepositInitiatePayload
  ): Observable<BilldeskWalletRechargeInitiateResponse> {
    return this.http.post<BilldeskWalletRechargeInitiateResponse>(
      `${this.gatewayUrl}/billdesk/initiate/security-deposit/`,
      payload
    );
  }

  initiateBilldeskNewLicenseApplicationFee(
    payload: BilldeskNewLicenseApplicationFeeInitiatePayload
  ): Observable<BilldeskWalletRechargeInitiateResponse> {
    return this.http.post<BilldeskWalletRechargeInitiateResponse>(
      `${this.gatewayUrl}/billdesk/initiate/new-license-application-fee/`,
      payload
    );
  }

  getPaymentModule(moduleCode: string): Observable<any> {
    return this.http.get<any>(`${this.gatewayUrl}/modules/${encodeURIComponent(String(moduleCode || '').trim())}/`);
  }

  // Calls the Django endpoint to create the BillDesk order
  initiateNewLicenseFee(applicationId: string, amount?: number): Observable<any> {
    const payload = {
      application_id: applicationId,
      device_data: getDeviceMetadata(),
      // Note: payment_module_code and head_of_account will default securely on the backend if omitted.
    } as any;

    if (typeof amount === 'number' && isFinite(amount) && amount > 0) {
      payload.amount = amount;
    }

    return this.http.post(`${environment.apiBaseUrl}/transactional/payment-gateway/billdesk/initiate/new-license-application-fee/`, payload);
  }

  listTransactions(filters?: {
    payerId?: string;
    paymentModuleCode?: string;
    paymentStatus?: string;
    utr?: string;
    limit?: number;
  }): Observable<PaymentTransactionListResponse> {
    let params = new HttpParams();
    if (filters?.payerId) {
      params = params.set('payer_id', filters.payerId);
    }
    if (filters?.paymentModuleCode) {
      params = params.set('payment_module_code', filters.paymentModuleCode);
    }
    if (filters?.paymentStatus) {
      params = params.set('payment_status', filters.paymentStatus);
    }
    if (filters?.utr) {
      params = params.set('utr', filters.utr);
    }
    if (typeof filters?.limit === 'number') {
      params = params.set('limit', String(filters.limit));
    }
    return this.http.get<PaymentTransactionListResponse>(`${this.baseUrl}/transactions/`, { params });
  }

  getTransaction(utr: string): Observable<PaymentTransaction> {
    return this.http.get<PaymentTransaction>(`${this.baseUrl}/transactions/${utr}/`);
  }

  updateTransactionStatus(
    utr: string,
    payload: PaymentStatusUpdatePayload
  ): Observable<PaymentTransaction> {
    return this.http.patch<PaymentTransaction>(`${this.baseUrl}/transactions/${utr}/status/`, payload);
  }

  launchBillDeskSDK(apiData: any, callback: (txn: any) => void): void {
    const config = {
      flowType: "payments",
      flowConfig: {
        merchantId: apiData.merchantId || apiData.merchant_id,
        bdOrderId: apiData.bdOrderId || apiData.bd_order_id,
        authToken: apiData.authToken || apiData.auth_token,
        childWindow: true,
        returnUrl: environment.payment.callbackUrl, // Single point of truth
        retryCount: 3
      },
      responseHandler: callback
    };

    if (typeof window !== 'undefined' && window.loadBillDeskSdk) {
      window.loadBillDeskSdk(config);
    } else {
      throw new Error('BillDesk SDK not loaded');
    }
  }

  handleInitiationError(err: any, applicationId: string): void {
    Swal.close();
    const retrySeconds = this.extractRetryAfterSeconds(err);
    if (retrySeconds > 0) {
      this.showBilldeskPendingRetryPopup(retrySeconds);
      return;
    }

    const timerSeconds = this.recordBilldeskFailure(applicationId);
    if (timerSeconds > 0) {
      this.showCooldownPopup(timerSeconds);
      return;
    }

    const msg = err?.error?.detail || err?.message || 'Unable to initiate payment.';
    void Swal.fire('Error', msg, 'error');
  }

  private extractRetryAfterSeconds(err: any): number {
    const httpStatus = Number(err?.status || 0);
    if (httpStatus !== 409) return 0;
    const raw = err?.error?.retry_after_seconds || err?.error?.retryAfterSeconds || 0;
    const seconds = Number(raw);
    return Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  }

  private showBilldeskPendingRetryPopup(retryAfterSeconds: number): void {
    const totalSeconds = Math.max(1, Math.floor(retryAfterSeconds));
    const format = (seconds: number) => {
      const s = Math.max(0, Math.floor(seconds));
      const mm = String(Math.floor(s / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      return `${mm}:${ss}`;
    };

    let interval: any;
    void Swal.fire({
      icon: 'info',
      title: 'Payment Already Pending',
      html: `A BillDesk transaction is already pending. Please wait <b>${format(totalSeconds)}</b> and try again.`,
      showConfirmButton: true,
      confirmButtonText: 'OK',
      allowOutsideClick: false,
      didOpen: () => {
        const content = Swal.getHtmlContainer();
        let remaining = totalSeconds;
        interval = setInterval(() => {
          remaining -= 1;
          if (!content) return;
          const b = content.querySelector('b');
          if (b) b.textContent = format(remaining);
          if (remaining <= 0) clearInterval(interval);
        }, 1000);
      },
      willClose: () => {
        if (interval) clearInterval(interval);
      },
    });
  }

  showCooldownPopup(retryAfterSeconds: number): void {
    const totalSeconds = Math.max(1, Math.floor(retryAfterSeconds));
    const format = (seconds: number) => {
      const s = Math.max(0, Math.floor(seconds));
      const mm = String(Math.floor(s / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      return `${mm}:${ss}`;
    };

    let interval: any;
    void Swal.fire({
      icon: 'info',
      title: 'Please Try Later',
      html: `There seems to be an issue with the payment server. Please try again after <b>${format(totalSeconds)}</b>.`,
      showConfirmButton: true,
      confirmButtonText: 'OK',
      allowOutsideClick: false,
      didOpen: () => {
        const content = Swal.getHtmlContainer();
        let remaining = totalSeconds;
        interval = setInterval(() => {
          remaining -= 1;
          if (!content) return;
          const b = content.querySelector('b');
          if (b) b.textContent = format(remaining);
          if (remaining <= 0) clearInterval(interval);
        }, 1000);
      },
      willClose: () => {
        if (interval) clearInterval(interval);
      },
    });
  }

  // Returns cooldown seconds if lock started, otherwise 0.
  recordBilldeskFailure(applicationId: string): number {
    const id = String(applicationId || '').trim();
    if (!id) return 0;

    const state = this.readRetryState();
    const current = state[id] || { failures: 0 };

    const now = Date.now();
    const cooldownUntil = Number(current.cooldownUntil || 0);
    if (cooldownUntil && Number.isFinite(cooldownUntil) && now < cooldownUntil) {
      return Math.max(1, Math.floor((cooldownUntil - now) / 1000));
    }

    const failures = Number(current.failures || 0) + 1;
    if (failures >= 3) {
      const until = now + this.billdeskCooldownSeconds * 1000;
      state[id] = { failures: 0, cooldownUntil: until };
      this.writeRetryState(state);
      return this.billdeskCooldownSeconds;
    }

    state[id] = { failures };
    this.writeRetryState(state);
    return 0;
  }

  private readRetryState(): Record<string, { failures: number; cooldownUntil?: number }> {
    try {
      const raw = String(localStorage.getItem(this.billdeskRetryStateKey) || '').trim();
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private writeRetryState(state: Record<string, { failures: number; cooldownUntil?: number }>): void {
    try {
      localStorage.setItem(this.billdeskRetryStateKey, JSON.stringify(state || {}));
    } catch {
      // no-op
    }
  }

  getCooldownRemainingSeconds(applicationId: string): number {
    const id = String(applicationId || '').trim();
    if (!id) return 0;

    const state = this.readRetryState();
    const entry = state[id];
    const until = Number(entry?.cooldownUntil || 0);
    if (!until || !Number.isFinite(until)) return 0;

    const now = Date.now();
    if (now >= until) {
      delete state[id];
      this.writeRetryState(state);
      return 0;
    }

    return Math.max(1, Math.floor((until - now) / 1000));
  }

  clearRetryState(applicationId: string): void {
    const id = String(applicationId || '').trim();
    if (!id) return;

    const state = this.readRetryState();
    if (state[id]) {
      delete state[id];
      this.writeRetryState(state);
    }
  }

}
