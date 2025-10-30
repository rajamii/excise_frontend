import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

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
  Math = Math;
  currentYear = new Date().getFullYear();
  errorMessage = '';
  showPreview = false;
  submittedData?: HologramFormData;
  isSubmitted = false;
  showSuccessMessage = false;

  formData: HologramFormData = {
    refNo: '',
    date: '',
    companyName: 'Yuksom Breweries Ltd.',
    // Prefill sample data so the user can see how inputs look
    localQtyLakh: 15,
    exportQtyLakh: 0,
    defenceQtyLakh: 0
  };

  private isBrowser = false;

  constructor(private router: Router, private route: ActivatedRoute, @Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    const today = new Date();
    this.formData.date = today.toISOString().split('T')[0];
    this.generateRefNumber();
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

  generateRefNumber(): void {
    const seq = this.getNextSequenceNumber();
    const yy = String(new Date().getFullYear()).slice(-2);
    // Sequential reference number starting at 1, not incremented until submit
    this.formData.refNo = `YB/${seq}/BREW/${yy}`;
  }

  private getNextSequenceNumber(): number {
    const key = 'hologramRefSeqNext';
    const raw = this.isBrowser ? localStorage.getItem(key) : null;
    const parsed = raw ? parseInt(raw, 10) : 1;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }

  private incrementSequenceNumber(): void {
    if (!this.isBrowser) return;
    const key = 'hologramRefSeqNext';
    const curr = this.getNextSequenceNumber();
    localStorage.setItem(key, String(curr + 1));
  }

  clearForm(): void {
    // Reset fields without advancing sequence; regenerate current next ref no
    const today = new Date();
    this.formData = {
      refNo: '',
      date: today.toISOString().split('T')[0],
      companyName: this.formData.companyName || 'Yuksom Breweries Ltd.',
      localQtyLakh: null,
      exportQtyLakh: null,
      defenceQtyLakh: null
    };
    this.generateRefNumber();
    this.errorMessage = '';
    this.showPreview = false;
    this.submittedData = undefined;
    this.isSubmitted = false;
    this.showSuccessMessage = false;
  }

  createNewApplication(): void {
    this.clearForm();
    // Scroll back to form
    setTimeout(() => {
      document.querySelector('.card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  viewInDashboard(): void {
    // Navigate to supply chain hologram tab to see the submitted application
    this.router.navigate(['/dev-supply-chain'], {
      queryParams: { tab: 'hologram' }
    });
  }

  get totalQtyLakh(): number {
    const l = this.formData.localQtyLakh || 0;
    const e = this.formData.exportQtyLakh || 0;
    const d = this.formData.defenceQtyLakh || 0;
    return l + e + d;
  }

  validateForm(): boolean {
    if (!this.formData.date) {
      this.errorMessage = 'Please select date';
      return false;
    }
    if (!this.formData.companyName?.trim()) {
      this.errorMessage = 'Please enter company name';
      return false;
    }
    if (!this.formData.localQtyLakh && !this.formData.exportQtyLakh && !this.formData.defenceQtyLakh) {
      this.errorMessage = 'Enter at least one quantity (in lakh)';
      return false;
    }
    this.errorMessage = '';
    return true;
  }

  saveDraft(): void {
    alert('Draft saved (frontend only).');
  }

  submitForm(): void {
    if (!this.validateForm()) {
      return;
    }
    // Ask for confirmation / declaration before forwarding
    const confirmed = window.confirm('Declaration: After you click OK, this letter will be forwarded to the Commissioner. Do you want to proceed?');
    if (!confirmed) {
      return;
    }

    // Lock the submitted data for preview/print and mark as submitted
    this.submittedData = { ...this.formData };
    this.isSubmitted = true;
    this.showSuccessMessage = true;
    this.showPreview = true;

    // Persist to list as forwarded
    if (this.isBrowser) {
      const key = 'hologramRequests';
      const list: HologramFormData[] = JSON.parse(localStorage.getItem(key) || '[]');
      list.unshift({ ...this.submittedData });
      localStorage.setItem(key, JSON.stringify(list));

      // Also register in hologram dashboard/daily register
      this.registerInHologramDashboard();
    }

    // Only after successful submit, advance the sequence for the next request
    this.incrementSequenceNumber();
    // Do not overwrite fields used in the preview; regenerate ref for next entry but
    // keep current input values visible until the user edits/clears
    this.formData.refNo = `YB/${this.getNextSequenceNumber()}/BREW/${String(new Date().getFullYear()).slice(-2)}`;

    // Scroll to government form
    setTimeout(() => {
      document.getElementById('hologramPrintSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  private registerInHologramDashboard(): void {
    if (!this.submittedData || !this.isBrowser) return;

    // Save to both storage keys for compatibility

    // 1. Save to hologramApplications (new format)
    const dashboardKey = 'hologramApplications';
    const applications = JSON.parse(localStorage.getItem(dashboardKey) || '[]');

    const newApplication = {
      id: Date.now().toString(),
      refNo: this.submittedData.refNo,
      date: this.submittedData.date,
      companyName: this.submittedData.companyName,
      localQtyLakh: this.submittedData.localQtyLakh || 0,
      exportQtyLakh: this.submittedData.exportQtyLakh || 0,
      defenceQtyLakh: this.submittedData.defenceQtyLakh || 0,
      totalQtyLakh: (this.submittedData.localQtyLakh || 0) + (this.submittedData.exportQtyLakh || 0) + (this.submittedData.defenceQtyLakh || 0),
      status: 'Submitted',
      submittedAt: new Date().toISOString(),
      type: 'Hologram Application'
    };

    applications.unshift(newApplication);
    localStorage.setItem(dashboardKey, JSON.stringify(applications));

    // 2. Also save to hologramRequests (for supply chain compatibility)
    const requestsKey = 'hologramRequests';
    const requests = JSON.parse(localStorage.getItem(requestsKey) || '[]');

    const requestData = {
      refNo: this.submittedData.refNo,
      date: this.submittedData.date,
      companyName: this.submittedData.companyName,
      localQtyLakh: this.submittedData.localQtyLakh || 0,
      exportQtyLakh: this.submittedData.exportQtyLakh || 0,
      defenceQtyLakh: this.submittedData.defenceQtyLakh || 0,
    };

    requests.unshift(requestData);
    localStorage.setItem(requestsKey, JSON.stringify(requests));

    console.log('✅ Application registered in both hologram storages:', {
      refNo: newApplication.refNo,
      date: newApplication.date,
      company: newApplication.companyName,
      totalQty: newApplication.totalQtyLakh
    });
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
                      <th>Quantity (In Lakh)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1</td>
                      <td>Local Series</td>
                      <td>${localQty}</td>
                      <td><span class="status-approved">Approved</span></td>
                    </tr>
                    <tr>
                      <td>2</td>
                      <td>Export Series</td>
                      <td>${exportQty}</td>
                      <td><span class="status-approved">Approved</span></td>
                    </tr>
                    <tr>
                      <td>3</td>
                      <td>Defence Series</td>
                      <td>${defenceQty}</td>
                      <td><span class="status-approved">Approved</span></td>
                    </tr>
                    <tr class="total-row">
                      <td colspan="2"><strong>TOTAL HOLOGRAMS REQUESTED:</strong></td>
                      <td><strong>${totalQty}</strong></td>
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
    this.router.navigate(['/dev-supply-chain']);
  }
}
