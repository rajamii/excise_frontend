import { Component, Inject, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HologramDataService, HologramProcurement } from '../../services/hologram-data.service';
import { SupplyChainProfileService } from '../../../../../core/services/supply-chain-profile.service';

interface HologramFormData {
  refNo: string;
  date: string;
  companyName: string;
  localQtyLakh: number | null;
  exportQtyLakh: number | null;
  defenceQtyLakh: number | null;
}

@Component({
  selector: 'app-hologram',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hologram.component.html',
  styleUrls: ['./hologram.component.scss']
})
export class HologramComponent {
  private readonly refPrefix = 'NHP';
  private readonly refDistrictCode = '1101';

  Math = Math;
  currentYear = new Date().getFullYear();
  errorMessage = '';
  showPreview = false;
  submittedData?: HologramFormData;
  isSubmitted = false;
  showSuccessMessage = false;

  // Modal control properties
  showConfirmationModal = false;
  showSuccessModal = false;
  submittedRefNo = '';
  submittedQuantity = 0;
  submittedAmount = '';
  submittedTime = '';


  private hologramService = inject(HologramDataService);
  private supplyChainProfileService = inject(SupplyChainProfileService);

  formData: HologramFormData = {
    refNo: '',
    date: '',
    companyName: '',
    // Prefill sample data so the user can see how inputs look
    localQtyLakh: 0,
    exportQtyLakh: 0,
    defenceQtyLakh: 0
  };

  private isBrowser = false;

  constructor(private router: Router, private route: ActivatedRoute, @Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    const today = new Date();
    this.formData.date = today.toISOString().split('T')[0];
    this.loadLicenseeEstablishmentName();
    this.loadInitialReferenceNumber();

    // If a ref is provided, load and show its preview
    if (this.isBrowser) {
      const ref = this.route.snapshot.queryParamMap.get('ref');
      const view = this.route.snapshot.queryParamMap.get('view');
      if (ref) {
        const list: HologramFormData[] = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
        const found = list.find(r => r.refNo === ref);
        if (found) {
          this.submittedData = found;
          this.showPreview = true;
          if (view === 'letter') {
            // If viewing letter, scroll to letter section
            setTimeout(() => {
              document.getElementById('hologramPrintSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 25);
          }
        }
      }
    }
  }

  private getFinancialYear(referenceDate: Date = new Date()): string {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth() + 1;
    return month >= 4
      ? `${year}-${String(year + 1).slice(-2)}`
      : `${year - 1}-${String(year).slice(-2)}`;
  }

  private getReferencePrefix(financialYear: string): string {
    return `${this.refPrefix}/${this.refDistrictCode}/${financialYear}`;
  }

  private extractSequenceNumber(referenceNo: string, expectedPrefix: string): number {
    const value = String(referenceNo || '').trim();
    if (!value.startsWith(`${expectedPrefix}/`)) {
      return 0;
    }

    const sequenceText = value.split('/').pop() || '';
    const sequence = Number.parseInt(sequenceText, 10);
    return Number.isFinite(sequence) && sequence > 0 ? sequence : 0;
  }

  private loadInitialReferenceNumber(): void {
    const financialYear = this.getFinancialYear();
    const expectedPrefix = this.getReferencePrefix(financialYear);

    this.hologramService.getProcurements().subscribe({
      next: (items: HologramProcurement[]) => {
        let maxSequence = 0;
        for (const item of items || []) {
          const anyItem = item as any;
          const refNo = String(anyItem?.refNo || anyItem?.ref_no || '').trim();
          maxSequence = Math.max(maxSequence, this.extractSequenceNumber(refNo, expectedPrefix));
        }

        this.formData.refNo = `${expectedPrefix}/${String(maxSequence + 1).padStart(4, '0')}`;
      },
      error: () => {
        this.formData.refNo = `${expectedPrefix}/0001`;
      }
    });
  }

  private loadLicenseeEstablishmentName(): void {
    this.supplyChainProfileService.getProfile().subscribe({
      next: (response) => {
        const profile = response?.data as any;
        const establishmentName = String(
          profile?.manufacturingUnitName ||
          profile?.manufacturing_unit_name ||
          ''
        ).trim();

        if (establishmentName) {
          this.formData.companyName = establishmentName;
        }
      },
      error: () => {
        // Keep field empty if profile fetch fails; validation will block submission.
      }
    });
  }

  clearForm(): void {
    // Reset fields and refresh reference number from API.
    const today = new Date();
    this.formData = {
      refNo: '',
      date: today.toISOString().split('T')[0],
      companyName: this.formData.companyName,
      localQtyLakh: null,
      exportQtyLakh: null,
      defenceQtyLakh: null
    };
    this.loadInitialReferenceNumber();
    this.errorMessage = '';
    this.showPreview = false;
    this.submittedData = undefined;
    this.isSubmitted = false;
    this.showSuccessMessage = false;

    // Reset modal states
    this.showConfirmationModal = false;
    this.showSuccessModal = false;
  }

  createNewApplication(): void {
    this.clearForm();
    // Scroll back to form
    setTimeout(() => {
      document.querySelector('.card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  viewInDashboard(): void {
    // Navigate to IT Cell dashboard to see the submitted application
    this.router.navigate(['/dev-itcell']);
  }

  viewApplicationDetails(): void {
    if (!this.submittedData) return;

    // Navigate to unified hologram view
    this.router.navigate(['/supply-chain-view'], {
      queryParams: {
        ref: this.submittedData.refNo,
        type: 'hologram',
        source: 'supplychain'
      }
    });
  }

  get totalQtyLakh(): number {
    const l = this.formData.localQtyLakh || 0;
    const e = this.formData.exportQtyLakh || 0;
    const d = this.formData.defenceQtyLakh || 0;
    return l + e + d;
  }

  getSeriesRowNumber(series: 'local' | 'export' | 'defence'): number {
    if (!this.submittedData) return 0;

    let rowNumber = 0;

    // Count rows before this series
    if (series === 'local') {
      rowNumber = 1;
    } else if (series === 'export') {
      rowNumber = 1;
      if (this.submittedData.localQtyLakh && this.submittedData.localQtyLakh > 0) rowNumber++;
    } else if (series === 'defence') {
      rowNumber = 1;
      if (this.submittedData.localQtyLakh && this.submittedData.localQtyLakh > 0) rowNumber++;
      if (this.submittedData.exportQtyLakh && this.submittedData.exportQtyLakh > 0) rowNumber++;
    }

    return rowNumber;
  }

  validateForm(): boolean {
    if (!this.formData.date) {
      this.errorMessage = 'Please select date';
      return false;
    }
    if (!this.formData.companyName?.trim()) {
      this.errorMessage = 'Establishment name is not available in your licensee profile';
      return false;
    }

    // Check if at least one quantity is greater than 0
    const localQty = Number(this.formData.localQtyLakh) || 0;
    const exportQty = Number(this.formData.exportQtyLakh) || 0;
    const defenceQty = Number(this.formData.defenceQtyLakh) || 0;

    if (localQty <= 0 && exportQty <= 0 && defenceQty <= 0) {
      this.errorMessage = 'Enter at least one quantity greater than 0';
      return false;
    }

    this.errorMessage = '';
    return true;
  }

  submitForm(): void {
    if (!this.validateForm()) {
      return;
    }

    // Directly show the confirmation modal
    this.showConfirmationModal = true;
  }


  closeConfirmationModal(): void {
    this.showConfirmationModal = false;
  }

  confirmSubmission(): void {
    this.showConfirmationModal = false;

    // Prepare API Payload
    // Backend expects snake_case for fields
    const payload: any = {
      local_qty: this.formData.localQtyLakh || 0,
      export_qty: this.formData.exportQtyLakh || 0,
      defence_qty: this.formData.defenceQtyLakh || 0,
    };

    this.hologramService.createProcurement(payload).subscribe({
      next: (res) => {
        const anyRes = res as any;
        const responseRefNo = String(anyRes?.refNo || anyRes?.ref_no || this.formData.refNo).trim();
        const responseCompanyName = String(
          anyRes?.licenseeName ||
          anyRes?.licensee_name ||
          anyRes?.manufacturingUnit ||
          anyRes?.manufacturing_unit ||
          this.formData.companyName
        ).trim();

        // Prepare success modal data
        this.submittedRefNo = responseRefNo;
        this.submittedQuantity = this.totalQtyLakh;
        this.submittedAmount = (this.totalQtyLakh * 0.15).toFixed(2);
        this.submittedTime = new Date().toLocaleString('en-IN');

        // Show success modal
        this.showSuccessModal = true;

        // Lock the submitted data for preview/print and mark as submitted
        // Use response refNo if available, or fallback
        this.submittedData = {
          ...this.formData,
          refNo: responseRefNo,
          companyName: responseCompanyName || this.formData.companyName
        };
        this.isSubmitted = true;
        this.showSuccessMessage = true;
        this.showPreview = true;

        console.log('✅ Application submitted successfully via API:', res);
      },
      error: (err) => {
        console.error('Error submitting application', err);
        alert('❌ Submission Failed\n\nThere was an error submitting your application. Please check your internet connection and try again.\n\nIf the problem persists, please contact the IT support team.');
      }
    });
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;

    // Scroll to government form after closing success modal
    setTimeout(() => {
      document.getElementById('hologramPrintSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  printApplication(): void {
    this.closeSuccessModal();
    setTimeout(() => {
      this.openPrintPreview();
    }, 300);
  }

  // Deprecated: No longer used in API flow
  private registerInHologramDashboard(): void {
    console.warn('registerInHologramDashboard is deprecated. Implementation moved to backend.');
  }

  openPrintPreview(): void {
    if (!this.submittedData) return;

    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) return;

    const ref = this.submittedData.refNo;
    const date = new Date(this.submittedData.date).toLocaleDateString('en-GB');
    const companyName = this.submittedData.companyName;
    const localQty = this.submittedData.localQtyLakh || 0;
    const exportQty = this.submittedData.exportQtyLakh || 0;
    const defenceQty = this.submittedData.defenceQtyLakh || 0;
    const totalQty = localQty + exportQty + defenceQty;

    win.document.open();
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>Hologram Requisition - ${ref}</title>
          <meta charset="utf-8">
          <style>
            @page { 
              size: A4; 
              margin: 0.5in; 
            }
            
            body { 
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              background: white;
              color: #000;
              line-height: 1.4;
            }
            
            .government-form-container {
              width: 100%;
              margin: 0;
              padding: 0;
              background: white;
            }
            
            .gov-header {
              text-align: center;
              margin-bottom: 1rem;
              padding-bottom: 0.5rem;
            }
            
            .gov-seal {
              text-align: center;
              margin-bottom: 0.5rem;
            }
            
            .seal-image {
              height: 120px;
              width: auto;
            }
            
            .gov-title {
              text-align: center;
            }
            
            .gov-main-title {
              font-size: 1.2rem;
              font-weight: bold;
              color: #000;
              margin: 0.3rem 0;
              letter-spacing: 1px;
            }
            
            .gov-dept-title {
              font-size: 1.1rem;
              font-weight: bold;
              color: #000;
              margin: 0.3rem 0;
              letter-spacing: 0.5px;
            }
            
            .gov-location {
              font-size: 1rem;
              color: #000;
              margin: 0.3rem 0;
            }
            
            .gov-divider {
              border: none;
              height: 2px;
              background: #000;
              margin: 1rem 0;
            }
            
            .form-title-section {
              text-align: center;
              margin-bottom: 1.5rem;
            }
            
            .form-title {
              font-size: 1.1rem;
              font-weight: bold;
              color: #000;
              text-decoration: underline;
              margin: 0;
              letter-spacing: 1px;
            }
            
            .section-divider {
              border: none;
              height: 1px;
              background: #000;
              margin: 0.75rem 0;
            }
            
            .application-details {
              margin-bottom: 1.5rem;
            }
            
            .detail-row {
              display: block;
            }
            
            .detail-box {
              margin-bottom: 0.75rem;
              text-align: left;
            }
            
            .detail-label {
              font-weight: normal;
              color: #000;
              font-size: 1rem;
              display: inline;
              margin-right: 0.5rem;
            }
            
            .detail-value {
              font-size: 1rem;
              font-weight: normal;
              color: #000;
              display: inline;
            }
            
            .applicant-section {
              margin-bottom: 1.5rem;
            }
            
            .section-header {
              font-weight: normal;
              color: #000;
              font-size: 1rem;
              margin-bottom: 0.5rem;
              text-align: left;
            }
            
            .applicant-info {
              text-align: left;
            }
            
            .info-row {
              display: block;
            }
            
            .info-label {
              font-weight: normal;
              color: #000;
              font-size: 1rem;
              display: inline;
              margin-right: 0.5rem;
            }
            
            .info-value {
              font-weight: normal;
              color: #000;
              font-size: 1rem;
              display: inline;
            }
            
            .quantities-section {
              margin-bottom: 1.5rem;
            }
            
            .section-title {
              font-size: 1rem;
              font-weight: normal;
              color: #000;
              margin-bottom: 0.75rem;
            }
            
            .gov-table {
              border: 1px solid #000;
              width: 100%;
              border-collapse: collapse;
            }
            
            .gov-table th, 
            .gov-table td {
              padding: 0.5rem;
              font-size: 0.9rem;
              border: 1px solid #000;
              color: #000;
              text-align: center;
            }
            
            .gov-table th:nth-child(2), 
            .gov-table td:nth-child(2) {
              text-align: left;
            }
            
            .gov-table thead th {
              font-size: 0.9rem;
              font-weight: normal;
              background: none;
            }
            
            .total-row {
              border-top: 2px solid #000;
              font-size: 0.9rem;
              font-weight: normal;
              background: none;
            }
            
            .status-approved, 
            .status-total {
              background: none;
              color: #000;
              font-size: 0.8rem;
              padding: 0.2rem;
              border-radius: 0;
            }
            
            .summary-section,
            .remarks-section,
            .print-actions {
              display: none;
            }
          </style>
        </head>
        <body>
          <div class="government-form-container">
            <!-- Government Header -->
            <div class="gov-header">
              <div class="gov-seal">
                <img src="assets/images/header/Seal_of_Sikkim_greyscale.png" alt="Government Seal" class="seal-image">
              </div>
              <div class="gov-title">
                <h2 class="gov-main-title">GOVERNMENT OF SIKKIM</h2>
                <h3 class="gov-dept-title">EXCISE DEPARTMENT</h3>
                <p class="gov-location">GANGTOK, SIKKIM</p>
              </div>
            </div>

            <hr class="gov-divider">

            <!-- Form Title -->
            <div class="form-title-section">
              <h3 class="form-title">HOLOGRAM REQUISITION APPLICATION</h3>
            </div>

            <hr class="section-divider">

            <!-- Application Details -->
            <div class="application-details">
              <div class="detail-row">
                <div class="detail-box">
                  <label class="detail-label">Application Ref. No:</label>
                  <div class="detail-value">${ref}</div>
                </div>
                <div class="detail-box">
                  <label class="detail-label">Application Date:</label>
                  <div class="detail-value">${date}</div>
                </div>
              </div>
            </div>

            <!-- Applicant Details -->
            <div class="applicant-section">
              <div class="section-header">Applicant Details</div>
              <div class="applicant-info">
                <div class="info-row">
                  <label class="info-label">Company Name:</label>
                  <div class="info-value">${companyName}</div>
                </div>
              </div>
            </div>

            <!-- Requested Quantities -->
            <div class="quantities-section">
              <h4 class="section-title">Requested Hologram Quantities</h4>
              <div class="quantities-table">
                <table class="gov-table">
                  <thead>
                    <tr>
                      <th>Sl. No.</th>
                      <th>Hologram Series</th>
                      <th>Quantity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1</td>
                      <td>Local Series</td>
                      <td>${localQty.toLocaleString('en-IN')}</td>
                      <td><span class="status-approved">Approved</span></td>
                    </tr>
                    <tr>
                      <td>2</td>
                      <td>Export Series</td>
                      <td>${exportQty.toLocaleString('en-IN')}</td>
                      <td><span class="status-approved">Approved</span></td>
                    </tr>
                    <tr>
                      <td>3</td>
                      <td>Defence Series</td>
                      <td>${defenceQty.toLocaleString('en-IN')}</td>
                      <td><span class="status-approved">Approved</span></td>
                    </tr>
                    <tr class="total-row">
                      <td colspan="2"><strong>TOTAL HOLOGRAMS REQUESTED:</strong></td>
                      <td><strong>${totalQty.toLocaleString('en-IN')}</strong></td>
                      <td><span class="status-total">APPROVED</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </body>
      </html>`);
    win.document.close();

    win.onload = () => {
      setTimeout(() => {
        win.focus();
        win.print();
        win.close();
      }, 500);
    };
  }

  goBack(): void {
    this.router.navigate(['/dashboard'], { queryParams: { section: 'hologram' } });
  }

  // Payment calculation methods
  calculateAmount(quantity: number): number {
    // Rate is 0.15 rupees per hologram (wallet payment only)
    return quantity * 0.15;
  }

  calculateTotalAmount(): number {
    if (!this.submittedData) return 0;

    const localAmount = this.submittedData.localQtyLakh ? this.calculateAmount(this.submittedData.localQtyLakh) : 0;
    const exportAmount = this.submittedData.exportQtyLakh ? this.calculateAmount(this.submittedData.exportQtyLakh) : 0;
    const defenceAmount = this.submittedData.defenceQtyLakh ? this.calculateAmount(this.submittedData.defenceQtyLakh) : 0;

    return localAmount + exportAmount + defenceAmount;
  }

  getTotalQuantityLakh(): number {
    if (!this.submittedData) return 0;

    return (this.submittedData.localQtyLakh || 0) +
      (this.submittedData.exportQtyLakh || 0) +
      (this.submittedData.defenceQtyLakh || 0);
  }


}
