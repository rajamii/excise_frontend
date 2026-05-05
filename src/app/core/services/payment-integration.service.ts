import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

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

@Injectable({
  providedIn: 'root',
})
export class PaymentIntegrationService {
  private readonly baseUrl = `${environment.apiBaseUrl}/transactional/payment`;
  private readonly gatewayUrl = `${environment.apiBaseUrl}/transactional/payment-gateway`;

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
}
