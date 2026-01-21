import { Component, Inject, PLATFORM_ID, OnInit, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HologramDataService } from '../../services/hologram-data.service';

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
  private hologramService = inject(HologramDataService);
  isLoading = false;
  errorMessage = '';

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
        // CRITICAL FIX: Load data directly from backend API instead of localStorage
        this.loadFromBackendAPI(ref, type);
      } else {
        // If no ref provided, redirect back based on 'from' parameter
        this.goBack();
      }
    }
  }

  private loadFromBackendAPI(ref: string, type: 'Local' | 'Export' | 'Defence' | null): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Fetch hologram requests from backend
    this.hologramService.getRequests().subscribe({
      next: (requests) => {
        // Find the request by reference number
        const found = requests.find((r: any) => r.refNo === ref);
        
        if (found) {
          // Map backend data to frontend format
          const qty = found.quantity || 0;
          const hologramType = (found.hologramType || type || 'LOCAL').toUpperCase();
          
          // Create the display data with correct quantity mapping
          this.submittedData = {
            refNo: found.refNo || '',
            date: found.submissionDate || new Date().toISOString(),
            companyName: found.licenseeName || 'Sikkim Distilleries Ltd',
            // CRITICAL: Map quantity to the correct field based on hologram type
            localQtyLakh: hologramType === 'LOCAL' ? qty : 0,
            exportQtyLakh: hologramType === 'EXPORT' ? qty : 0,
            defenceQtyLakh: hologramType === 'DEFENCE' ? qty : 0,
            procurementType: hologramType === 'LOCAL' ? 'Local' : hologramType === 'EXPORT' ? 'Export' : 'Defence'
          };
          
          // Check if upload slip is enabled based on workflow stage
          const currentStage: any = found.currentStage;
          const status = found.status || (currentStage && typeof currentStage === 'object' ? currentStage.name : '') || '';
          this.uploadSlipEnabled = status.toLowerCase().includes('approved');
          
          this.isLoading = false;
        } else {
          // Fallback: Try procurement endpoint
          this.loadFromProcurementAPI(ref, type);
        }
      },
      error: (err) => {
        console.error('Error loading hologram request:', err);
        // Fallback: Try procurement endpoint
        this.loadFromProcurementAPI(ref, type);
      }
    });
  }

  private loadFromProcurementAPI(ref: string, type: 'Local' | 'Export' | 'Defence' | null): void {
    // Try loading from procurement endpoint as fallback
    this.hologramService.getProcurements().subscribe({
      next: (procurements) => {
        const found: any = procurements.find((p: any) => p.refNo === ref);
        
        if (found) {
          // CRITICAL FIX: Convert string values to numbers (handle both string and number types)
          const localQty = typeof found.localQty === 'string' ? parseFloat(found.localQty) : (found.localQty || 0);
          const exportQty = typeof found.exportQty === 'string' ? parseFloat(found.exportQty) : (found.exportQty || 0);
          const defenceQty = typeof found.defenceQty === 'string' ? parseFloat(found.defenceQty) : (found.defenceQty || 0);
          
          // Check if there's edit history from Commissioner
          const hasEditHistory = found.editHistory || found.edit_history;
          
          // Map procurement data
          this.submittedData = {
            refNo: found.refNo || '',
            date: found.date || new Date().toISOString(),
            companyName: found.licenseeName || 'Sikkim Distilleries Ltd',
            localQtyLakh: localQty,
            exportQtyLakh: exportQty,
            defenceQtyLakh: defenceQty,
            procurementType: type || 'Local',
            editedByCommissioner: !!hasEditHistory,
            editHistory: hasEditHistory ? {
              editedBy: hasEditHistory.editedBy || hasEditHistory.edited_by || 'Commissioner',
              editedDate: hasEditHistory.editedDate || hasEditHistory.edited_date,
              originalQuantities: hasEditHistory.originalQuantities || hasEditHistory.original_quantities || {
                local: 0,
                export: 0,
                defence: 0,
                total: 0
              },
              updatedQuantities: hasEditHistory.updatedQuantities || hasEditHistory.updated_quantities || {
                local: 0,
                export: 0,
                defence: 0,
                total: 0
              }
            } : undefined
          };
          
          const currentStage: any = found.currentStage;
          const status = found.status || (currentStage && typeof currentStage === 'object' ? currentStage.name : '') || '';
          this.uploadSlipEnabled = status.toLowerCase().includes('approved');
          
          this.isLoading = false;
        } else {
          this.errorMessage = 'Hologram request not found. Please check the reference number.';
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('Error loading hologram procurement:', err);
        this.errorMessage = 'Failed to load hologram request data. Please try again.';
        this.isLoading = false;
      }
    });
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
        // TODO: Implement backend API call for IT Cell approval
        alert('IT Cell approval feature will be implemented with backend API');
        // this.hologramService.performAction('request', requestId, 'approve_itcell', 'Approved by IT Cell').subscribe(...)
      }
    } else if (this.from === 'commissioner') {
      // Commissioner approval - enable upload slip
      if (confirm('Approve this hologram application? This will enable the supply chain user to upload payment slip.')) {
        // TODO: Implement backend API call for Commissioner approval
        alert('Commissioner approval feature will be implemented with backend API');
        // this.hologramService.performAction('request', requestId, 'approve_commissioner', 'Approved by Commissioner').subscribe(...)
      }
    }
  }

  rejectApplication(): void {
    if (!this.submittedData) return;

    const reason = prompt('Enter rejection reason:');
    if (reason) {
      // TODO: Implement backend API call for rejection
      alert('Rejection feature will be implemented with backend API');
      // this.hologramService.performAction('request', requestId, 'reject', reason).subscribe(...)
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
