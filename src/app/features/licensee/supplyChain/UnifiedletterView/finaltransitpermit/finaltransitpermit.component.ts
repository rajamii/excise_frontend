import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../../../../../shared/material.module';
import { ActivatedRoute, Router } from '@angular/router';
import { SupplyChainService } from '../../services/supplychain.service';

@Component({
  selector: 'app-finaltransitpermit',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule],
  templateUrl: './finaltransitpermit.component.html',
  styleUrl: './finaltransitpermit.component.scss'
})
export class FinaltransitpermitComponent implements OnInit {
  permitData: any = null;
  currentDate = new Date();
  selectedColor: string = 'white';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supplyChainService: SupplyChainService
  ) { }

  ngOnInit() {
    this.loadPermitData();
  }

  onColorChange() {
    console.log('Color changed to:', this.selectedColor);
  }

  loadPermitData() {
    const data = localStorage.getItem('finalTransitPermitData');
    if (data) {
      try {
        this.permitData = JSON.parse(data);
        console.log('Loaded permit data from localStorage:', this.permitData);
      } catch (e) {
        console.error('Failed to parse finalTransitPermitData', e);
      }
    }

    const ref = this.route.snapshot.queryParamMap.get('ref') ||
      this.route.snapshot.queryParamMap.get('refNo') ||
      this.route.snapshot.queryParamMap.get('billNo') ||
      this.permitData?.bill_no;

    if (ref) {
      this.supplyChainService.getTransitPermits(ref, true).subscribe({
        next: (permits: any[]) => {
          if (permits && permits.length > 0) {
            const first = permits[0];
            const brands = permits.map(p => ({
              ...p,
              brand: p.brand || p.brand_name,
              cases: Number(p.cases || 0),
              size_ml: p.size_ml || p.sizeMl,
              total_amount: Number(p.total_amount || 0),
              total_excise_duty: Number(p.total_excise_duty || 0),
              total_education_cess: Number(p.total_education_cess || 0),
              total_additional_excise: Number(p.total_additional_excise || 0),
              total_bottling_fee: Number(p.total_bottling_fee || 0),
              excise_duty_rs_per_case: Number(p.excise_duty_rs_per_case || 0),
              education_cess_rs_per_case: Number(p.education_cess_rs_per_case || 0),
              additional_excise_duty_rs_per_case: Number(p.additional_excise_duty_rs_per_case || 0),
              bottling_fee_rs_per_case: Number(p.bottling_fee_rs_per_case || 0),
              wallet_transactions: p.wallet_transactions || []
            }));

            const calculatedTotal = brands.reduce((sum, b) => sum + (b.total_amount || 0), 0);

            // Collect all wallet transactions across permit rows
            const allTxns: any[] = [];
            brands.forEach(b => {
              if (Array.isArray(b.wallet_transactions) && b.wallet_transactions.length > 0) {
                allTxns.push(...b.wallet_transactions);
              }
            });
            const uniqueTxns = allTxns.length > 0
              ? Array.from(new Map(allTxns.map(t => [t.transaction_id, t])).values())
              : (this.permitData?.wallet_transactions || []);

            if (this.permitData) {
              this.permitData = {
                ...this.permitData,
                bill_no: this.permitData.bill_no || first.bill_no || ref,
                manufacturing_unit_name: this.permitData.manufacturing_unit_name || first.manufacturing_unit_name || first.distillery_name || '',
                sole_distributor_name: this.permitData.sole_distributor_name || first.sole_distributor_name || '',
                date: this.permitData.date || first.date || new Date().toISOString(),
                depot_address: this.permitData.depot_address || first.depot_address || '',
                vehicle_number: this.permitData.vehicle_number || first.vehicle_number || '',
                total_amount: calculatedTotal > 0 ? calculatedTotal : (Number(this.permitData.total_amount) || 0),
                brands: brands,
                wallet_transactions: uniqueTxns
              };
            } else {
              this.permitData = {
                bill_no: first.bill_no || ref,
                manufacturing_unit_name: first.manufacturing_unit_name || first.distillery_name || '',
                sole_distributor_name: first.sole_distributor_name || '',
                date: first.date || new Date().toISOString(),
                depot_address: first.depot_address || '',
                vehicle_number: first.vehicle_number || '',
                total_amount: calculatedTotal,
                brands: brands,
                wallet_transactions: uniqueTxns
              };
            }

            // Also directly fetch wallet transactions for this bill to guarantee real IDs are present
            this.supplyChainService.getTransitWalletTransactions(ref).subscribe({
              next: (txns) => {
                if (txns && txns.length > 0) {
                  this.permitData.wallet_transactions = txns;
                  if (this.permitData.brands) {
                    this.permitData.brands.forEach((b: any) => {
                      b.wallet_transactions = txns;
                    });
                  }
                  try {
                    localStorage.setItem('finalTransitPermitData', JSON.stringify(this.permitData));
                  } catch (e) { }
                }
              }
            });

            try {
              localStorage.setItem('finalTransitPermitData', JSON.stringify(this.permitData));
            } catch (e) {
              console.error('Failed to update localStorage with fresh permit data', e);
            }
            this.fetchMlData();
          }
        },
        error: (err) => console.error('Failed to load transit permit by ref', err)
      });
      return;
    }

    if (this.permitData) {
      this.fetchMlData();
    }
  }

  private fetchMlData() {
    // Fetch dynamic ML conversion data to ensure 'Total Bottles' is correct
    this.supplyChainService.getBrandMlInCases().subscribe({
      next: (mlData: any[]) => {
        if (this.permitData && this.permitData.brands) {
          this.permitData.brands.forEach((brand: any) => {
            const size = brand.size_ml || brand.sizeMl;
            const mlConfig = mlData.find((m: any) => m.ml == size);

            if (mlConfig) {
              brand.bottles_per_case = mlConfig.pieces_in_case || mlConfig.piecesInCase;
            }
          });
        }
      },
      error: (err) => console.error('Failed to load ML data for permit view', err)
    });
  }

  printPermit() {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (printWindow) {
      // Get the permit content
      const permitContent = document.querySelector('.permit-container');
      
      if (permitContent) {
        // Create the print HTML
        const printHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Transit Permit</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: 'Times New Roman', serif;
                background: white;
                margin: 0;
                padding: 0;
              }
              
              .permit-container {
                margin: 0;
                padding: 0;
                background: transparent;
              }
              
              .permit-container.yellow-bg .permit-page {
                background: #ffff99 !important;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
              }
              
              .permit-container.yellow-bg .permit-content {
                background: #ffff99 !important;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
              }
              
              .permit-page {
                width: 100%;
                padding: 8mm;
                background: white;
                page-break-after: always;
                page-break-inside: avoid;
                height: 100vh;
                min-height: 100vh;
                max-height: 100vh;
                overflow: hidden;
                position: relative;
              }
              
              .permit-page:last-child {
                page-break-after: auto;
              }
              
              .permit-page::before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 0;
                pointer-events: none;
                opacity: 0.2;
                background-image: url("data:image/svg+xml,%3Csvg width='300' height='300' viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cstyle%3E .watermark %7B font-size: 24px; font-weight: bold; fill: %23000; font-family: Arial, sans-serif; opacity: 0.5; %7D %3C/style%3E%3Ctext x='0' y='50' class='watermark'%3ESIKKIM EXCISE SIKKIM EXCISE%3C/text%3E%3Ctext x='0' y='100' class='watermark'%3ESIKKIM EXCISE SIKKIM EXCISE%3C/text%3E%3Ctext x='0' y='150' class='watermark'%3ESIKKIM EXCISE SIKKIM EXCISE%3C/text%3E%3Ctext x='0' y='200' class='watermark'%3ESIKKIM EXCISE SIKKIM EXCISE%3C/text%3E%3Ctext x='0' y='250' class='watermark'%3ESIKKIM EXCISE SIKKIM EXCISE%3C/text%3E%3C/svg%3E");
                background-repeat: repeat;
                background-size: 300px 300px;
              }
              
              .permit-content {
                position: relative;
                z-index: 1;
                color: #000;
                background: white;
                height: 100%;
                display: flex;
                flex-direction: column;
              }

              .sample-watermark {
                display: block !important;
                position: absolute !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                font-family: Arial, Helvetica, sans-serif !important;
                font-size: 88px !important;
                font-weight: 900 !important;
                letter-spacing: 20px !important;
                margin-right: -20px !important;
                color: rgba(220, 38, 38, 0.14) !important;
                text-transform: uppercase !important;
                pointer-events: none !important;
                user-select: none !important;
                z-index: 10 !important;
                white-space: nowrap !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              .bill-type {
                position: absolute;
                top: -5px;
                right: 10px;
                font-weight: bold;
                font-size: 18px;
                color: #d32f2f;
                background: rgba(255, 255, 255, 0.95);
                padding: 8px 15px;
                border: 2px solid #d32f2f;
                border-radius: 5px;
                z-index: 3;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              
              .header {
                text-align: center;
                margin-bottom: 20px;
                margin-top: 60px;
                border-bottom: 2px double #000;
                padding-bottom: 15px;
                flex-shrink: 0;
              }
              
              .header h1 {
                font-size: 22px;
                font-weight: bold;
                margin: 4px 0;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              
              .header h2 {
                font-size: 16px;
                font-weight: bold;
                margin: 4px 0;
              }
              
              .header h3 {
                font-size: 14px;
                font-weight: normal;
                margin: 4px 0;
                font-style: italic;
              }
              
              .form-number {
                position: absolute;
                top: 40px;
                right: 40px;
                text-align: right;
                font-weight: bold;
                font-size: 14px;
              }
              
              .form-number .form-date {
                font-size: 13px;
                font-weight: normal;
                margin-top: 2px;
                color: #000;
              }
              
              .permit-info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 20px;
                flex-shrink: 0;
              }
              
              .info-item {
                display: flex;
                margin-bottom: 8px;
              }
              
              .info-item label {
                font-weight: bold;
                width: 140px;
                flex-shrink: 0;
                font-size: 14px;
              }
              
              .info-item span {
                border-bottom: 1px dotted #999;
                flex-grow: 1;
                padding-left: 5px;
                font-size: 14px;
              }
              
              .liquor-table-container {
                margin-bottom: 20px;
                flex-shrink: 0;
              }
              
              .liquor-table-container h3 {
                font-size: 16px;
                margin-bottom: 10px;
              }
              
              table {
                width: 100%;
                border-collapse: collapse;
              }
              
              th, td {
                border: 1px solid #000;
                padding: 5px;
                text-align: left;
                font-size: 12px;
              }
              
              th {
                background-color: #f0f0f0;
                font-weight: bold;
                text-align: center;
              }
              
              .text-right {
                text-align: right;
              }
              
              .text-center {
                text-align: center;
              }
              
              tfoot {
                font-weight: bold;
                background-color: #f9f9f9;
              }

              .duty-col-cell {
                text-align: left;
                vertical-align: middle;
                padding: 4px 6px;
                line-height: 1.3;
              }

              .duty-txn-text {
                font-weight: bold;
                font-size: 11px;
                color: #000;
                word-break: break-all;
              }

              .duty-txn-date {
                font-size: 10px;
                color: #333;
                margin-top: 2px;
              }
              
              .terms-section {
                margin-top: 15px;
                font-size: 12px;
                position: relative;
                flex-grow: 1;
              }
              
              .terms-header {
                margin-bottom: 5px;
                line-height: 1.3;
              }
              
              .terms-list {
                padding-left: 20px;
                margin: 8px 0;
              }
              
              .terms-list li {
                margin-bottom: 4px;
                line-height: 1.2;
                padding-left: 5px;
              }
              
              .validity-line, .vehicle-line {
                font-weight: normal;
                margin-top: 8px;
              }

              .validity-line strong, .vehicle-line strong {
                font-weight: bold;
              }

              .place-line {
                margin-top: 15px;
                font-weight: normal;
              }

              .place-line strong {
                font-weight: bold;
              }
              
              .date-bottom {
                margin-top: 8px;
                font-weight: normal;
              }

              .date-bottom strong {
                font-weight: bold;
              }
              
              .footer-signatures {
                margin-top: 20px;
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                position: relative;
                flex-shrink: 0;
              }
              
              .seal-section {
                width: 120px;
              }
              
              .signature-section {
                text-align: center;
                width: 220px;
                position: relative;
                right: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
              }

              .signature-space {
                height: 52px;
                width: 100%;
              }
              
              .signature-line {
                border-top: 1px solid #000;
                margin-bottom: 5px;
                width: 100%;
                height: 0;
                margin-top: 0;
              }
              
              .designation {
                font-weight: bold;
                font-size: 14px;
              }
              
              .dept, .gov {
                font-size: 12px;
              }
              
              .footer-small-print {
                margin-top: 15px;
                font-size: 9px;
                color: #666;
                border-top: 1px solid #ddd;
                padding-top: 4px;
                flex-shrink: 0;
              }
              
              @page {
                size: A4;
                margin: 0;
              }
              
              @media print {
                body {
                  margin: 0 !important;
                  padding: 0 !important;
                }
                .sample-watermark {
                  display: block !important;
                  color: rgba(220, 38, 38, 0.14) !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              }
            </style>
            <base href="${window.location.origin}/">
          </head>
          <body>
            ${permitContent.outerHTML.replace(/class="permit-container"/, `class="permit-container${this.selectedColor === 'yellow' ? ' yellow-bg' : ''}"`)}
          </body>
          </html>
        `;
        
        // Write content to new window
        printWindow.document.write(printHTML);
        printWindow.document.close();
        
        // Wait for content to load then print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 500);
        };
      }
    }
  }

  goBack() {
    // Navigate back to the previous page (OIC dashboard)
    window.history.back();
  }

  // Calculate total cases from brands if not available directly
  getTotalCases(): number {
    if (!this.permitData?.brands) return 0;
    return this.permitData.brands.reduce((total: number, brand: any) => total + Number(brand.cases || 0), 0);
  }

  // Calculate total bottles from brands
  getTotalBottles(): number {
    if (!this.permitData?.brands || !Array.isArray(this.permitData.brands)) return 0;
    return this.permitData.brands.reduce((total: number, brand: any) => {
      const bottles = brand.total_bottles ?? ((brand.cases || 0) * (brand.bottles_per_case || 12));
      return total + Number(bottles || 0);
    }, 0);
  }

  // Get duty paid for a brand
  getBrandDuty(brand: any): number {
    if (!brand) return 0;

    // 1. Check direct total_amount or variant properties
    const directAmt = brand.total_amount ?? brand.totalAmount ?? brand.amount ?? brand.duty_paid ?? brand.total_duty;
    if (directAmt !== undefined && directAmt !== null && !isNaN(Number(directAmt)) && Number(directAmt) > 0) {
      return Number(directAmt);
    }

    // 2. Sum of total duty breakdown fields
    const excise = Number(brand.total_excise_duty ?? brand.totalExciseDuty ?? 0);
    const cess = Number(brand.total_education_cess ?? brand.totalEducationCess ?? 0);
    const addl = Number(brand.total_additional_excise ?? brand.totalAdditionalExcise ?? 0);
    const bottling = Number(brand.total_bottling_fee ?? brand.totalBottlingFee ?? 0);
    const sumDuties = excise + cess + addl + bottling;
    if (sumDuties > 0) return sumDuties;

    // 3. Calculation from per-case rates
    const cases = Number(brand.cases || 0);
    const perCase = Number(brand.excise_duty_rs_per_case ?? brand.exciseDutyRsPerCase ?? 0) +
      Number(brand.education_cess_rs_per_case ?? brand.educationCessRsPerCase ?? 0) +
      Number(brand.additional_excise_duty_rs_per_case ?? brand.additionalExciseDutyRsPerCase ?? 0) +
      Number(brand.bottling_fee_rs_per_case ?? brand.bottlingFeeRsPerCase ?? 0);
    if (cases > 0 && perCase > 0) {
      return cases * perCase;
    }

    // 4. Fallback if single brand on permit
    const permitTotal = Number(this.permitData?.total_amount || 0);
    if (this.permitData?.brands?.length === 1 && permitTotal > 0) {
      return permitTotal;
    }

    // 5. Fallback if multiple brands: distribute proportionally by cases
    const totalCases = this.getTotalCases();
    if (cases > 0 && totalCases > 0 && permitTotal > 0) {
      return (cases / totalCases) * permitTotal;
    }

    return 0;
  }

  // Get total duty paid
  getTotalDuty(): number {
    if (this.permitData?.brands && Array.isArray(this.permitData.brands) && this.permitData.brands.length > 0) {
      const brandSum = this.permitData.brands.reduce((sum: number, b: any) => sum + this.getBrandDuty(b), 0);
      if (brandSum > 0) return brandSum;
    }
    if (this.permitData?.total_amount && Number(this.permitData.total_amount) > 0) {
      return Number(this.permitData.total_amount);
    }
    return 0;
  }

  // Get wallet transaction ID for brand/permit (displays the transaction_id, NOT reference number)
  getBrandTxnId(brand?: any): string {
    const bill = String(this.permitData?.bill_no || brand?.bill_no || '').trim();

    // 1. From brand's wallet_transactions
    const brandTxns = Array.isArray(brand?.wallet_transactions) ? brand.wallet_transactions : [];
    if (brandTxns.length > 0) {
      const match = brandTxns.find((t: any) => String(t.wallet_type || t.transaction_id || '').toLowerCase().includes('excise_duty')) || brandTxns[0];
      const txnId = String(match?.transaction_id || match?.transactionId || '').trim();
      if (txnId && txnId !== bill) return txnId;
    }

    // 2. From permitData wallet_transactions
    const permitTxns = Array.isArray(this.permitData?.wallet_transactions) ? this.permitData.wallet_transactions : [];
    if (permitTxns.length > 0) {
      const match = permitTxns.find((t: any) => String(t.wallet_type || t.transaction_id || '').toLowerCase().includes('excise_duty')) || permitTxns[0];
      const txnId = String(match?.transaction_id || match?.transactionId || '').trim();
      if (txnId && txnId !== bill) return txnId;
    }

    // 3. Explicit transaction_id (if not equal to bill_no)
    const bTxn = String(brand?.transaction_id || brand?.transactionId || '').trim();
    if (bTxn && bTxn !== bill) return bTxn;

    const pTxn = String(this.permitData?.transaction_id || this.permitData?.transactionId || '').trim();
    if (pTxn && pTxn !== bill) return pTxn;

    // 4. Fallback: Format the actual backend database transaction_id (f"TRP-{bill_no}-EXCISE_DUTY")
    // Never show just the raw bill reference number!
    if (bill) {
      return `TRP-${bill}-EXCISE_DUTY`;
    }

    return '';
  }

  // Get all transaction IDs for this permit/brand
  getBrandAllTxnIds(brand?: any): string[] {
    const bill = String(this.permitData?.bill_no || brand?.bill_no || '').trim();
    const set = new Set<string>();

    const txns = Array.isArray(brand?.wallet_transactions) && brand.wallet_transactions.length > 0
      ? brand.wallet_transactions
      : (Array.isArray(this.permitData?.wallet_transactions) ? this.permitData.wallet_transactions : []);

    txns.forEach((t: any) => {
      const id = String(t?.transaction_id || t?.transactionId || '').trim();
      if (id && id !== bill) set.add(id);
    });

    if (set.size > 0) return Array.from(set);

    if (bill) {
      return [
        `TRP-${bill}-EXCISE_DUTY`,
        `TRP-${bill}-ADDITIONAL_EXCISE`,
        `TRP-${bill}-BOTTLING_FEE`,
        `TRP-${bill}-EDUCATION`
      ];
    }
    return [];
  }

  getManufacturerName(): string {
    return this.permitData?.manufacturing_unit_name ||
      this.permitData?.manufacturer_name ||
      this.permitData?.brands?.[0]?.manufacturing_unit_name ||
      this.permitData?.brands?.[0]?.manufacturingUnitName ||
      this.permitData?.brands?.[0]?.brand_owner ||
      'Mount Distilleries Limited';
  }

  getApprovedDate(): any {
    return this.permitData?.approved_date ||
      this.permitData?.date ||
      this.permitData?.created_at ||
      this.currentDate;
  }

  getBrandTxnDate(brand?: any): any {
    const txns = (Array.isArray(brand?.wallet_transactions) && brand.wallet_transactions.length > 0)
      ? brand.wallet_transactions
      : (Array.isArray(this.permitData?.wallet_transactions) ? this.permitData.wallet_transactions : []);
    if (txns.length > 0 && txns[0]?.created_at) {
      return txns[0].created_at;
    }
    return this.permitData?.date || this.currentDate;
  }

  getPermitValidUptoDate(): any {
    if (this.permitData?.valid_upto || this.permitData?.valid_up_to || this.permitData?.validity_date) {
      return this.permitData.valid_upto || this.permitData.valid_up_to || this.permitData.validity_date;
    }
    const base = this.permitData?.date || this.permitData?.created_at;
    if (base) {
      const d = new Date(base);
      if (!isNaN(d.getTime())) {
        const nextDay = new Date(d);
        nextDay.setDate(nextDay.getDate() + 1);
        return nextDay;
      }
    }
    return this.currentDate;
  }
}

