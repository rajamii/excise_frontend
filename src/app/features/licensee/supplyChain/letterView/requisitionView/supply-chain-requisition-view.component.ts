import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { EnaRequisitionService } from '../../../../../core/services/ena-requisition.service';

interface RequisitionData {
  id: string;
  referenceNo: string;
  submissionDate: Date;
  distilleryName: string;
  status: string;
  brAmount: number;
  quantity?: number;
  numberOfPermits?: number;
  bulkSpiritType?: string;
  strengthTo?: string;
  liftedFrom?: string;
  viaRoute?: string;
  checkpostEntry?: string;
  purpose?: string;
}

@Component({
  selector: 'app-supply-chain-requisition-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './supply-chain-requisition-view.component.html',
  styleUrls: ['./supply-chain-requisition-view.component.scss']
})
export class SupplyChainRequisitionViewComponent implements OnInit {
  requisitionData?: RequisitionData;
  private isBrowser = false;
  sampleData: RequisitionData[] = []; // Omitted for brevity, not used in API path

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private enaRequisitionService: EnaRequisitionService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      // Check if ref is from route params or query params
      let ref = this.route.snapshot.paramMap.get('ref');
      if (!ref) {
        ref = this.route.snapshot.queryParamMap.get('ref');
      }

      if (ref) {
        this.loadRequisitionData(ref);
      } else {
        this.goBack();
      }
    }
  }

  private loadRequisitionData(refNo: string): void {
    if (this.isBrowser) {
      console.log('Loading requisition data from API for ref:', refNo);
      // We strictly fetch from API to ensure dynamic data
      this.fetchFromBackend(refNo);
    }
  }

  private fetchFromBackend(refNo: string): void {
    this.enaRequisitionService.getRequisitions().subscribe({
      next: (data: any[]) => {
        const item = data.find((r: any) =>
          (r.ourRefNo === refNo) ||
          (r.our_ref_no === refNo) ||
          (r.referenceNo === refNo));

        if (item) {
          // Now fetch full details to ensure we get fields like purpose and checkpost
          // console.log('Found item in list, fetching full details for ID:', item.id);
          this.enaRequisitionService.getRequisitionById(item.id).subscribe({
            next: (fullData: any) => {
              // console.log('DEBUG: Full Detail API Data (Stringified):', JSON.stringify(fullData, null, 2));
              this.requisitionData = this.mapToRequisitionData(fullData);
            },
            error: (err) => {
              console.warn('Failed to fetch details, falling back to list item', err);
              this.requisitionData = this.mapToRequisitionData(item);
            }
          });
        } else {
          console.error('Requisition not found in API list for ref:', refNo);
        }
      },
      error: (err) => console.error('Error fetching requisitions list in view:', err)
    });
  }

  private mapToRequisitionData(item: any): RequisitionData {
    return {
      id: item.id,
      referenceNo: item.ourRefNo || item.our_ref_no || item.referenceNo,
      submissionDate: this.parseRequisitionDate(item.requisitionDate || item.requisition_date || item.submissionDate),
      distilleryName: item.liftedFromDistilleryName || item.liftedFrom || 'Unknown',
      status: item.status,
      brAmount: parseFloat(item.totalbl || item.brAmount || '0') * 4,
      quantity: item.totalbl || item.quantity,
      numberOfPermits: item.numberOfPermits || item.number_of_permits || 1,
      bulkSpiritType: item.bulkSpiritType || item.bulk_spirit_type,
      strengthTo: item.strength || item.strengthTo,
      liftedFrom: item.liftedFrom || item.lifted_from,
      viaRoute: item.viaRoute || item.via_route,
      // Added snake_case support for DB fields and new fields from API response
      checkpostEntry: item.checkPostName || item.checkpostEntry || item.checkpost_entry || item.checkpost || 'Not Specified',
      purpose: item.purposeName || item.branchPurpose || item.purpose || item.purposeOfImport || item.purpose_of_import || 'Not Specified'
    };
  }

  // Navigate back to the previous page
  goBack(): void {
    const source = this.route.snapshot.queryParamMap.get('source');
    const currentUrl = this.router.url;

    if (source === 'commissioner-dashboard') {
      this.router.navigate(['/dev-commissioner-dashboard']);
      return;
    } else if (source === 'permit-section') {
      this.router.navigate(['/app-permit-section']);
      return;
    } else if (source === 'licensee-dashboard') {
      this.router.navigate(['/dev-supply-chain']);
      return;
    }

    if (currentUrl.includes('/app-permit-section/')) {
      this.router.navigate(['/app-permit-section']);
    } else if (currentUrl.includes('commissioner')) {
      this.router.navigate(['/dev-commissioner-dashboard']);
    } else {
      this.router.navigate(['/dev-supply-chain']);
    }
  }

  getBackButtonText(): string {
    const source = this.route.snapshot.queryParamMap.get('source');
    const currentUrl = this.router.url;

    if (source === 'commissioner-dashboard') {
      return 'Back to Commissioner Dashboard';
    } else if (source === 'permit-section') {
      return 'Back to Permit Section';
    } else if (source === 'licensee-dashboard') {
      return 'Back to Supply Chain';
    }

    if (currentUrl.includes('/app-permit-section/')) {
      return 'Back to Permit Section';
    } else if (currentUrl.includes('commissioner')) {
      return 'Back to Commissioner Dashboard';
    } else {
      return 'Back to Supply Chain';
    }
  }

  printApplication(): void {
    const printable = document.getElementById('requisitionPrintSection')?.innerHTML || '';
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => (el as HTMLElement).outerHTML)
      .join('');
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) return;
    win.document.open();
    const ref = this.requisitionData?.referenceNo || '';
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>Requisition Application - ${ref}</title>
          ${styles}
          <style>
            @page { size: A4; margin: 12mm; }
            body { background: #fff; }
            .no-print { display:none !important; }
            .printable-content, .printable-content * { visibility: visible !important; }
          </style>
        </head>
        <body>
          ${printable}
        </body>
      </html>`);
    win.document.close();
    win.onload = () => {
      win.focus();
      win.print();
      win.close();
    };
  }

  getDistilleryName(code: string): string {
    if (!code) return 'Unknown Distillery';
    const cleanCode = code.toLowerCase();
    const distilleryMap: { [key: string]: string } = {
      'sikkim-distilleries': 'Sikkim Distilleries Ltd',
      'mountain-spirits': 'Mountain Spirits Pvt Ltd',
      'highland-breweries': 'Highland Breweries'
    };
    return distilleryMap[cleanCode] || code;
  }

  getBulkSpiritTypeName(code: string): string {
    if (!code) return '';
    const cleanCode = code.toLowerCase();
    // Common mappings
    if (cleanCode.includes('grain')) return 'Grain ENA';
    if (cleanCode.includes('molasses')) return 'Molasses ENA';
    if (cleanCode.includes('rectified')) return 'Rectified Spirit';

    const typeMap: { [key: string]: string } = {
      'grain-ena': 'Grain ENA',
      'molasses-ena': 'Molasses ENA',
      'rectified-spirit': 'Rectified Spirit'
    };
    return typeMap[cleanCode] || code;
  }

  getPurposeName(code: string): string {
    if (!code || code === 'Not Specified') return 'Not Specified';
    const cleanCode = code.toLowerCase();
    const purposeMap: { [key: string]: string } = {
      'manufacturing': 'Manufacturing',
      'blending': 'Blending',
      'bottling': 'Bottling'
    };
    return purposeMap[cleanCode] || code;
  }

  getCheckpostName(code: string): string {
    if (!code || code === 'Not Specified') return 'Not Specified';
    const cleanCode = code.toLowerCase();
    const checkpostMap: { [key: string]: string } = {
      'rangpo': 'Rangpo Checkpost',
      'melli': 'Melli Checkpost',
      'nathu-la': 'Nathu La Checkpost'
    };
    return checkpostMap[cleanCode] || code;
  }

  getStatusBadgeClass(status: string): string {
    if (status.includes('GENERATED') || status.includes('APPROVED') || status.includes('ISSUED') || status.includes('READY')) {
      return 'badge bg-success';
    } else if (status.includes('REVIEW') || status.includes('PROCESSING') || status.includes('PENDING') || status.includes('PROGRESS')) {
      return 'badge bg-warning';
    } else if (status.includes('INVALID') || status.includes('EXPIRED') || status.includes('REJECTED')) {
      return 'badge bg-danger';
    } else {
      return 'badge bg-info';
    }
  }

  parseRequisitionDate(dateStr: string | Date): Date {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) return dateStr;

    // Check if format is DD/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }

    return new Date(dateStr);
  }
}
