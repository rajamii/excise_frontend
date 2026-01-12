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
  procurementType?: 'Local' | 'Export' | 'Defence';
  editedByCommissioner?: boolean;
  editHistory?: {
    editedBy: string;
    editedDate: string;
    originalQuantities: {
      local: number;
      export: number;
      defence: number;
      total: number;
    };
    updatedQuantities: {
      local: number;
      export: number;
      defence: number;
      total: number;
    };
  };
}

@Component({
  selector: 'app-supply-chain-hologram-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './supply-chain-hologram-view.component.html',
  styleUrls: ['./supply-chain-hologram-view.component.scss']
})
export class SupplyChainHologramViewComponent implements OnInit {
  submittedData?: HologramFormData;
  private isBrowser = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  from: string = ''; // Track where the user came from (itcell, commissioner, supplychain)
  uploadSlipEnabled: boolean = false; // Track if upload slip button should be enabled

  ngOnInit(): void {
    if (this.isBrowser) {
      const ref = this.route.snapshot.queryParamMap.get('ref');
      const type = this.route.snapshot.queryParamMap.get('type') as 'Local' | 'Export' | 'Defence' | null;
      this.from = this.route.snapshot.queryParamMap.get('from') || 'supplychain';
      
      if (ref) {
        const list: any[] = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
        
        // Find by both refNo and procurementType
        let found = list.find(r => r.refNo === ref && (!type || r.procurementType === type));

        // Fallback: if type not found, try without type filter (for old data)
        if (!found && type) {
          found = list.find(r => r.refNo === ref);
          
          // If found but doesn't have the specific type, filter the quantities
          if (found) {
            found = this.filterByType(found, type);
          }
        }

        if (!found) {
          // If not found in localStorage, create sample data for demonstration
          found = this.createSampleHologramData(ref, type);
        }

        this.submittedData = found;
        
        // Check if upload slip is enabled (only after commissioner approval)
        this.uploadSlipEnabled = found.uploadSlipEnabled || false;
      } else {
        // If no ref provided, redirect back based on 'from' parameter
        this.goBack();
      }
    }
  }

  private filterByType(data: HologramFormData, type: 'Local' | 'Export' | 'Defence'): HologramFormData {
    // Create a new object with only the specified type's quantity
    return {
      ...data,
      procurementType: type,
      localQtyLakh: type === 'Local' ? data.localQtyLakh : 0,
      exportQtyLakh: type === 'Export' ? data.exportQtyLakh : 0,
      defenceQtyLakh: type === 'Defence' ? data.defenceQtyLakh : 0
    };
  }

  private createSampleHologramData(refNo: string, type?: 'Local' | 'Export' | 'Defence' | null): HologramFormData {
    // Create sample data for demonstration purposes (includes both supply chain and commissioner data)
    const sampleData: { [key: string]: HologramFormData } = {
      'YB/1/BREW/24': {
        refNo: 'YB/1/BREW/24',
        date: '2025-01-13',
        companyName: 'Yuksom Breweries Ltd.',
        localQtyLakh: 1500000,
        exportQtyLakh: 0,
        defenceQtyLakh: 0,
        procurementType: 'Local'
      },
      'YB/2/BREW/24': {
        refNo: 'YB/2/BREW/24',
        date: '2025-01-13',
        companyName: 'Yuksom Breweries Ltd.',
        localQtyLakh: 1000000,
        exportQtyLakh: 200000,
        defenceQtyLakh: 0,
        procurementType: 'Local'
      },
      'YB/4/BREW/25': {
        refNo: 'YB/4/BREW/25',
        date: '2025-01-15',
        companyName: 'Sikkim Breweries Ltd.',
        localQtyLakh: 2000000,
        exportQtyLakh: 800000,
        defenceQtyLakh: 300000,
        procurementType: 'Local'
      },
      // Commissioner dashboard sample data
      'HOL/BF901': {
        refNo: 'HOL/BF901',
        date: '2025-09-23',
        companyName: 'Sikkim Distilleries Ltd',
        localQtyLakh: 250000,
        exportQtyLakh: 100000,
        defenceQtyLakh: 50000,
        procurementType: 'Local'
      },
      'HOL/BF902': {
        refNo: 'HOL/BF902',
        date: '2025-09-22',
        companyName: 'Himalayan Distilleries Pvt Ltd',
        localQtyLakh: 320000,
        exportQtyLakh: 180000,
        defenceQtyLakh: 0,
        procurementType: 'Local'
      },
      'HOL/BF903': {
        refNo: 'HOL/BF903',
        date: '2025-09-21',
        companyName: 'Royal Sikkim Brewery',
        localQtyLakh: 280000,
        exportQtyLakh: 70000,
        defenceQtyLakh: 100000,
        procurementType: 'Local'
      },
      'HOL/BF904': {
        refNo: 'HOL/BF904',
        date: '2025-09-20',
        companyName: 'Mountain View Distilleries',
        localQtyLakh: 200000,
        exportQtyLakh: 50000,
        defenceQtyLakh: 0,
        procurementType: 'Local'
      },
      'HOL/BF905': {
        refNo: 'HOL/BF905',
        date: '2025-09-19',
        companyName: 'Eastern Himalaya Distillery',
        localQtyLakh: 400000,
        exportQtyLakh: 200000,
        defenceQtyLakh: 50000,
        procurementType: 'Local'
      },
      'HOL/BF906': {
        refNo: 'HOL/BF906',
        date: '2025-09-18',
        companyName: 'Gangtok Premium Spirits',
        localQtyLakh: 150000,
        exportQtyLakh: 0,
        defenceQtyLakh: 0,
        procurementType: 'Local'
      }
    };

    let data = sampleData[refNo] || {
      refNo: refNo,
      date: new Date().toISOString().split('T')[0],
      companyName: 'Sikkim Distilleries Ltd',
      localQtyLakh: 2500000,
      exportQtyLakh: 500000,
      defenceQtyLakh: 200000,
      procurementType: type || 'Local'
    };

    // Filter by type if specified
    if (type) {
      data = this.filterByType(data, type);
    }

    return data;
  }

  getBackButtonText(): string {
    switch (this.from) {
      case 'itcell':
        return 'Back to IT Cell Dashboard';
      case 'commissioner':
        return 'Back to Commissioner Dashboard';
      default:
        return 'Back to Supply Chain Dashboard';
    }
  }

  goBack(): void {
    switch (this.from) {
      case 'itcell':
        this.router.navigate(['/dev-itcell']);
        break;
      case 'commissioner':
        this.router.navigate(['/dev-commissioner-dashboard'], {
          queryParams: { tab: 'hologram' }
        });
        break;
      default:
        this.router.navigate(['/dev-supply-chain'], {
          queryParams: { tab: 'hologram' }
        });
        break;
    }
  }

  // Action buttons for different user roles
  canApprove(): boolean {
    return this.from === 'itcell' || this.from === 'commissioner';
  }

  canUploadSlip(): boolean {
    return this.from === 'supplychain' && this.uploadSlipEnabled;
  }

  approveApplication(): void {
    if (!this.submittedData) return;

    if (this.from === 'itcell') {
      // IT Cell approval - forward to commissioner
      if (confirm('Approve and forward this application to Commissioner?')) {
        const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
        const index = hologramRequests.findIndex((req: any) => req.refNo === this.submittedData!.refNo);
        if (index !== -1) {
          hologramRequests[index].itCellStatus = 'Approved';
          hologramRequests[index].commissionerStatus = 'Pending';
          hologramRequests[index].status = 'Under Review';
          hologramRequests[index].reviewedBy = 'IT Cell';
          hologramRequests[index].reviewedDate = new Date().toISOString().split('T')[0];
          localStorage.setItem('hologramRequests', JSON.stringify(hologramRequests));
          alert('Application approved and forwarded to Commissioner');
          this.goBack();
        }
      }
    } else if (this.from === 'commissioner') {
      // Commissioner approval - enable upload slip
      if (confirm('Approve this hologram application? This will enable the supply chain user to upload payment slip.')) {
        const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
        const index = hologramRequests.findIndex((req: any) => req.refNo === this.submittedData!.refNo);
        if (index !== -1) {
          hologramRequests[index].commissionerStatus = 'Approved';
          hologramRequests[index].uploadSlipEnabled = true;
          hologramRequests[index].status = 'Approved';
          hologramRequests[index].approvedBy = 'Commissioner';
          hologramRequests[index].approvedDate = new Date().toISOString().split('T')[0];
          localStorage.setItem('hologramRequests', JSON.stringify(hologramRequests));
          alert('Application approved. Supply chain user can now upload payment slip.');
          this.goBack();
        }
      }
    }
  }

  rejectApplication(): void {
    if (!this.submittedData) return;

    const reason = prompt('Enter rejection reason:');
    if (reason) {
      const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
      const index = hologramRequests.findIndex((req: any) => req.refNo === this.submittedData!.refNo);
      if (index !== -1) {
        hologramRequests[index].status = 'Rejected';
        hologramRequests[index].rejectedBy = this.from === 'itcell' ? 'IT Cell' : 'Commissioner';
        hologramRequests[index].rejectedDate = new Date().toISOString().split('T')[0];
        hologramRequests[index].rejectionReason = reason;
        localStorage.setItem('hologramRequests', JSON.stringify(hologramRequests));
        alert('Application rejected');
        this.goBack();
      }
    }
  }

  getTotalQuantity(): number {
    if (!this.submittedData) return 0;
    return (this.submittedData.localQtyLakh || 0) +
      (this.submittedData.exportQtyLakh || 0) +
      (this.submittedData.defenceQtyLakh || 0);
  }

  printLetter(): void {
    if (this.isBrowser) {
      // Create a new window for printing to avoid page headers/footers
      const printWindow = window.open('', '_blank', 'width=800,height=600');

      if (printWindow) {
        const printContent = document.getElementById('hologramPrintSection');

        if (printContent) {
          // Get the current styles
          const styles = Array.from(document.styleSheets)
            .map(styleSheet => {
              try {
                return Array.from(styleSheet.cssRules)
                  .map(rule => rule.cssText)
                  .join('\n');
              } catch (e) {
                return '';
              }
            })
            .join('\n');

          // Create the print document
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Hologram Application - ${this.submittedData?.refNo || ''}</title>
              <meta charset="utf-8">
              <style>
                ${styles}
                
                /* Additional print-specific styles */
                @page {
                  size: A4;
                  margin: 0.3in;
                }
                
                body {
                  margin: 0;
                  padding: 0;
                  font-family: Arial, sans-serif;
                  background: white;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                
                /* Hide everything except our content */
                * {
                  box-sizing: border-box;
                }
                
                .print-container {
                  width: 100%;
                  max-width: none;
                  margin: 0;
                  padding: 0;
                  background: white;
                }
                
                /* Compact print styles */
                .card {
                  border: none !important;
                  box-shadow: none !important;
                  border-radius: 0 !important;
                  margin: 0 !important;
                  background: white !important;
                }
                
                .letter-header {
                  padding: 0.3rem !important;
                  margin-bottom: 0.3rem !important;
                  border-bottom: 1px solid #198754 !important;
                  background: white !important;
                }
                
                .letter-header .d-flex {
                  gap: 0.3rem !important;
                  margin-bottom: 0.2rem !important;
                }
                
                .letter-header img {
                  height: 30px !important;
                }
                
                .letter-header h3 {
                  font-size: 0.75rem !important;
                  margin-bottom: 0.05rem !important;
                  line-height: 1 !important;
                  color: #2c3e50 !important;
                }
                
                .letter-header h4 {
                  font-size: 0.7rem !important;
                  margin-bottom: 0.05rem !important;
                  line-height: 1 !important;
                  color: #2c3e50 !important;
                }
                
                .letter-header h4:last-of-type {
                  font-size: 0.8rem !important;
                  margin-top: 0.2rem !important;
                  padding: 0.1rem 0 !important;
                  border-top: 1px solid #dee2e6 !important;
                  border-bottom: 1px solid #dee2e6 !important;
                  color: #198754 !important;
                }
                
                .letter-header p {
                  font-size: 0.6rem !important;
                  margin-bottom: 0 !important;
                }
                
                .letter-header hr {
                  margin: 0.15rem 0 !important;
                  height: 1px !important;
                }
                
                .letter-content {
                  padding: 0.3rem !important;
                  background: white !important;
                }
                
                .row.mb-4 {
                  margin-bottom: 0.4rem !important;
                }
                
                .col-6 .border {
                  padding: 0.3rem !important;
                  border: 1px solid #dee2e6 !important;
                  border-radius: 0.2rem !important;
                }
                
                .col-6 .border strong {
                  font-size: 0.65rem !important;
                }
                
                .fs-5 {
                  font-size: 0.8rem !important;
                  margin-top: 0.1rem !important;
                }
                
                .bg-light {
                  padding: 0.4rem !important;
                  margin-bottom: 0.4rem !important;
                  border: 1px solid #198754 !important;
                  background: #f8f9fa !important;
                }
                
                .bg-light h5 {
                  font-size: 0.7rem !important;
                  margin-bottom: 0.3rem !important;
                }
                
                .mb-4 h5 {
                  font-size: 0.7rem !important;
                  margin-bottom: 0.3rem !important;
                }
                
                .table {
                  margin-bottom: 0.3rem !important;
                  width: 100% !important;
                  border-collapse: collapse !important;
                }
                
                .table th, .table td {
                  padding: 0.25rem !important;
                  font-size: 0.65rem !important;
                  line-height: 1.1 !important;
                  border: 1px solid #dee2e6 !important;
                  text-align: center !important;
                }
                
                .table th:nth-child(2), .table td:nth-child(2) {
                  text-align: left !important;
                }
                
                .table thead th {
                  background-color: #f8f9fa !important;
                  font-weight: 600 !important;
                  font-size: 0.6rem !important;
                }
                
                .total-row {
                  background-color: #e9ecef !important;
                  font-weight: bold !important;
                  border-top: 2px solid #495057 !important;
                }
                
                .status-approved, .status-total {
                  font-size: 0.55rem !important;
                  padding: 0.1rem 0.2rem !important;
                  border-radius: 0.15rem !important;
                  background-color: #d4edda !important;
                  color: #155724 !important;
                }
                
                .status-total {
                  background-color: #cce5ff !important;
                  color: #004085 !important;
                }
                
                .card {
                  margin-bottom: 0.3rem !important;
                  border: 1px solid #dee2e6 !important;
                }
                
                .card-header {
                  padding: 0.25rem !important;
                  font-size: 0.6rem !important;
                  background: #f8f9fa !important;
                  color: #495057 !important;
                }
                
                .card-header h6 {
                  font-size: 0.6rem !important;
                  margin-bottom: 0 !important;
                }
                
                .card-body {
                  padding: 0.4rem !important;
                }
                
                .card-body .row {
                  font-size: 0.6rem !important;
                  margin-bottom: 0.1rem !important;
                }
                
                .card-body .row > div {
                  padding: 0.05rem 0 !important;
                }
                
                .badge {
                  font-size: 0.5rem !important;
                  padding: 0.1rem 0.2rem !important;
                  background-color: #198754 !important;
                  color: white !important;
                  border-radius: 0.25rem !important;
                }
                
                .border.p-3.bg-light {
                  padding: 0.4rem !important;
                  margin-bottom: 0.4rem !important;
                  border: 1px solid #dee2e6 !important;
                  background: #f8f9fa !important;
                }
                
                .border.p-3.bg-light h6 {
                  font-size: 0.65rem !important;
                  margin-bottom: 0.3rem !important;
                }
                
                .border.p-3.bg-light p {
                  font-size: 0.6rem !important;
                  line-height: 1.2 !important;
                  margin-bottom: 0.3rem !important;
                }
                
                .row.mt-5 {
                  margin-top: 0.6rem !important;
                }
                
                .text-center div[style*="height: 60px"] {
                  height: 25px !important;
                  margin-bottom: 2px !important;
                  border-bottom: 1px solid #000 !important;
                }
                
                .text-center p {
                  font-size: 0.65rem !important;
                  margin-bottom: 0.1rem !important;
                }
                
                .text-center small {
                  font-size: 0.55rem !important;
                }
                
                /* Scale down the entire content */
                .print-container {
                  transform: scale(0.85);
                  transform-origin: top left;
                  width: 117.6%;
                }
              </style>
            </head>
            <body>
              <div class="print-container">
                ${printContent.outerHTML}
              </div>
            </body>
            </html>
          `);

          printWindow.document.close();

          // Wait for content to load then print
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print();
              printWindow.close();
            }, 250);
          };
        }
      }
    }
  }
}
