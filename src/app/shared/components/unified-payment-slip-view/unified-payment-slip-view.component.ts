import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SupplyChainService } from '../../../features/licensee/supplyChain/services/supplychain.service';
import { HologramDataService } from '../../../features/licensee/supplyChain/services/hologram-data.service';
import { DistributorPermitService } from '../../../core/services/distributor-permit.service';

interface TransitPermitRow {
  id: number;
  bill_no: string;
  date: string;
  sole_distributor_name: string;
  depot_address: string;
  vehicle_number: string;
  licensee_id: string;
  status: string;
  status_code: string;
  brand: string;
  size_ml: number;
  cases: number;
  bottles_per_case: number;
  bottle_type: string;
  total_excise_duty: number;
  total_education_cess: number;
  total_additional_excise: number;
  total_bottling_fee?: number;
  bottling_fee_rs_per_case?: number;
  total_amount: number;
}

interface TpCancellationRow {
  id: number;
  reference_no: string;
  cancellation_date: string;
  cancelled_by: string;
  quantity_cases: number;
  quantity_bottles: number;
  amount_refunded: number;
  reason: string;
  permit_date: string;
  destination: string;
  vehicle_no: string;
  depot_address: string;
  brand_name: string;
}

interface RequisitionSlipRow {
  id: number;
  reference_no: string;
  submission_date: string;
  distillery_name: string;
  applicant_name?: string;
  licensee_id?: string;
  status: string;
  quantity_bl: number;
  number_of_permits: string | number;
  permit_numbers?: string;
  transaction_id?: string;
  transaction_ids?: string[];
  purpose: string;
  amount: number;
  import_fee?: number;
  additional_ed?: number;
  education_cess?: number;
  payment_method?: string;
  wallet_transactions?: Array<{
    transaction_id: string;
    wallet_type: string;
    head_of_account: string;
    amount: number;
    created_at?: string;
    remarks?: string;
    reference_no?: string;
  }>;
  permit_wise_details?: any[];
  line_items?: any[];
}

interface RevalidationSlipRow {
  id: number;
  reference_no: string;
  submission_date: string;
  distillery_name: string;
  factory_name?: string;
  status: string;
  quantity_bl: number;
  permit_numbers: string;
  original_permit_date: string;
  expiry_date: string;
  revalidation_fee: number;
  transaction_id?: string;
  number_of_permits?: number;
}

interface CancellationSlipRow {
  id: number;
  reference_no: string;
  cancellation_date: string;
  distillery_name: string;
  status: string;
  original_requisition_ref: string;
  cancelled_permit_numbers: string;
  total_permits_cancelled: number;
  refund_amount: number;
  cancellation_fee: number;
  reason: string;
}

interface HologramSlipRow {
  id: number;
  reference_no: string;
  submission_date: string;
  distillery_name: string;
  status: string;
  local_qty: number;
  export_qty: number;
  defence_qty: number;
  total_qty: number;
  amount: number;
  payment_status: string;
  payment_details: any;
}

@Component({
  selector: 'app-unified-payment-slip-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './unified-payment-slip-view.component.html',
  styleUrl: './unified-payment-slip-view.component.scss'
})
export class UnifiedPaymentSlipViewComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  pageTitle = 'Unified Payment Slip';

  moduleType = '';
  applicationId = '';
  referenceNo = '';
  source = '';
  backSection = '';
  transitRows: TransitPermitRow[] = [];
  cancellationRows: TpCancellationRow[] = [];
  requisitionRow: RequisitionSlipRow | null = null;
  revalidationRow: RevalidationSlipRow | null = null;
  cancellationRow: CancellationSlipRow | null = null;
  hologramRow: HologramSlipRow | null = null;

  showAllTransactionIds = false;
  showAllWalletTxns = false;

  get allTransactionIds(): string[] {
    if (this.requisitionRow?.transaction_ids && Array.isArray(this.requisitionRow.transaction_ids) && this.requisitionRow.transaction_ids.length > 0) {
      return this.requisitionRow.transaction_ids.map(id => String(id).trim()).filter(Boolean);
    }
    const raw = String(this.requisitionRow?.transaction_id || '').trim();
    if (!raw || raw === '-') return [];
    return raw.split(',').map(id => id.trim()).filter(Boolean);
  }

  get displayedTransactionIds(): string[] {
    const list = this.allTransactionIds;
    if (this.showAllTransactionIds || list.length <= 3) {
      return list;
    }
    return list.slice(0, 3);
  }

  get displayedWalletTransactions(): any[] {
    const list = this.requisitionRow?.wallet_transactions || [];
    if (this.showAllWalletTxns || list.length <= 4) {
      return list;
    }
    return list.slice(0, 4);
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supplyChainService: SupplyChainService,
    private http: HttpClient,
    private hologramDataService: HologramDataService,
    private distributorPermitService: DistributorPermitService
  ) {}

  ngOnInit(): void {
    const q = this.route.snapshot.queryParams || {};

    console.log('🔍 PAYMENT SLIP VIEW: Query params received:', q);

    this.moduleType = String(q['type'] || q['module'] || 'transit').trim().toLowerCase();
    this.applicationId = String(q['id'] || '').trim();
    this.referenceNo = String(q['billNo'] || q['referenceNo'] || q['refNo'] || q['ref'] || '').trim();
    this.source = String(q['source'] || '').trim();
    this.backSection = String(q['section'] || q['fromSection'] || '').trim().toLowerCase();

    if (this.isImfl()) {
      if (this.moduleType === 'requisition') {
        this.pageTitle = 'IMFL Requisition Payment Slip';
      } else if (this.moduleType === 'revalidation') {
        this.pageTitle = 'IMFL Revalidation Payment Slip';
      } else if (this.moduleType === 'cancellation') {
        this.pageTitle = 'IMFL Cancellation Payment Slip';
      } else {
        this.pageTitle = 'IMFL Payment Slip';
      }
    } else {
      this.pageTitle = this.moduleType === 'transit' ? 'Transit Payment Slip' : `${this.toTitle(this.moduleType)} Payment Slip`;
    }

    console.log('🔍 PAYMENT SLIP VIEW: Parsed params:', {
      moduleType: this.moduleType,
      applicationId: this.applicationId,
      referenceNo: this.referenceNo,
      source: this.source
    });

    if (!this.referenceNo && !this.applicationId) {
      console.error('❌ PAYMENT SLIP VIEW: Missing reference number and application ID');
      this.errorMessage = 'Reference number or application ID is required to view payment slip.';
      this.isLoading = false;
      return;
    }

    if (this.moduleType === 'requisition') {
      console.log('🔍 PAYMENT SLIP VIEW: Loading requisition slip...');
      this.loadRequisitionSlip();
      return;
    }

    if (this.moduleType === 'revalidation') {
      console.log('🔍 PAYMENT SLIP VIEW: Loading revalidation slip...');
      this.loadRevalidationSlip();
      return;
    }

    if (this.moduleType === 'cancellation') {
      console.log('🔍 PAYMENT SLIP VIEW: Loading cancellation slip...');
      this.loadCancellationSlip();
      return;
    }

    if (this.moduleType === 'hologram') {
      console.log('🔍 PAYMENT SLIP VIEW: Loading hologram slip...');
      this.loadHologramSlip();
      return;
    }

    console.log('🔍 PAYMENT SLIP VIEW: Loading transit/cancellation data...');

    const cancellationUrl = `${environment.apiBaseUrl}/transactional/supply_chain/brand-warehouse/brand-warehouse/tp-cancellations/`;

    forkJoin({
      transit: this.supplyChainService.getTransitPermits(this.referenceNo).pipe(catchError(() => of([]))),
      cancellations: this.http.get<any>(cancellationUrl, {
        params: { reference_no: this.referenceNo }
      }).pipe(catchError(() => of({ results: [] })))
    }).subscribe({
      next: ({ transit, cancellations }) => {
        const transitRows = Array.isArray(transit) ? transit : [];
        this.transitRows = transitRows.map((row: any) => ({
          id: Number(row.id || 0),
          bill_no: String(row.bill_no || row.billNo || ''),
          date: String(row.date || ''),
          sole_distributor_name: String(row.sole_distributor_name || row.soleDistributorName || ''),
          depot_address: String(row.depot_address || row.depotAddress || ''),
          vehicle_number: String(row.vehicle_number || row.vehicleNumber || ''),
          licensee_id: String(row.licensee_id || row.licenseeId || ''),
          status: String(row.status || ''),
          status_code: String(row.status_code || row.statusCode || ''),
          brand: String(row.brand || ''),
          size_ml: Number(row.size_ml || row.sizeMl || 0),
          cases: Number(row.cases || 0),
          bottles_per_case: Number(row.bottles_per_case || row.bottlesPerCase || 0),
          bottle_type: String(row.bottle_type || row.bottleType || ''),
          total_excise_duty: Number(row.total_excise_duty || row.totalExciseDuty || 0),
          total_education_cess: Number(row.total_education_cess || row.totalEducationCess || 0),
          total_additional_excise: Number(row.total_additional_excise || row.totalAdditionalExcise || 0),
          total_bottling_fee: Number(row.total_bottling_fee || row.totalBottlingFee || 0),
          bottling_fee_rs_per_case: Number(row.bottling_fee_rs_per_case || row.bottlingFeeRsPerCase || row.bottling_fee || row.bottlingFee || 0),
          total_amount: Number(row.total_amount || row.totalAmount || 0),
        }));

        const cancellationList = Array.isArray(cancellations?.results) ? cancellations.results : [];
        const fallbackTransitAmounts = this.transitRows.map((row) => Number(row.total_amount || 0));
        let transitFallbackIndex = 0;

        this.cancellationRows = cancellationList.map((row: any) => ({
          id: Number(row.id || 0),
          reference_no: String(row.reference_no || row.permit_no || this.referenceNo || ''),
          cancellation_date: String(row.cancellation_date || row.created_at || ''),
          cancelled_by: String(row.cancelled_by || row.cancelledBy || 'Officer In-Charge'),
          quantity_cases: Number(
            row.quantity_cases ||
            row.quantityCases ||
            this.findMatchedTransitRow(String(row.brand_name || row.brandName || ''), Number(row.quantity_cases || row.quantityCases || 0))?.cases ||
            0
          ),
          quantity_bottles: Number(
            row.quantity_bottles ||
            row.quantityBottles ||
            row.bottles_reversed ||
            row.bottlesReversed ||
            0
          ),
          amount_refunded: this.resolveRowRefundAmount(
            row,
            fallbackTransitAmounts,
            () => transitFallbackIndex++
          ),
          reason: String(row.reason || row.remarks || ''),
          permit_date: String(row.permit_date || row.permitDate || ''),
          destination: String(row.destination || ''),
          vehicle_no: String(row.vehicle_no || row.vehicleNo || ''),
          depot_address: String(row.depot_address || row.depotAddress || ''),
          brand_name: this.resolveBrandName(row),
        }));

        if (!this.transitRows.length && !this.cancellationRows.length) {
          this.errorMessage = `No transit/cancellation records found for reference ${this.referenceNo}.`;
        }
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load payment slip details.';
        this.isLoading = false;
      }
    });
  }

  isImfl(): boolean {
    const ref = String(this.referenceNo || this.applicationId || '').trim().toUpperCase();
    const src = String(this.source || '').trim().toLowerCase();
    const mod = String(this.moduleType || '').trim().toLowerCase();
    const back = String(this.backSection || '').trim().toLowerCase();

    // Explicit bulk spirit / ENA prefixes are never IMFL
    if (
      ref.startsWith('REQ/') ||
      ref.startsWith('REV/') ||
      ref.startsWith('CAN/') ||
      ref.startsWith('ENA/') ||
      ref.startsWith('DIST/')
    ) {
      return false;
    }

    return (
      ref.startsWith('IMFL') ||
      ref.startsWith('IMP/') ||
      ref.startsWith('IMP-') ||
      src === 'distributor-permit' ||
      src === 'imfl-requisition' ||
      src === 'imfl-revalidation' ||
      src === 'imfl-cancellation' ||
      src === 'imfl' ||
      mod === 'distributor-permit' ||
      mod.startsWith('imfl-') ||
      back === 'distributor-permit'
    );
  }

  goBack(): void {
    if (this.isImfl()) {
      const tabParam = this.moduleType === 'cancellation' ? 'cancellation' : (this.moduleType === 'revalidation' ? 'revalidation' : 'requisition');
      this.router.navigate(['/dashboard'], {
        queryParams: { section: 'distributor-permit', tab: tabParam }
      });
      return;
    }

    const src = String(this.source || '').trim().toLowerCase();
    if (src === 'permit-section' || src === 'permit_section') {
      if (this.moduleType === 'requisition' || this.moduleType === 'bulk-spirit') {
        this.router.navigate(['/dashboard'], { queryParams: { section: 'requisition' } });
        return;
      } else if (this.moduleType === 'revalidation') {
        this.router.navigate(['/dashboard'], { queryParams: { section: 'revalidation' } });
        return;
      } else if (this.moduleType === 'cancellation') {
        this.router.navigate(['/dashboard'], { queryParams: { section: 'cancellation' } });
        return;
      }
    }

    const section = this.resolveBackSection();
    this.router.navigate(['/dashboard'], {
      queryParams: { section }
    });
  }

  printSlip(): void {
    const printContent = document.querySelector('.slip-card');
    if (!printContent) {
      console.error('Print content not found');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Please allow popups to print');
      return;
    }

    const styles = `
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 11px;
          line-height: 1.5;
          color: #000;
        }
        .slip-card {
          padding: 12mm;
          border: 3px solid #2563eb;
          border-radius: 8px;
          position: relative;
        }
        .watermark {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .watermark::before {
          content: 'SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE\\ASIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE\\ASIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE\\ASIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE\\ASIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE\\ASIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE\\ASIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE\\ASIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE\\ASIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE\\ASIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE\\ASIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE\\ASIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE  SIKKIM EXCISE';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          font-size: 14px;
          font-weight: 700;
          color: rgba(37, 99, 235, 0.12);
          white-space: pre-line;
          line-height: 4.5;
          text-align: left;
          letter-spacing: 2px;
          padding: 10px;
        }
        .slip-card > *:not(.watermark) {
          position: relative;
          z-index: 1;
        }
        .official-header {
          margin-bottom: 12px;
          padding-bottom: 10px;
          border-bottom: 2px solid #2563eb;
        }
        .header-content {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
          justify-content: center;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }
        .govt-seal {
          width: 60px;
          height: 60px;
          filter: invert(1) brightness(0.2);
        }
        .title-section {
          text-align: left;
        }
        .title-section {
          flex: 1;
          text-align: center;
        }
        .govt-name {
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 3px;
        }
        .dept-name {
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 5px;
        }
        .dept-address, .dept-contact {
          font-size: 10px;
          color: #666;
          margin-bottom: 2px;
        }
        .slip-title-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e5e7eb;
        }
        .slip-title {
          font-size: 20px;
          font-weight: 700;
        }
        .status-badge {
          padding: 5px 12px;
          border-radius: 14px;
          font-size: 10px;
          font-weight: 600;
          background: #10b981;
          color: white;
        }
        .source-badge {
          padding: 3px 8px;
          background: #f3f4f6;
          border-radius: 8px;
          font-size: 9px;
          color: #6b7280;
        }
        .summary-section {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 15px;
        }
        .summary-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border-radius: 8px;
          border: 2px solid #e5e7eb;
        }
        .primary-card { 
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border-color: #3b82f6;
        }
        .success-card { 
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          border-color: #10b981;
        }
        .warning-card { 
          background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%);
          border-color: #f97316;
        }
        .danger-card { 
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          border-color: #ef4444;
        }
        .info-card { 
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-color: #f59e0b;
        }
        .card-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 700;
          border-radius: 8px;
          background: white;
        }
        .card-label {
          font-size: 8px;
          font-weight: 600;
          text-transform: uppercase;
          color: #666;
          margin-bottom: 4px;
        }
        .card-value {
          font-size: 18px;
          font-weight: 800;
        }
        .info-section {
          margin-bottom: 15px;
        }
        .section-title {
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 2px solid #2563eb;
          color: #1f2937;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          background: #f9fafb;
          padding: 10px;
          border-radius: 6px;
          border: 2px solid #e5e7eb;
        }
        .info-item {
          display: flex;
          justify-content: space-between;
          padding: 8px;
          background: white;
          border-radius: 4px;
          border: 1px solid #e5e7eb;
        }
        .info-label {
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          color: #666;
        }
        .info-value {
          font-size: 10px;
          font-weight: 600;
          text-align: right;
        }
        .info-value.amount {
          color: #059669;
          font-size: 12px;
        }
        .module-badge {
          padding: 3px 8px;
          background: #2563eb;
          color: white;
          border-radius: 8px;
          font-size: 9px;
          font-weight: 600;
        }
        .details-section {
          margin-bottom: 15px;
        }
        .table-container {
          border-radius: 6px;
          border: 2px solid #2563eb;
          overflow: hidden;
        }
        .modern-table {
          width: 100%;
          border-collapse: collapse;
        }
        .modern-table thead {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        }
        .modern-table th {
          padding: 8px 6px;
          font-size: 8px;
          font-weight: 700;
          color: white;
          text-transform: uppercase;
          text-align: left;
          border-right: 1px solid rgba(255,255,255,0.2);
        }
        .modern-table th:last-child {
          border-right: none;
        }
        .modern-table td {
          padding: 6px;
          font-size: 9px;
          border-bottom: 1px solid #e5e7eb;
          border-right: 1px solid #f3f4f6;
          word-wrap: break-word;
        }
        .modern-table td:last-child {
          border-right: none;
        }
        .modern-table tr:last-child td {
          border-bottom: none;
        }
        .modern-table tbody tr:hover {
          background-color: #f9fafb;
        }
        .amount-cell {
          font-weight: 700;
          color: #059669;
          font-size: 10px;
        }
        .table-status {
          padding: 2px 6px;
          background: #dbeafe;
          color: #1e40af;
          border-radius: 8px;
          font-size: 7px;
          font-weight: 600;
          display: inline-block;
        }
        .official-footer {
          margin-top: 15px;
          padding-top: 10px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
        }
        .footer-text {
          font-size: 9px;
          color: #666;
          margin: 3px 0;
        }
        .no-print {
          display: none !important;
        }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Slip - ${this.referenceNo}</title>
          <meta charset="utf-8">
          ${styles}
        </head>
        <body>
          ${printContent.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 500);
  }

  get transitSummary() {
    if (this.moduleType === 'requisition') {
      const amount = Number(this.requisitionRow?.amount || 0);
      const excise = Number(this.requisitionRow?.import_fee || 0);
      const addl = Number(this.requisitionRow?.additional_ed || 0);
      const cess = Number(this.requisitionRow?.education_cess || 0);
      return { total: amount, excise, cess, addl, bottlingFee: 0 };
    }
    if (this.moduleType === 'revalidation') {
      const amount = Number(this.revalidationRow?.revalidation_fee || 0);
      return { total: amount, excise: amount, cess: 0, addl: 0, bottlingFee: 0 };
    }
    if (this.moduleType === 'cancellation') {
      const amount = Number(this.cancellationRow?.refund_amount || 0);
      return { total: amount, excise: amount, cess: 0, addl: 0, bottlingFee: 0 };
    }
    if (this.moduleType === 'hologram') {
      const amount = Number(
        this.hologramRow?.payment_details?.total_amount ??
        this.hologramRow?.payment_details?.wallet_payment ??
        this.hologramRow?.amount ??
        0
      );
      return { total: amount, excise: amount, cess: 0, addl: 0, bottlingFee: 0 };
    }

    const total = this.transitRows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
    const excise = this.transitRows.reduce((sum, row) => sum + Number(row.total_excise_duty || 0), 0);
    const cess = this.transitRows.reduce((sum, row) => sum + Number(row.total_education_cess || 0), 0);
    const addl = this.transitRows.reduce((sum, row) => sum + Number(row.total_additional_excise || 0), 0);
    const bottlingFee = this.transitRows.reduce((sum, row) => sum + Number(row.total_bottling_fee || 0), 0);
    return { total, excise, cess, addl, bottlingFee };
  }

  get totalCases(): number | string {
    if (this.moduleType === 'requisition') {
      // Return the string value directly (permit numbers sequence)
      return this.requisitionRow?.number_of_permits || '0';
    }
    if (this.moduleType === 'revalidation') {
      // Return the permit numbers for revalidation
      return this.revalidationRow?.permit_numbers || '0';
    }
    if (this.moduleType === 'cancellation') {
      // Show actual cancelled permit number(s), not just count.
      return this.cancellationRow?.cancelled_permit_numbers || '-';
    }
    if (this.moduleType === 'hologram') {
      return this.hologramRow?.total_qty || 0;
    }
    return this.transitRows.reduce((sum, row) => sum + Number(row.cases || 0), 0);
  }

  get currentStatus(): string {
    if (this.moduleType === 'requisition') {
      return String(this.requisitionRow?.status || '').trim() || 'N/A';
    }
    if (this.moduleType === 'revalidation') {
      return String(this.revalidationRow?.status || '').trim() || 'N/A';
    }
    if (this.moduleType === 'cancellation') {
      return String(this.cancellationRow?.status || '').trim() || 'N/A';
    }
    if (this.moduleType === 'hologram') {
      return String(this.hologramRow?.status || this.hologramRow?.payment_status || '').trim() || 'N/A';
    }
    const status = String(this.transitRows[0]?.status || '').trim();
    return status || 'N/A';
  }

  get isRefundCase(): boolean {
    if (this.moduleType === 'requisition' || this.moduleType === 'revalidation') {
      return false;
    }
    if (this.moduleType === 'cancellation') {
      return true; // Cancellations are always refund cases
    }
    if (this.cancellationRows.length > 0) return true;
    const status = this.currentStatus.toLowerCase();
    return status.includes('rejected') || status.includes('cancelled') || status.includes('refund');
  }

  get refundAmountTotal(): number {
    if (this.moduleType === 'requisition') {
      return Number(this.requisitionRow?.amount || 0);
    }
    if (this.moduleType === 'revalidation') {
      return Number(this.revalidationRow?.revalidation_fee || 0);
    }
    if (this.moduleType === 'cancellation') {
      return Number(this.cancellationRow?.refund_amount || 0);
    }
    if (this.moduleType === 'hologram') {
      return Number(
        this.hologramRow?.payment_details?.total_amount ??
        this.hologramRow?.payment_details?.wallet_payment ??
        this.hologramRow?.amount ??
        0
      );
    }
    const explicitRefund = this.cancellationRows.reduce((sum, row) => sum + Number(row.amount_refunded || 0), 0);
    if (explicitRefund > 0) return explicitRefund;
    return this.isRefundCase ? Number(this.transitSummary.total || 0) : 0;
  }

  get statusClass(): string {
    const value = this.currentStatus.toLowerCase();
    if (value.includes('approved')) return 'approved';
    if (value.includes('rejected') || value.includes('cancelled') || value.includes('refund')) return 'rejected';
    if (value.includes('payment') || value.includes('pending')) return 'pending';
    return 'neutral';
  }

  private resolveRowRefundAmount(
    row: any,
    fallbackTransitAmounts: number[],
    nextIndex: () => number
  ): number {
    const explicitAmount = this.toNumber(
      row.amount_refunded ??
      row.amountRefunded ??
      row.refund_amount ??
      row.refunded_amount
    );
    if (explicitAmount > 0) return explicitAmount;

    const matched = this.findMatchedTransitRow(
      String(row.brand_name || row.brandName || ''),
      Number(row.quantity_cases || row.quantityCases || 0)
    );
    if (matched && Number(matched.total_amount || 0) > 0) return Number(matched.total_amount || 0);

    const fallback = fallbackTransitAmounts[nextIndex()] || 0;
    return Number(fallback || 0);
  }

  private resolveBrandName(row: any): string {
    const fromRow = String(row.brand_name || row.brandName || '').trim();
    if (fromRow) return fromRow;
    const matched = this.findMatchedTransitRow('', Number(row.quantity_cases || row.quantityCases || 0));
    return String(matched?.brand || '-');
  }

  private findMatchedTransitRow(brandName: string, cases: number): TransitPermitRow | undefined {
    const normalizedBrand = this.normalizeText(brandName);
    const byBrand = normalizedBrand
      ? this.transitRows.find((row) => this.normalizeText(row.brand).includes(normalizedBrand))
      : undefined;
    if (byBrand) return byBrand;
    if (cases > 0) return this.transitRows.find((row) => Number(row.cases || 0) === cases);
    return undefined;
  }

  private normalizeText(value: string): string {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private toNumber(value: any): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  get cancellationFeeTotal(): number {
    return Number(this.cancellationRow?.cancellation_fee || 0);
  }

  get showRefundSummaryCard(): boolean {
    return this.moduleType !== 'revalidation' && this.moduleType !== 'cancellation';
  }

  get showCountSummaryCard(): boolean {
    return this.moduleType !== 'revalidation';
  }

  get primarySummaryLabel(): string {
    if (this.moduleType === 'requisition') return 'Total Requisition Amount';
    if (this.moduleType === 'revalidation') return 'Revalidation Fee Paid';
    if (this.moduleType === 'hologram') return 'Total Hologram Amount';
    if (this.moduleType === 'cancellation') return 'Pass Fee Refund Amount';
    return 'Total Transit Amount';
  }

  get secondarySummaryLabel(): string {
    if (this.moduleType === 'requisition') return 'Payable Amount';
    if (this.moduleType === 'hologram') return 'Wallet Paid Amount';
    if (this.moduleType === 'cancellation') return 'Pass Fee Refund Amount';
    return 'Refund Amount';
  }

  get tertiarySummaryLabel(): string {
    if (this.moduleType === 'requisition') return 'No. of Permits';
    if (this.moduleType === 'hologram') return 'Total Holograms';
    if (this.moduleType === 'cancellation') return 'Permits Cancelled';
    return 'Total Cases';
  }

  get revalidationDisplayName(): string {
    return String(this.revalidationRow?.factory_name || this.revalidationRow?.distillery_name || '-').trim() || '-';
  }

  private resolveRevalidationQuantityBl(row: any): number {
    return this.toNumber(
      row?.totalBl ??
      row?.total_bl ??
      row?.quantity_bl ??
      row?.quantityBl ??
      row?.quantity ??
      row?.bl ??
      row?.totalQuantityBl ??
      row?.total_quantity_bl ??
      row?.requisition?.total_bl ??
      row?.requisition?.totalBl
    );
  }

  private toTitle(value: string): string {
    return String(value || '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (m) => m.toUpperCase());
  }

  private resolveBackSection(): string {
    if (this.isImfl()) {
      return 'distributor-permit';
    }

    const moduleToSection: Record<string, string> = {
      requisition: 'requisition',
      revalidation: 'revalidation',
      cancellation: 'cancellation',
      transit: 'transit',
      hologram: 'hologram'
    };

    if (this.backSection && Object.values(moduleToSection).includes(this.backSection)) {
      return this.backSection;
    }

    const moduleSection = moduleToSection[this.moduleType];
    if (moduleSection) return moduleSection;

    const sourceSection = String(this.source || '').trim().toLowerCase();
    if (sourceSection && Object.values(moduleToSection).includes(sourceSection)) {
      return sourceSection;
    }

    return 'transit';
  }

  private loadHologramSlip(): void {
    this.hologramDataService.getProcurements().subscribe({
      next: (rows: any[]) => {
        const list = Array.isArray(rows) ? rows : [];
        const row = list.find((r: any) => {
          const idMatch = this.applicationId && String(r?.id) === String(this.applicationId);
          const ref = String(r?.refNo || r?.ref_no || '').trim().toUpperCase();
          const refNeed = String(this.referenceNo || '').trim().toUpperCase();
          const refMatch = !!refNeed && ref === refNeed;
          return idMatch || refMatch;
        });

        if (!row) {
          this.errorMessage = `No hologram payment record found for reference ${this.referenceNo || this.applicationId}.`;
          this.isLoading = false;
          return;
        }

        const local = Number(row?.localQty ?? row?.local_qty ?? 0);
        const exportQty = Number(row?.exportQty ?? row?.export_qty ?? 0);
        const defence = Number(row?.defenceQty ?? row?.defence_qty ?? 0);
        const total = local + exportQty + defence;
        const paymentDetails = row?.paymentDetails || row?.payment_details || {};
        const amount = Number(paymentDetails?.total_amount ?? paymentDetails?.wallet_payment ?? total * 0.15);

        this.hologramRow = {
          id: Number(row?.id || 0),
          reference_no: String(row?.refNo || row?.ref_no || this.referenceNo || ''),
          submission_date: String(row?.date || row?.created_at || ''),
          distillery_name: String(row?.licenseeName || row?.licensee_name || row?.manufacturingUnit || row?.manufacturing_unit || '-'),
          status: String(row?.status || '-'),
          local_qty: local,
          export_qty: exportQty,
          defence_qty: defence,
          total_qty: total,
          amount,
          payment_status: String(row?.paymentStatus || row?.payment_status || paymentDetails?.payment_status || '-'),
          payment_details: paymentDetails
        };

        if (!this.referenceNo) {
          this.referenceNo = this.hologramRow.reference_no;
        }
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load hologram payment slip details.';
        this.isLoading = false;
      }
    });
  }

  private loadRequisitionSlip(): void {
    console.log('🔍 REQUISITION SLIP: Starting load with:', {
      applicationId: this.applicationId,
      referenceNo: this.referenceNo,
      source: this.source
    });

    if (this.isImfl()) {
      this.loadImflRequisitionSlip();
      return;
    }

    const detailUrl = this.applicationId
      ? `${environment.apiBaseUrl}/transactional/supply_chain/ena-requisitions/${encodeURIComponent(this.applicationId)}/`
      : '';

    console.log('🔍 REQUISITION SLIP: Detail URL:', detailUrl);

    const detail$ = detailUrl
      ? this.http.get<any>(detailUrl).pipe(
          catchError((error) => {
            console.error('❌ REQUISITION SLIP: Detail fetch error:', error);
            return of(null);
          })
        )
      : of(null);

    const listUrl = `${environment.apiBaseUrl}/transactional/supply_chain/ena-requisitions/`;
    const listParams = this.referenceNo ? { our_ref_no: this.referenceNo } : undefined;
    console.log('🔍 REQUISITION SLIP: List URL:', listUrl, 'Params:', listParams);

    const list$ = this.http.get<{results?: any[]}>(listUrl, {
      params: listParams
    }).pipe(
      catchError((error) => {
        console.error('❌ REQUISITION SLIP: List fetch error:', error);
        return of(null);
      })
    );

    forkJoin({ detail: detail$, list: list$ }).subscribe({
      next: ({ detail, list }) => {
        console.log('🔍 REQUISITION SLIP: API responses:', { detail, list });

        const typedList = list as {results?: any[]} | null;
        const listItems = Array.isArray(typedList) ? typedList : (Array.isArray(typedList?.results) ? typedList.results : []);
        console.log('🔍 REQUISITION SLIP: List items:', listItems);

        const byRef = listItems.find((item: any) => {
          const itemRef = String(item?.ourRefNo || item?.our_ref_no || item?.referenceNo || item?.ref_no || '').trim();
          console.log('🔍 REQUISITION SLIP: Comparing refs:', itemRef, 'vs', this.referenceNo);
          return itemRef === this.referenceNo;
        });

        console.log('🔍 REQUISITION SLIP: Found by ref:', byRef);

        const row = detail || byRef || listItems[0] || null;

        console.log('🔍 REQUISITION SLIP: Selected row:', row);

        if (!row) {
          this.errorMessage = `No requisition record found for reference ${this.referenceNo || this.applicationId}.`;
          console.error('❌ REQUISITION SLIP: No data found');
          this.isLoading = false;
          return;
        }

        this.requisitionRow = {
          id: Number(row.id || 0),
          reference_no: String(row.ourRefNo || row.our_ref_no || row.referenceNo || row.ref_no || this.referenceNo || ''),
          submission_date: String(row.submissionDate || row.submission_date || row.date || row.created_at || ''),
          distillery_name: String(row.liftedFromDistilleryName || row.lifted_from_distillery_name || row.distilleryName || row.distillery_name || '-'),
          status: String(row.status || '-'),
          quantity_bl: Number(row.totalbl || row.total_bl || row.quantity || 0),
          number_of_permits: this.resolveRequisitionPermitsDisplay(row),
          permit_numbers: this.resolveRequisitionPermitSequence(row),
          transaction_id: String(row.transaction_id || row.transactionId || ''),
          purpose: String(row.purpose_name || row.purposeName || row.purpose || '-'),
          amount: Number(
            row.paymentAmount ||
            row.payment_amount ||
            row.amount ||
            row.brAmount ||
            row.br_amount ||
            row.totalAmount ||
            row.total_amount ||
            0
          )
        };

        console.log('✅ REQUISITION SLIP: Loaded successfully:', this.requisitionRow);

        if (!this.referenceNo) {
          this.referenceNo = this.requisitionRow.reference_no;
        }

        // Always prefer actual wallet debit amount for this requisition reference.
        this.enrichRequisitionAmountFromWallet(row, this.requisitionRow.reference_no);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ REQUISITION SLIP: Fatal error:', error);
        this.errorMessage = 'Unable to load requisition payment slip details.';
        this.isLoading = false;
      }
    });
  }

  private loadImflRequisitionSlip(): void {
    const ref = this.referenceNo || this.applicationId;
    if (!ref) {
      this.errorMessage = 'Reference number or application ID is required to view payment slip.';
      this.isLoading = false;
      return;
    }

    console.log('🔍 IMFL REQUISITION SLIP: Fetching for ref:', ref);

    const detail$ = this.distributorPermitService.getApplication(ref).pipe(
      catchError((err) => {
        console.warn('Could not fetch IMFL application detail directly:', err);
        return of(null);
      })
    );

    const list$ = this.distributorPermitService.listApplications({ reference_no: ref }).pipe(
      catchError((err) => {
        console.warn('Could not list IMFL applications:', err);
        return of(null);
      })
    );

    forkJoin({ detail: detail$, list: list$ }).subscribe({
      next: ({ detail, list }) => {
        let row: any = detail;
        if (!row && list) {
          const items = Array.isArray(list) ? list : (Array.isArray(list?.results) ? list.results : (Array.isArray(list?.data) ? list.data : []));
          row = items.find((item: any) => {
            const itemRef = String(item?.reference_no || item?.referenceNo || item?.id || '').trim().toUpperCase();
            return itemRef === ref.toUpperCase();
          }) || items[0] || null;
        }

        if (!row) {
          this.errorMessage = `No requisition record found for reference ${this.referenceNo || this.applicationId}.`;
          this.isLoading = false;
          return;
        }

        let rawPermits = row.permit_wise_details || row.permitWiseDetails || [];
        if (typeof rawPermits === 'string') {
          try { rawPermits = JSON.parse(rawPermits); } catch(e) { rawPermits = []; }
        }
        if (!Array.isArray(rawPermits)) {
          rawPermits = [];
        }

        let rootLineItems = row.line_items || row.lineItems || [];
        if (typeof rootLineItems === 'string') {
          try { rootLineItems = JSON.parse(rootLineItems); } catch(e) { rootLineItems = []; }
        }
        if (!Array.isArray(rootLineItems)) {
          rootLineItems = [];
        }

        // If rawPermits is empty but we have root line items, group them by permit_number
        if (rawPermits.length === 0 && rootLineItems.length > 0) {
          const groupedByPermit = new Map<string, any[]>();
          rootLineItems.forEach((it: any) => {
            const pNo = String(it.permit_number || it.permitNumber || `${ref}-P1`).trim();
            if (!groupedByPermit.has(pNo)) {
              groupedByPermit.set(pNo, []);
            }
            groupedByPermit.get(pNo)!.push(it);
          });

          let pSeq = 1;
          groupedByPermit.forEach((items, pNo) => {
            rawPermits.push({
              permit_sequence: pSeq,
              permit_index: pSeq,
              permit_number: pNo,
              line_items: items
            });
            pSeq++;
          });
        }

        // If still empty, create at least 1 permit entry from row
        if (rawPermits.length === 0) {
          rawPermits.push({
            permit_sequence: 1,
            permit_index: 1,
            permit_number: `${ref}-P1`,
            line_items: rootLineItems.length > 0 ? rootLineItems : [row]
          });
        }

        const normalizedPermits = rawPermits.map((p: any, pIdx: number) => {
          const pSeq = Number(p.permit_sequence || p.permitSequence || p.permit_index || p.permitIndex || (pIdx + 1));
          const pNum = String(
            p.permit_number ||
            p.permitNumber ||
            p.permit_no ||
            p.permitNo ||
            `${row.reference_no || ref}-P${pSeq}`
          ).trim();

          let pLineItems = p.line_items || p.lineItems || p.items || p.brands || p.brand_details || p.products || [];
          if (typeof pLineItems === 'string') {
            try { pLineItems = JSON.parse(pLineItems); } catch(e) { pLineItems = []; }
          }
          if (!Array.isArray(pLineItems) || pLineItems.length === 0) {
            if (rootLineItems.length > 0) {
              const matched = rootLineItems.filter((it: any) => {
                const itPNum = String(it.permit_number || it.permitNumber || it.permit_no || it.permitNo || '').trim().toLowerCase();
                return itPNum && (itPNum === pNum.toLowerCase() || pNum.toLowerCase().includes(itPNum) || itPNum.includes(pNum.toLowerCase()));
              });
              if (matched.length > 0) {
                pLineItems = matched;
              } else if (rootLineItems[pIdx]) {
                pLineItems = [rootLineItems[pIdx]];
              } else {
                pLineItems = rootLineItems;
              }
            } else if (p.brand_name || p.brandName || p.brand || row.brand_name || row.brandName) {
              pLineItems = [p];
            } else {
              pLineItems = [{
                brand_name: 'IMFL Spirit',
                size_ml: 180,
                pieces_per_case: 6,
                cases: Number(p.total_cases || p.totalCases || p.cases || 1)
              }];
            }
          }

          const resolvedItems = pLineItems.map((item: any) => {
            const bName = this.cleanBrandName(
              String(item.brand_name || item.brandName || item.brand || p.brand_name || p.brand || row.brand_name || 'IMFL Spirit')
            );
            const sMl = Number(item.size_ml || item.sizeMl || item.pack_size || p.size_ml || 180);
            const bpc = Number(item.pieces_per_case || item.piecesPerCase || item.bottles_per_case || (sMl === 180 ? 6 : 12));
            const cases = Number(item.cases || item.allocated_cases || item.quantity_cases || item.quantityCases || p.total_cases || p.cases || 1);

            const importFeePerCase = Number(item.import_pass_fee_per_case ?? item.importPassFeePerCase ?? item.import_fee ?? (item.total_import ? item.total_import / cases : 1400));
            const addlEdPerCase = Number(item.additional_ed_per_case ?? item.additionalEdPerCase ?? item.additional_ed ?? (item.total_additional_ed ? item.total_additional_ed / cases : 350));
            const eduCessPerCase = Number(item.education_cess_per_case ?? item.educationCessPerCase ?? item.education_cess ?? (item.total_education_cess ? item.total_education_cess / cases : 60));

            const totalImport = Number(item.total_import ?? item.totalImport ?? item.total_import_fee ?? (importFeePerCase * cases));
            const totalAddl = Number(item.total_additional_ed ?? item.totalAdditionalEd ?? (addlEdPerCase * cases));
            const totalCess = Number(item.total_education_cess ?? item.totalEducationCess ?? (eduCessPerCase * cases));
            const bl = Number(item.bulk_litres ?? item.bulkLitres ?? item.total_bulk_litres ?? ((cases * sMl * bpc) / 1000));

            return {
              brand_name: bName,
              brandName: bName,
              size_ml: sMl,
              sizeMl: sMl,
              pieces_per_case: bpc,
              piecesPerCase: bpc,
              cases: cases,
              import_pass_fee_per_case: importFeePerCase,
              additional_ed_per_case: addlEdPerCase,
              education_cess_per_case: eduCessPerCase,
              total_import: totalImport,
              total_additional_ed: totalAddl,
              total_education_cess: totalCess,
              bulk_litres: bl,
              subtotal: totalImport + totalAddl + totalCess
            };
          });

          const pCases = Number(p.total_cases ?? p.totalCases ?? resolvedItems.reduce((s: number, it: any) => s + it.cases, 0));
          const pBl = Number(p.total_bulk_litres ?? p.totalBulkLitres ?? resolvedItems.reduce((s: number, it: any) => s + it.bulk_litres, 0));
          const pImportFee = Number(p.total_import_fee ?? p.totalImportFee ?? resolvedItems.reduce((s: number, it: any) => s + it.total_import, 0));
          const pAddlEd = Number(p.total_additional_ed ?? p.totalAdditionalEd ?? resolvedItems.reduce((s: number, it: any) => s + it.total_additional_ed, 0));
          const pEduCess = Number(p.total_education_cess ?? p.totalEducationCess ?? resolvedItems.reduce((s: number, it: any) => s + it.total_education_cess, 0));

          return {
            permit_sequence: pSeq,
            permit_number: pNum,
            permitNo: pNum,
            total_cases: pCases,
            totalCases: pCases,
            total_bulk_litres: pBl,
            totalBulkLitres: pBl,
            total_import_fee: pImportFee,
            totalImportFee: pImportFee,
            total_additional_ed: pAddlEd,
            totalAdditionalEd: pAddlEd,
            total_education_cess: pEduCess,
            totalEducationCess: pEduCess,
            line_items: resolvedItems,
            items: resolvedItems
          };
        });

        const permitNumbers = normalizedPermits.map((p: any) => p.permit_number).filter(Boolean).join(', ');
        const permitCount = normalizedPermits.length;
        const permitDisplay = permitNumbers ? `${permitCount} (${permitNumbers})` : String(permitCount);

        let importFee = normalizedPermits.reduce((sum: number, p: any) => sum + Number(p.total_import_fee || 0), 0);
        let addlEd = normalizedPermits.reduce((sum: number, p: any) => sum + Number(p.total_additional_ed || 0), 0);
        let eduCess = normalizedPermits.reduce((sum: number, p: any) => sum + Number(p.total_education_cess || 0), 0);
        let totalBl = normalizedPermits.reduce((sum: number, p: any) => sum + Number(p.total_bulk_litres || 0), 0);

        if (importFee === 0) {
          importFee = Number(row.total_import_value ?? row.total_import_fee ?? row.totalImportValue ?? row.totalImportFee ?? 0);
        }
        if (addlEd === 0) {
          addlEd = Number(row.total_additional_ed ?? row.totalAdditionalEd ?? 0);
        }
        if (eduCess === 0) {
          eduCess = Number(row.total_education_cess ?? row.totalEducationCess ?? 0);
        }

        let totalAmount = importFee + eduCess + addlEd;
        if (totalAmount <= 0) {
          totalAmount = Number(row.amount || row.payment_amount || row.paymentAmount || row.total_amount || row.totalAmount || 0);
        }

        this.requisitionRow = {
          id: Number(row.id || 0) || 1,
          reference_no: String(row.reference_no || row.referenceNo || this.referenceNo || ref),
          submission_date: String(row.submitted_at || row.submittedAt || row.created_at || row.createdAt || row.submission_date || ''),
          distillery_name: String(row.supplier_company_name || row.supplierCompanyName || row.applicant_name || row.applicantName || '-'),
          applicant_name: String(row.applicant_name || row.applicantName || row.applicant?.name || '-'),
          licensee_id: String(row.licensee_id || row.licenseeId || ''),
          status: String(row.current_stage_name || row.currentStageName || row.status || '-'),
          quantity_bl: totalBl || Number(row.total_bulk_litres ?? row.totalBulkLitres ?? row.quantity_bl ?? row.quantityBl ?? 0),
          number_of_permits: permitDisplay,
          permit_numbers: permitNumbers,
          transaction_id: String(row.transaction_id || row.transactionId || ''),
          purpose: 'IMFL Import Requisition',
          amount: totalAmount,
          import_fee: importFee,
          additional_ed: addlEd,
          education_cess: eduCess,
          payment_method: 'Wallet (Excise & Cess)',
          permit_wise_details: normalizedPermits,
          line_items: rootLineItems
        };

        if (!this.referenceNo) {
          this.referenceNo = this.requisitionRow.reference_no;
        }

        this.enrichRequisitionAmountFromWallet(row, this.requisitionRow.reference_no);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading IMFL requisition payment slip:', err);
        this.errorMessage = 'Unable to load requisition payment slip details.';
        this.isLoading = false;
      }
    });
  }

  private enrichRequisitionAmountFromWallet(sourceRow: any, referenceNo: string): void {
    const ref = String(referenceNo || '').trim();
    if (!ref) return;

    const licenseeId =
      String(
        sourceRow?.licensee_id ||
        sourceRow?.licenseeId ||
        sourceRow?.applicant?.licensee_id ||
        sourceRow?.applicant?.username ||
        this.getLicenseeIdFromSession()
      ).trim();

    if (!licenseeId) return;

    const historyUrl = `${environment.apiBaseUrl}/transactional/payment/wallet/${encodeURIComponent(licenseeId)}/history/`;
    this.http.get<any>(historyUrl, { params: { limit: '500' } })
      .pipe(catchError(() => of({ results: [] })))
      .subscribe((response) => {
        const rows = Array.isArray(response)
          ? response
          : (Array.isArray(response?.results) ? response.results : []);

        const targetRef = ref.toUpperCase();
        const targetRefClean = targetRef.replace(/[^A-Z0-9]/g, '');

        const candidates = rows.filter((row: any) => {
          const rowRef = String(row?.reference_no || row?.referenceNo || '').trim().toUpperCase();
          const rowRefClean = rowRef.replace(/[^A-Z0-9]/g, '');
          const txnId = String(row?.transaction_id || row?.transactionId || '').toUpperCase();
          const txnIdClean = txnId.replace(/[^A-Z0-9]/g, '');
          const remarks = String(row?.remarks || '').toUpperCase();
          const remarksClean = remarks.replace(/[^A-Z0-9]/g, '');
          const sourceModule = String(row?.source_module || row?.sourceModule || '').toLowerCase();
          const entryType = String(row?.entry_type || row?.entryType || '').toLowerCase();
          const type = String(row?.transaction_type || row?.transactionType || '').toLowerCase();

          // Match reference or permit numbers or transaction ids
          const isRefMatch =
            (rowRef && (rowRef === targetRef || rowRef.startsWith(targetRef) || targetRef.startsWith(rowRef) || rowRefClean.includes(targetRefClean) || targetRefClean.includes(rowRefClean))) ||
            remarks.includes(targetRef) ||
            remarksClean.includes(targetRefClean) ||
            txnId.includes(targetRef) ||
            txnId.includes(targetRef.replace(/\//g, '_')) ||
            txnIdClean.includes(targetRefClean);

          if (!isRefMatch) return false;

          const isDebitLike =
            entryType === 'dr' ||
            entryType.includes('debit') ||
            entryType.includes('utilized') ||
            type === 'dr' ||
            type.includes('debit') ||
            type === 'payment' ||
            type.includes('recharge') === false;

          const looksRequisition =
            sourceModule.includes('requisition') ||
            sourceModule.includes('imfl_permit') ||
            sourceModule.includes('permit') ||
            txnId.startsWith('PAY-EXCISE') ||
            txnId.startsWith('PAY-CESS') ||
            txnId.startsWith('REQ-') ||
            remarks.includes('REQUISITION') ||
            remarks.includes('IMPORT PASS');

          return isDebitLike && (looksRequisition || isRefMatch);
        });

        if (!candidates.length) return;

        candidates.sort((a: any, b: any) => {
          const at = new Date(a?.created_at || a?.createdAt || 0).getTime();
          const bt = new Date(b?.created_at || b?.createdAt || 0).getTime();
          return at - bt;
        });

        let importFeePaid = 0;
        let additionalEdPaid = 0;
        let educationCessPaid = 0;
        let totalPaid = 0;

        const walletTxns: any[] = [];
        const txnIdSet = new Set<string>();

        candidates.forEach((c: any) => {
          const amt = Number(c?.amount || 0);
          const txnId = String(c?.transaction_id || c?.transactionId || c?.wallet_transaction_id || '').trim();
          const wtype = String(c?.wallet_type?.code || c?.wallet_type?.name || c?.wallet_type || c?.walletType || '').toLowerCase();
          const srcMod = String(c?.source_module || c?.sourceModule || '').toLowerCase();
          const hoa = String(c?.head_of_account || c?.headOfAccount || '-');
          const refNo = String(c?.reference_no || c?.referenceNo || ref);
          const rem = String(c?.remarks || '');
          const dt = String(c?.created_at || c?.createdAt || '');

          if (txnId) txnIdSet.add(txnId);

          if (wtype.includes('additional') || srcMod.includes('additional') || rem.toLowerCase().includes('additional')) {
            additionalEdPaid += amt;
          } else if (wtype.includes('education') || wtype.includes('cess') || srcMod.includes('education') || srcMod.includes('cess')) {
            educationCessPaid += amt;
          } else {
            importFeePaid += amt;
          }
          totalPaid += amt;

          walletTxns.push({
            transaction_id: txnId,
            wallet_type: wtype,
            head_of_account: hoa,
            amount: amt,
            created_at: dt,
            remarks: rem,
            reference_no: refNo
          });
        });

        if (this.requisitionRow) {
          if (totalPaid > 0) {
            this.requisitionRow.amount = totalPaid;
          }
          if (importFeePaid > 0) {
            this.requisitionRow.import_fee = importFeePaid;
          }
          if (additionalEdPaid > 0) {
            this.requisitionRow.additional_ed = additionalEdPaid;
          }
          if (educationCessPaid > 0) {
            this.requisitionRow.education_cess = educationCessPaid;
          }
          this.requisitionRow.wallet_transactions = walletTxns;

          const txnIdsList = Array.from(txnIdSet);
          if (txnIdsList.length > 0) {
            this.requisitionRow.transaction_id = txnIdsList.join(', ');
            this.requisitionRow.transaction_ids = txnIdsList;
          }
        }
      });
  }

  cleanBrandName(name: string): string {
    if (!name) return '-';
    return String(name).replace(/[`'"]/g, '').trim();
  }

  formatWalletTypeName(type: string): string {
    const t = String(type || '').trim().toLowerCase();
    if (t.includes('additional')) return 'Excise Duty Wallet (Addl. ED)';
    if (t.includes('education') || t.includes('cess')) return 'Education Cess Wallet';
    if (t.includes('excise')) return 'Excise Duty Wallet';
    if (t.includes('hologram')) return 'Hologram Wallet';
    if (t.includes('security')) return 'Security Deposit Wallet';
    if (t.includes('license')) return 'License Fee Wallet';
    return this.toTitle(type);
  }

  private resolveRequisitionPermitSequence(row: any): string {
    return String(
      row?.details_permits_number ||
      row?.detailsPermitsNumber ||
      row?.permit_numbers ||
      row?.permitNumbers ||
      ''
    ).trim();
  }

  private resolveRequisitionPermitsDisplay(row: any): string {
    const sequence = this.resolveRequisitionPermitSequence(row);
    const explicitCount = Number(
      row?.requisiton_number_of_permits ||
      row?.requisitonNumberOfPermits ||
      row?.numberOfPermits ||
      row?.number_of_permits ||
      0
    );

    let count = Number.isFinite(explicitCount) && explicitCount > 0 ? explicitCount : 0;
    if (!count && sequence) {
      count = sequence
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0).length;
    }
    if (!count) count = 1;

    return sequence ? `${count} (${sequence})` : String(count);
  }

  private getLicenseeIdFromSession(): string {
    try {
      const raw = sessionStorage.getItem('currentUser');
      if (raw) {
        const parsed = JSON.parse(raw);
        const val = parsed?.licensee_id || parsed?.licenseeId || parsed?.licensee_id_no || parsed?.licenseeIdNo || parsed?.username;
        if (val) return String(val).trim();
      }
      const fromLocal = localStorage.getItem('currentUser') || localStorage.getItem('user');
      if (fromLocal) {
        const parsed = JSON.parse(fromLocal);
        const val = parsed?.licensee_id || parsed?.licenseeId || parsed?.licensee_id_no || parsed?.licenseeIdNo || parsed?.username;
        if (val) return String(val).trim();
      }
      const rawUser = localStorage.getItem('username');
      if (rawUser) return String(rawUser).trim();
      return '';
    } catch {
      return '';
    }
  }

  private loadRevalidationSlip(): void {
    console.log('🔍 REVALIDATION SLIP: Starting load with:', {
      applicationId: this.applicationId,
      referenceNo: this.referenceNo
    });

    if (this.isImfl()) {
      this.loadImflRevalidationSlip();
      return;
    }

    const detailUrl = this.applicationId
      ? `${environment.apiBaseUrl}/transactional/supply_chain/ena-revalidations/${encodeURIComponent(this.applicationId)}/`
      : '';

    console.log('🔍 REVALIDATION SLIP: Detail URL:', detailUrl);

    const detail$ = detailUrl
      ? this.http.get<any>(detailUrl).pipe(
          catchError((error) => {
            console.error('❌ REVALIDATION SLIP: Detail fetch error:', error);
            return of(null);
          })
        )
      : of(null);

    const listUrl = `${environment.apiBaseUrl}/transactional/supply_chain/ena-revalidations/`;
    const listParams = this.referenceNo ? { our_ref_no: this.referenceNo } : undefined;
    console.log('🔍 REVALIDATION SLIP: List URL:', listUrl, 'Params:', listParams);

    const list$ = this.http.get<{results?: any[]}>(listUrl, {
      params: listParams
    }).pipe(
      catchError((error) => {
        console.error('❌ REVALIDATION SLIP: List fetch error:', error);
        return of(null);
      })
    );

    forkJoin({ detail: detail$, list: list$ }).subscribe({
      next: ({ detail, list }) => {
        console.log('🔍 REVALIDATION SLIP: API responses:', { detail, list });

        const typedList = list as {results?: any[]} | null;
        const listItems = Array.isArray(typedList) ? typedList : (Array.isArray(typedList?.results) ? typedList.results : []);
        console.log('🔍 REVALIDATION SLIP: List items:', listItems);

        const byRef = listItems.find((item: any) => {
          const itemRef = String(item?.ourRefNo || item?.our_ref_no || item?.referenceNo || item?.ref_no || '').trim();
          console.log('🔍 REVALIDATION SLIP: Comparing refs:', itemRef, 'vs', this.referenceNo);
          return itemRef === this.referenceNo;
        });

        console.log('🔍 REVALIDATION SLIP: Found by ref:', byRef);

        const row = detail || byRef || listItems[0] || null;

        console.log('🔍 REVALIDATION SLIP: Selected row:', row);

        if (!row) {
          this.errorMessage = `No revalidation record found for reference ${this.referenceNo || this.applicationId}.`;
          console.error('❌ REVALIDATION SLIP: No data found');
          this.isLoading = false;
          return;
        }

        const permitSequence = String(row.details_permits_number || row.detailsPermitsNumber || row.permit_numbers || row.permitNumbers || row.permit_number || row.permitNumber || '').trim();
        const parsedPermitCount = permitSequence
          ? permitSequence.split(',').map((s: string) => s.trim()).filter(Boolean).length
          : 0;

        const permitCount = Number(row.requisiton_number_of_permits || row.requisitonNumberOfPermits || row.number_of_permits || row.numberOfPermits || 0) ||
          parsedPermitCount || 1;

        let fee = Number(
          row.revalidation_br_amount ||
          row.revalidationBrAmount ||
          row.revalidation_fee ||
          row.revalidationFee ||
          row.fee_amount ||
          row.feeAmount ||
          0
        );

        const expectedFee = permitCount * 5000;
        if (fee <= 0 || fee === 1000 || fee < expectedFee) {
          fee = expectedFee;
        }

        this.revalidationRow = {
          id: Number(row.id || 0),
          reference_no: String(row.ourRefNo || row.our_ref_no || row.referenceNo || row.ref_no || this.referenceNo || ''),
          submission_date: String(row.revalidationDate || row.revalidation_date || row.submissionDate || row.submission_date || row.date || row.created_at || ''),
          factory_name: String(row.establishment_name || row.establishmentName || row.factory_name || row.factoryName || ''),
          distillery_name: String(row.liftedFromDistilleryName || row.lifted_from_distillery_name || row.distilleryName || row.distillery_name || '-'),
          status: String(row.status || '-'),
          quantity_bl: this.resolveRevalidationQuantityBl(row),
          permit_numbers: permitSequence || '-',
          original_permit_date: String(row.requisitionDate || row.requisition_date || row.originalPermitDate || row.original_permit_date || ''),
          expiry_date: String(row.expiryDate || row.expiry_date || row.revalidationDate || row.revalidation_date || ''),
          revalidation_fee: fee,
          number_of_permits: permitCount
        };

        console.log('✅ REVALIDATION SLIP: Loaded successfully:', this.revalidationRow);

        if (!this.referenceNo) {
          this.referenceNo = this.revalidationRow.reference_no;
        }
        this.enrichRevalidationAmountFromWallet(row, this.revalidationRow.reference_no);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ REVALIDATION SLIP: Fatal error:', error);
        this.errorMessage = 'Unable to load revalidation payment slip details.';
        this.isLoading = false;
      }
    });
  }

  private enrichRevalidationAmountFromWallet(sourceRow: any, referenceNo: string): void {
    const ref = String(referenceNo || '').trim();
    if (!ref) return;

    const licenseeId =
      String(
        sourceRow?.licensee_id ||
        sourceRow?.licenseeId ||
        this.getLicenseeIdFromSession()
      ).trim();

    if (!licenseeId) return;

    const historyUrl = `${environment.apiBaseUrl}/transactional/payment/wallet/${licenseeId}/history/`;
    this.http.get<any>(historyUrl, { params: { limit: '500' } })
      .pipe(catchError(() => of({ results: [] })))
      .subscribe((response) => {
        const rows = Array.isArray(response)
          ? response
          : (Array.isArray(response?.results) ? response.results : []);

        const targetRef = ref.toUpperCase();
        const candidates = rows.filter((row: any) => {
          const rowRef = String(row?.reference_no || row?.referenceNo || '').trim().toUpperCase();
          if (!rowRef || rowRef !== targetRef) return false;

          const entryType = String(row?.entry_type || row?.entryType || '').toLowerCase();
          const type = String(row?.transaction_type || row?.transactionType || '').toLowerCase();
          const isDebitLike =
            entryType.includes('debit') ||
            entryType.includes('utilized') ||
            entryType.includes('dr') ||
            type.includes('debit');

          return isDebitLike;
        });

        if (!candidates.length) return;

        candidates.sort((a: any, b: any) => {
          const at = new Date(a?.created_at || a?.createdAt || 0).getTime();
          const bt = new Date(b?.created_at || b?.createdAt || 0).getTime();
          return bt - at;
        });

        const latest = candidates[0];
        const paidAmount = Number(latest?.amount || 0);
        const permitCount = Number(this.revalidationRow?.number_of_permits || 1);
        const expectedFee = permitCount * 5000;
        const effectiveAmount = Math.max(paidAmount, expectedFee);

        if (Number.isFinite(effectiveAmount) && effectiveAmount > 0 && this.revalidationRow) {
          this.revalidationRow.revalidation_fee = effectiveAmount;
        }
        if (this.revalidationRow) {
          const txnId = String(
            latest?.transaction_id ||
            latest?.transactionId ||
            latest?.wallet_transaction_id ||
            latest?.walletTransactionId ||
            ''
          ).trim();
          if (txnId) {
            this.revalidationRow.transaction_id = txnId;
          }
        }
      });
  }

  private loadImflRevalidationSlip(): void {
    const ref = this.referenceNo || this.applicationId;
    this.distributorPermitService.getRevalidationDetail(ref).pipe(
      catchError(() => this.distributorPermitService.getRevalidations({ reference_no: ref }))
    ).subscribe({
      next: (res: any) => {
        const row = res?.data || (Array.isArray(res?.results) ? res.results[0] : (Array.isArray(res) ? res[0] : res));
        if (!row) {
          this.errorMessage = `No revalidation record found for reference ${this.referenceNo || this.applicationId}.`;
          this.isLoading = false;
          return;
        }
        this.revalidationRow = {
          id: Number(row.id || 0),
          reference_no: String(row.reference_no || row.referenceNo || this.referenceNo || ref),
          submission_date: String(row.revalidation_date || row.revalidationDate || row.submission_date || row.created_at || ''),
          factory_name: String(row.establishment_name || row.supplier_company_name || row.applicant_name || '-'),
          distillery_name: String(row.supplier_company_name || row.distillery_name || '-'),
          status: String(row.current_stage_name || row.status || '-'),
          quantity_bl: Number(row.total_bulk_litres || row.quantity_bl || 0),
          permit_numbers: String(row.permit_number || row.permit_numbers || '-'),
          original_permit_date: String(row.original_permit_date || row.permit_date || ''),
          expiry_date: String(row.extended_validity_date || row.expiry_date || ''),
          revalidation_fee: Number(row.fee || row.revalidation_fee || 5000),
          number_of_permits: Number(row.number_of_permits || row.numberOfPermits || 1)
        };
        if (!this.referenceNo) {
          this.referenceNo = this.revalidationRow.reference_no;
        }
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load revalidation payment slip details.';
        this.isLoading = false;
      }
    });
  }

  private loadCancellationSlip(): void {
    console.log('🔍 CANCELLATION SLIP: Starting load with:', {
      applicationId: this.applicationId,
      referenceNo: this.referenceNo
    });

    if (this.isImfl()) {
      this.loadImflCancellationSlip();
      return;
    }

    const url = `${environment.apiBaseUrl}/transactional/supply_chain/ena-cancellation-details/`;
    let params: any = {};

    if (this.applicationId) {
      params = { id: this.applicationId };
    } else if (this.referenceNo) {
      params = { our_ref_no: this.referenceNo };
    }

    console.log('🔍 CANCELLATION SLIP: Fetching from:', url, 'with params:', params);

    this.http.get<any>(url, { params }).pipe(
      catchError(err => {
        console.error('❌ CANCELLATION SLIP: HTTP error:', err);
        return of(null);
      })
    ).subscribe({
      next: (response) => {
        console.log('🔍 CANCELLATION SLIP: Raw response:', response);

        if (!response) {
          this.errorMessage = 'No cancellation data received from server.';
          this.isLoading = false;
          return;
        }

        let data: any[] = [];
        if (Array.isArray(response)) {
          data = response;
        } else if (response.results && Array.isArray(response.results)) {
          data = response.results;
        } else if (response.data && Array.isArray(response.data)) {
          data = response.data;
        } else {
          data = [response];
        }

        console.log('🔍 CANCELLATION SLIP: Parsed data array:', data);

        let row: any = null;
        if (this.applicationId) {
          row = data.find((r: any) => String(r.id) === String(this.applicationId));
        } else if (this.referenceNo) {
          row = data.find((r: any) => 
            String(r.ourRefNo || r.our_ref_no || r.referenceNo || r.ref_no || '').trim().toUpperCase() === 
            String(this.referenceNo).trim().toUpperCase()
          );
        }

        if (!row && data.length > 0) {
          row = data[0];
        }

        if (!row) {
          this.errorMessage = 'Cancellation record not found.';
          this.isLoading = false;
          return;
        }

        const permitCount = Number(row.permitNocount || row.permit_nocount || 0) ||
          (String(row.cancelled_permit_numbers || row.cancelledPermitNumbers || row.cancelled_permit_number || row.cancelledPermitNumber || row.details_permits_number || row.detailsPermitsNumber || '').split(',').map((s: string) => s.trim()).filter(Boolean).length) || 1;

        const fee = Number(
          row.cancellationBrAmount ||
          row.cancellation_br_amount ||
          row.feeAmount ||
          row.fee_amount ||
          row.cancellationFee ||
          row.cancellation_fee ||
          0
        );

        this.cancellationRow = {
          id: Number(row.id || 0),
          reference_no: String(row.ourRefNo || row.our_ref_no || row.referenceNo || row.ref_no || this.referenceNo || ''),
          cancellation_date: String(row.cancellationDate || row.cancellation_date || row.submissionDate || row.submission_date || row.date || row.created_at || ''),
          distillery_name: String(row.branchName || row.branch_name || row.distilleryName || row.distillery_name || '-'),
          status: String(row.status || '-'),
          original_requisition_ref: String(
            row.requisition_ref_no ||
            row.requisitionRefNo ||
            row.originalRequisitionRef ||
            row.original_requisition_ref ||
            row.requisition ||
            '-'
          ),
          cancelled_permit_numbers: String(
            row.cancelled_permit_numbers ||
            row.cancelledPermitNumbers ||
            row.cancelled_permit_number ||
            row.cancelledPermitNumber ||
            row.details_permits_number ||
            row.detailsPermitsNumber ||
            row.permit_no ||
            row.permitNo ||
            '-'
          ),
          total_permits_cancelled: permitCount,
          refund_amount: Number(row.totalCancellationAmount || row.total_cancellation_amount || 0),
          cancellation_fee: fee > 0 ? fee : (permitCount * 5000),
          reason: String(row.cancellationReason || row.cancellation_reason || 'Cancellation Request')
        };

        console.log('✅ CANCELLATION SLIP: Loaded successfully:', this.cancellationRow);

        if (!this.referenceNo) {
          this.referenceNo = this.cancellationRow.reference_no;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ CANCELLATION SLIP: Fatal error:', error);
        this.errorMessage = 'Unable to load cancellation payment slip details.';
        this.isLoading = false;
      }
    });
  }

  private loadImflCancellationSlip(): void {
    const ref = this.referenceNo || this.applicationId;
    this.distributorPermitService.getCancellation(ref).pipe(
      catchError(() => this.distributorPermitService.getCancellations({ reference_no: ref }))
    ).subscribe({
      next: (res: any) => {
        const row = res?.data || (Array.isArray(res?.results) ? res.results[0] : (Array.isArray(res) ? res[0] : res));
        if (!row) {
          this.errorMessage = `No cancellation record found for reference ${this.referenceNo || this.applicationId}.`;
          this.isLoading = false;
          return;
        }
        const imflPermitCount = Number(row.total_permits_cancelled || 1);
        const imflFee = Number(row.cancellation_fee || row.cancellationFee || row.processing_fee || (imflPermitCount * 1000));
        this.cancellationRow = {
          id: Number(row.id || 0),
          reference_no: String(row.reference_no || row.referenceNo || this.referenceNo || ref),
          cancellation_date: String(row.cancellation_date || row.created_at || ''),
          distillery_name: String(row.supplier_company_name || row.distillery_name || row.applicant_name || '-'),
          status: String(row.current_stage_name || row.status || '-'),
          original_requisition_ref: String(row.original_permit_application_ref || row.original_requisition_ref || '-'),
          cancelled_permit_numbers: String(row.cancelled_permit_number || row.permit_numbers || '-'),
          total_permits_cancelled: imflPermitCount,
          refund_amount: Number(row.refund_amount || row.total_refund_amount || 0),
          cancellation_fee: imflFee,
          reason: String(row.reason || 'Cancellation Request')
        };
        if (!this.referenceNo) {
          this.referenceNo = this.cancellationRow.reference_no;
        }
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load cancellation payment slip details.';
        this.isLoading = false;
      }
    });
  }
}
