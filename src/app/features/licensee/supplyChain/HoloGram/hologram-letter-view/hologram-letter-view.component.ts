import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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
  selector: 'app-hologram-letter-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hologram-letter-view.component.html',
  styleUrls: ['./hologram-letter-view.component.scss']
})
export class HologramLetterViewComponent implements OnInit {
  submittedData?: HologramFormData;
  private isBrowser = false;

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      const ref = this.route.snapshot.queryParamMap.get('ref');
      if (ref) {
        // Check both storage locations for hologram data
        const hologramRequests: HologramFormData[] = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
        const hologramApplications: any[] = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
        
        // First try to find in hologramRequests
        let found = hologramRequests.find(r => r.refNo === ref);
        
        // If not found, try hologramApplications
        if (!found) {
          const appFound = hologramApplications.find(a => a.refNo === ref);
          if (appFound) {
            found = {
              refNo: appFound.refNo,
              date: appFound.date,
              companyName: appFound.companyName,
              localQtyLakh: appFound.localQtyLakh,
              exportQtyLakh: appFound.exportQtyLakh,
              defenceQtyLakh: appFound.defenceQtyLakh
            };
          }
        }
        
        if (found) {
          this.submittedData = found;
        } else {
          // If not found, redirect back to commissioner dashboard
          this.router.navigate(['/dev-commissioner-dashboard']);
        }
      } else {
        // If no ref provided, redirect back to commissioner dashboard
        this.router.navigate(['/dev-commissioner-dashboard']);
      }
    }
  }

  goBack(): void {
    this.router.navigate(['/dev-commissioner-dashboard']);
  }

  printLetter(): void {
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
}
