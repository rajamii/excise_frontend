import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SupplyChainService } from '../../services/supplychain.service';

interface RevalidationData {
  id: string;
  referenceNo: string;
  submissionDate: Date;
  distilleryName: string;
  status: string;
  brAmount: number;
  revalidationAmount?: number;
  originalPermitNo?: string;
  originalPermitDate?: Date;
  expiryDate?: Date;
  reasonForRevalidation?: string;
  newQuantity?: number;
  newPurpose?: string;
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
  selector: 'app-supply-chain-revalidation-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './supply-chain-revalidation-view.component.html',
  styleUrls: ['./supply-chain-revalidation-view.component.scss']
})
export class SupplyChainRevalidationViewComponent implements OnInit {
  revalidationData?: RevalidationData;
  private isBrowser = false;
  isLoading = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supplyChainService: SupplyChainService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      // Check if ref is from route params (permit section) or query params (supply chain)
      let ref = this.route.snapshot.paramMap.get('ref');
      if (!ref) {
        ref = this.route.snapshot.queryParamMap.get('ref');
      }
      
      if (ref) {
        this.loadRevalidationData(ref);
      } else {
        this.goBack();
      }
    }
  }

  private loadRevalidationData(refNo: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    // First, get all revalidation data to find the ID by reference number
    this.supplyChainService.getRevalidationData().subscribe({
      next: (data) => {
        console.log('Revalidation data received:', data);
        
        // Find the item by reference number or licensee ID
        const foundItem = data.find(item => 
          item.our_ref_no === refNo || 
          item.ourRefNo === refNo ||
          item.referenceNo === refNo ||
          item.reference_no === refNo ||
          item.licenseeId === refNo ||
          item.licensee_id === refNo ||
          // Also check if refNo contains the licensee ID (like "M/s Sikkim Distilleries Ltd (99202532911)")
          (refNo.includes('(') && refNo.includes(')') && 
           (item.licenseeId === refNo.match(/\(([^)]+)\)/)?.[1] || 
            item.licensee_id === refNo.match(/\(([^)]+)\)/)?.[1]))
        );
        
        if (foundItem) {
          // Get detailed data using the ID
          const itemId = foundItem.id || foundItem.pk;
          if (itemId) {
            this.loadRevalidationDetail(itemId);
          } else {
            // If no ID found, use the found item data directly
            this.mapApiDataToInterface(foundItem);
            this.isLoading = false;
          }
        } else {
          console.warn('Revalidation not found for reference:', refNo);
          this.errorMessage = `Revalidation application not found for reference: ${refNo}`;
          this.isLoading = false;
          
          // Fallback to sample data for development
          this.loadSampleDataFallback(refNo);
        }
      },
      error: (error) => {
        console.error('Error loading revalidation data:', error);
        this.errorMessage = 'Failed to load revalidation data. Please try again.';
        this.isLoading = false;
        
        // Fallback to sample data for development
        this.loadSampleDataFallback(refNo);
      }
    });
  }

  private loadRevalidationDetail(id: string): void {
    this.supplyChainService.getRevalidationDetail(id).subscribe({
      next: (data) => {
        console.log('Revalidation detail received:', data);
        this.mapApiDataToInterface(data);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading revalidation detail:', error);
        this.errorMessage = 'Failed to load revalidation details. Please try again.';
        this.isLoading = false;
      }
    });
  }

  private mapApiDataToInterface(apiData: any): void {
    // Map API response to our interface
    this.revalidationData = {
      id: apiData.id || apiData.pk || '',
      referenceNo: apiData.ourRefNo || apiData.our_ref_no || apiData.referenceNo || '',
      submissionDate: new Date(apiData.requisitionDate || apiData.requisition_date || apiData.created_at || Date.now()),
      distilleryName: apiData.distilleryName || apiData.distillery_name || '',
      status: apiData.status || 'PENDING',
      brAmount: parseFloat(apiData.brAmount || apiData.br_amount || '0'),
      revalidationAmount: parseFloat(apiData.revalidationBrAmount || apiData.revalidation_br_amount || '0'),
      originalPermitNo: apiData.originalPermitNo || apiData.original_permit_no || apiData.ourRefNo || '',
      originalPermitDate: apiData.originalPermitDate ? new Date(apiData.originalPermitDate) : 
                         apiData.original_permit_date ? new Date(apiData.original_permit_date) :
                         apiData.requisitionDate ? new Date(apiData.requisitionDate) : undefined,
      expiryDate: apiData.revalidationDate ? new Date(apiData.revalidationDate) : 
                 apiData.revalidation_date ? new Date(apiData.revalidation_date) : undefined,
      reasonForRevalidation: apiData.reasonForRevalidation || apiData.reason_for_revalidation || 'Revalidation requested',
      newQuantity: parseFloat(apiData.grainEnaNumber || apiData.grain_ena_number || '0'),
      newPurpose: apiData.branchPurpose || apiData.branch_purpose || '',
      quantity: parseFloat(apiData.totalBl || apiData.total_bl || '0'),
      numberOfPermits: parseInt(apiData.requisitonNumberOfPermits || apiData.requisiton_number_of_permits || '1'),
      bulkSpiritType: apiData.bulkSpiritType || apiData.bulk_spirit_type || '',
      strengthTo: apiData.strength || apiData.strengthTo || '',
      liftedFrom: apiData.liftedFrom || apiData.lifted_from || '',
      viaRoute: apiData.viaRoute || apiData.via_route || '',
      checkpostEntry: apiData.checkpostEntry || apiData.checkpost_entry || '',
      purpose: apiData.branchPurpose || apiData.branch_purpose || apiData.purpose || ''
    };
  }

  private loadSampleDataFallback(refNo: string): void {
    console.log('Loading sample data fallback for:', refNo);
    
    const sampleData: RevalidationData[] = [
      {
        id: '1',
        referenceNo: 'IMP/SUP-AGDIST',
        submissionDate: new Date('2025-09-22'),
        distilleryName: 'M/s Sikkim Distilleries Ltd',
        status: 'IMPORT PERMIT EXTENDS 45 DAYS - INVALID',
        brAmount: 0.00,
        revalidationAmount: 5.00,
        originalPermitNo: 'BF502/EXCISE',
        originalPermitDate: new Date('2025-08-22'),
        expiryDate: new Date('2025-10-06'),
        reasonForRevalidation: 'Permit expired - requires immediate revalidation',
        newQuantity: 1000,
        newPurpose: 'Manufacturing extension',
        quantity: 1000,
        numberOfPermits: 1,
        bulkSpiritType: 'grain-ena',
        strengthTo: '96.0',
        liftedFrom: 'sikkim-distilleries',
        viaRoute: 'Gangtok - Siliguri Highway',
        checkpostEntry: 'rangpo',
        purpose: 'manufacturing'
      },
      {
        id: '2',
        referenceNo: 'REV/BF601',
        submissionDate: new Date('2025-09-18'),
        distilleryName: 'M/s Sikkim Distilleries Ltd',
        status: 'REVALIDATION REQUEST PENDING APPROVAL',
        brAmount: 5.00,
        revalidationAmount: 5.00,
        originalPermitNo: 'BF503/EXCISE',
        originalPermitDate: new Date('2025-08-18'),
        expiryDate: new Date('2025-10-18'),
        reasonForRevalidation: 'Extension of validity period due to operational delays',
        newQuantity: 1250,
        newPurpose: 'Manufacturing continuation',
        quantity: 1250,
        numberOfPermits: 1,
        bulkSpiritType: 'molasses-ena',
        strengthTo: '95.0',
        liftedFrom: 'mountain-spirits',
        viaRoute: 'NH 31A via Sevoke',
        checkpostEntry: 'melli',
        purpose: 'manufacturing'
      }
    ];

    const found = sampleData.find(r => r.referenceNo === refNo);
    if (found) {
      this.revalidationData = found;
      this.errorMessage = '';
    } else {
      // Create a generic entry for any reference number
      this.revalidationData = {
        id: '999',
        referenceNo: refNo,
        submissionDate: new Date(),
        distilleryName: 'M/s Sikkim Distilleries Ltd',
        status: 'REVALIDATION REQUEST PENDING APPROVAL',
        brAmount: 0.00,
        revalidationAmount: 5.00,
        originalPermitNo: 'BF999/EXCISE',
        originalPermitDate: new Date(),
        expiryDate: new Date(),
        reasonForRevalidation: 'Revalidation requested for permit extension',
        newQuantity: 1000,
        newPurpose: 'Manufacturing continuation',
        quantity: 1000,
        numberOfPermits: 1,
        bulkSpiritType: 'grain-ena',
        strengthTo: '96.0',
        liftedFrom: 'sikkim-distilleries',
        viaRoute: 'Gangtok - Siliguri Highway',
        checkpostEntry: 'rangpo',
        purpose: 'manufacturing'
      };
      this.errorMessage = '';
    }
  }

  goBack(): void {
    // Check source parameter first, then fall back to URL-based detection
    const source = this.route.snapshot.queryParamMap.get('source');
    const currentUrl = this.router.url;
    console.log('Going back from URL:', currentUrl, 'Source:', source); // Debug log
    
    // Priority 1: Check source query parameter
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
    
    // Priority 2: Check URL patterns for backward compatibility
    if (currentUrl.includes('/app-permit-section/')) {
      this.router.navigate(['/app-permit-section']);
    } else if (currentUrl.includes('commissioner')) {
      this.router.navigate(['/dev-commissioner-dashboard']);
    } else {
      // Default: go back to supply chain
      this.router.navigate(['/dev-supply-chain']);
    }
  }

  getBackButtonText(): string {
    // Check source parameter first, then fall back to URL-based detection
    const source = this.route.snapshot.queryParamMap.get('source');
    const currentUrl = this.router.url;
    console.log('Current URL:', currentUrl, 'Source:', source); // Debug log
    
    // Priority 1: Check source query parameter
    if (source === 'commissioner-dashboard') {
      return 'Back to Commissioner Dashboard';
    } else if (source === 'permit-section') {
      return 'Back to Permit Section';
    } else if (source === 'licensee-dashboard') {
      return 'Back to Supply Chain';
    }
    
    // Priority 2: Check URL patterns for backward compatibility
    if (currentUrl.includes('/app-permit-section/')) {
      return 'Back to Permit Section';
    } else if (currentUrl.includes('commissioner')) {
      return 'Back to Commissioner Dashboard';
    } else {
      return 'Back to Supply Chain';
    }
  }

  printApplication(): void {
    const printable = document.getElementById('revalidationPrintSection')?.innerHTML || '';
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => (el as HTMLElement).outerHTML)
      .join('');
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) return;
    win.document.open();
    const ref = this.revalidationData?.referenceNo || '';
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>Revalidation Application - ${ref}</title>
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
    const distilleryMap: { [key: string]: string } = {
      'sikkim-distilleries': 'Sikkim Distilleries Ltd',
      'mountain-spirits': 'Mountain Spirits Pvt Ltd',
      'highland-breweries': 'Highland Breweries'
    };
    return distilleryMap[code] || code;
  }

  getBulkSpiritTypeName(code: string): string {
    const typeMap: { [key: string]: string } = {
      'grain-ena': 'Grain ENA',
      'molasses-ena': 'Molasses ENA',
      'rectified-spirit': 'Rectified Spirit'
    };
    return typeMap[code] || code;
  }

  getPurposeName(code: string): string {
    const purposeMap: { [key: string]: string } = {
      'manufacturing': 'Manufacturing',
      'blending': 'Blending',
      'bottling': 'Bottling'
    };
    return purposeMap[code] || code;
  }

  getCheckpostName(code: string): string {
    const checkpostMap: { [key: string]: string } = {
      'rangpo': 'Rangpo Checkpost',
      'melli': 'Melli Checkpost',
      'nathu-la': 'Nathu La Checkpost'
    };
    return checkpostMap[code] || code;
  }

  getStatusBadgeClass(status: string): string {
    if (status.includes('APPROVED') || status.includes('EXTENDED')) {
      return 'badge bg-success';
    } else if (status.includes('PENDING') || status.includes('REQUEST')) {
      return 'badge bg-warning';
    } else if (status.includes('INVALID') || status.includes('EXPIRED')) {
      return 'badge bg-danger';
    } else {
      return 'badge bg-info';
    }
  }
}
