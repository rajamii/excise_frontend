import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  SecretaryService, 
  SecretaryImflOverview, 
  ImflRequisitionDetailItem, 
  ImflRevalidationDetailItem, 
  ImflCancellationDetailItem 
} from '../../services/secretary.service';

@Component({
  selector: 'app-secretary-imfl',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './secretary-imfl.component.html',
  styleUrls: ['./secretary-imfl.component.scss']
})
export class SecretaryImflComponent implements OnInit {
  isLoading = false;
  
  // Category & Sub-tab navigation
  mainCategory: 'ena' | 'imfl' = 'ena';
  activeSubTab: 'requisition' | 'revalidation' | 'cancellation' = 'requisition';
  
  // Specific entity filters as requested by user
  selectedDistilleryFilter: string = 'all';  // For ENA tab
  selectedDistributorFilter: string = 'all'; // For IMFL tab
  statusFilter: 'all' | 'approved' | 'pending' = 'all';
  searchQuery: string = '';

  // Detail Modal Overlay
  selectedDetailItem: any = null;
  selectedDetailType: string = '';

  overview: SecretaryImflOverview = {
    summary_kpis: {
      requisitions_count: 2,
      revalidations_count: 3,
      cancellations_count: 3,
      total_imfl_records: 8
    },
    requisitions: [
      {
        reference_no: 'REQ/01/EXCISE',
        referenceNo: 'REQ/01/EXCISE',
        distillery_name: 'M/s Boudh Distillery Pvt Ltd',
        distilleryName: 'M/s Boudh Distillery Pvt Ltd',
        lifted_from: 'M/s Boudh Distillery Spirit Storage Facility',
        liftedFrom: 'M/s Boudh Distillery Spirit Storage Facility',
        purpose_name: 'Bottling & Packaging Plant',
        purposeName: 'Bottling & Packaging Plant',
        route: 'Rambhikata-Angul-Bhadrak-Balasore-Siliguri to Rangpo, East Sikkim',
        spirit_type: 'Fermented Grape Juice (ENA)',
        spiritType: 'Fermented Grape Juice (ENA)',
        strength: '12.5% V/V or 21.9 OP',
        total_bl: 5000.0,
        totalBl: 5000.0,
        permits_count: 5,
        permitsCount: 5,
        status: 'Approved',
        submitted_at: '2026-08-19 04:27',
        submittedAt: '2026-08-19 04:27',
        valid_up_to: '2026-09-15',
        validUpTo: '2026-09-15'
      },
      {
        reference_no: 'IMFLREQ/2026-27/0001',
        referenceNo: 'IMFLREQ/2026-27/0001',
        distillery_name: 'Sikkim Himalayan Bottlers Pvt Ltd',
        distilleryName: 'Sikkim Himalayan Bottlers Pvt Ltd',
        supplier_name: 'Sikkim Himalayan Bottlers Pvt Ltd',
        supplierName: 'Sikkim Himalayan Bottlers Pvt Ltd',
        lifted_from: 'Gangtok Central Spirits Depot',
        liftedFrom: 'Gangtok Central Spirits Depot',
        purpose_name: 'MG Marg Wholesale Depot',
        purposeName: 'MG Marg Wholesale Depot',
        route: 'Mode: Road Transport | Vehicle: SK-01-D-8821',
        spirit_type: 'IMFL Premium Cases',
        spiritType: 'IMFL Premium Cases',
        strength: '42.8% V/V',
        total_bl: 18500.0,
        totalBl: 18500.0,
        permits_count: 3,
        permitsCount: 3,
        status: 'Approved',
        submitted_at: '2026-08-22 09:52',
        submittedAt: '2026-08-22 09:52',
        valid_up_to: '2026-09-30',
        validUpTo: '2026-09-30'
      }
    ],
    revalidations: [
      {
        reference_no: 'REV-ENA-2026-001',
        referenceNo: 'REV-ENA-2026-001',
        distillery_name: 'Sikkim Distillery Limited (Rangpo Unit)',
        distilleryName: 'Sikkim Distillery Limited (Rangpo Unit)',
        spirit_type: 'Extra Neutral Alcohol (ENA)',
        spiritType: 'Extra Neutral Alcohol (ENA)',
        total_bl: 15000.0,
        totalBl: 15000.0,
        revalidation_date: '2026-09-15',
        revalidationDate: '2026-09-15',
        revalidation_fee: 2500.0,
        revalidationFee: 2500.0,
        branch_name: 'East Sikkim Excise Depot',
        branchName: 'East Sikkim Excise Depot',
        status: 'Approved',
        reason: 'Permit validity extension requested due to transit delay at checkpost',
        submitted_at: '2026-08-12 14:00',
        submittedAt: '2026-08-12 14:00'
      },
      {
        reference_no: 'IMFLREV/2026-27/0001',
        referenceNo: 'IMFLREV/2026-27/0001',
        distillery_name: 'Yuksom Breweries Limited',
        distilleryName: 'Yuksom Breweries Limited',
        establishment_name: 'Yuksom Breweries Limited',
        establishmentName: 'Yuksom Breweries Limited',
        spirit_type: 'IMFL Premium Cases',
        spiritType: 'IMFL Premium Cases',
        total_bl: 12000.0,
        totalBl: 12000.0,
        revalidation_date: '2026-09-20',
        revalidationDate: '2026-09-20',
        revalidation_fee: 3500.0,
        revalidationFee: 3500.0,
        branch_name: 'Central Excise Warehouse',
        branchName: 'Central Excise Warehouse',
        status: 'Approved By Commissioner',
        reason: 'Trans-shipment delay revalidation request during interstate transit',
        submitted_at: '2026-08-13 11:00',
        submittedAt: '2026-08-13 11:00'
      }
    ],
    cancellations: [
      {
        reference_no: 'CAN/02/EXCISE',
        referenceNo: 'CAN/02/EXCISE',
        requisition_ref: 'REQ/01/EXCISE',
        requisitionRef: 'REQ/01/EXCISE',
        distillery_name: 'M/s Boudh Distillery Pvt Ltd',
        distilleryName: 'M/s Boudh Distillery Pvt Ltd',
        spirit_type: 'Fermented Grape Juice (ENA)',
        spiritType: 'Fermented Grape Juice (ENA)',
        cancelled_bl: 5000.0,
        cancelledBl: 5000.0,
        cancellation_fee: 10000.0,
        cancellationFee: 10000.0,
        cancelled_permit_no: 'PERMIT/2026/02',
        cancelledPermitNo: 'PERMIT/2026/02',
        status: 'Approved By Commissioner',
        reason: 'Order quantity revised by licensee prior to dispatch',
        submitted_at: '2026-08-19 04:51',
        submittedAt: '2026-08-19 04:51'
      },
      {
        reference_no: 'IMFLCAN/2026-27/0001',
        referenceNo: 'IMFLCAN/2026-27/0001',
        requisition_ref: 'IMFLREQ/2026-27/0001',
        requisitionRef: 'IMFLREQ/2026-27/0001',
        distillery_name: 'Sikkim Himalayan Bottlers Pvt Ltd',
        distilleryName: 'Sikkim Himalayan Bottlers Pvt Ltd',
        establishment_name: 'Sikkim Himalayan Bottlers Pvt Ltd',
        establishmentName: 'Sikkim Himalayan Bottlers Pvt Ltd',
        spirit_type: 'IMFL Premium Cases',
        spiritType: 'IMFL Premium Cases',
        cancelled_bl: 6500.0,
        cancelledBl: 6500.0,
        cancellation_fee: 2000.0,
        cancellationFee: 2000.0,
        cancelled_permit_no: 'IMFLREQ/2026-27/0001-P2',
        cancelledPermitNo: 'IMFLREQ/2026-27/0001-P2',
        status: 'Forwarded To Commissioner',
        reason: 'Commercial cancellation requested before transit vehicle departure',
        submitted_at: '2026-08-22 09:53',
        submittedAt: '2026-08-22 09:53'
      }
    ]
  };

  constructor(private secretaryService: SecretaryService) {}

  ngOnInit(): void {
    this.loadImflData();
  }

  loadImflData(): void {
    this.isLoading = true;
    this.secretaryService.getImflOverview().subscribe({
      next: (res) => {
        if (res && res.requisitions && res.requisitions.length > 0) {
          this.overview = res;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load Secretary IMFL overview:', err);
        this.isLoading = false;
      }
    });
  }

  setMainCategory(cat: 'ena' | 'imfl'): void {
    this.mainCategory = cat;
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.selectedDistilleryFilter = 'all';
    this.selectedDistributorFilter = 'all';
  }

  setSubTab(tab: 'requisition' | 'revalidation' | 'cancellation'): void {
    this.activeSubTab = tab;
    this.searchQuery = '';
    this.statusFilter = 'all';
  }

  // List of Manufacturing Distilleries for ENA Filter (Sub-category: Distillery)
  get availableEnaDistilleries(): string[] {
    const defaultDistilleries = [
      'M/s Boudh Distillery Pvt Ltd',
      'M/s Alpine Distilleries Pvt Ltd',
      'Sikkim Distillery Limited'
    ];
    const list: string[] = [...defaultDistilleries];
    const addDist = (name?: string) => {
      if (name && name !== 'all') {
        const lower = name.toLowerCase();
        if (!lower.includes('brewery') && !lower.includes('breweries') && !lower.includes('distributor') && !lower.includes('depot') && !list.includes(name)) {
          list.push(name);
        }
      }
    };
    (this.overview?.requisitions || []).forEach(i => {
      if (this.isEnaRecord(i)) addDist(i.distilleryName || i.distillery_name);
    });
    (this.overview?.revalidations || []).forEach(i => {
      if (this.isEnaRecord(i)) addDist(i.distilleryName || i.distillery_name);
    });
    (this.overview?.cancellations || []).forEach(i => {
      if (this.isEnaRecord(i)) addDist(i.distilleryName || i.distillery_name);
    });
    return list;
  }

  // List of Distributors for IMFL Filter (User whose Role is Distributor)
  get availableImflDistributors(): string[] {
    const list: string[] = ['DD01881001 (Distributor User)'];
    const addDist = (name?: string) => {
      if (name && name !== 'all' && !list.includes(name)) {
        list.push(name);
      }
    };
    (this.overview?.requisitions || []).forEach(i => {
      if (!this.isEnaRecord(i)) addDist(i.distributorName || i.distributor_name || i.distributorUsername || i.distributor_username);
    });
    (this.overview?.revalidations || []).forEach(i => {
      if (!this.isEnaRecord(i)) addDist(i.distributorName || i.distributor_name || i.distributorUsername || i.distributor_username);
    });
    (this.overview?.cancellations || []).forEach(i => {
      if (!this.isEnaRecord(i)) addDist(i.distributorName || i.distributor_name || i.distributorUsername || i.distributor_username);
    });
    return list;
  }

  private isEnaRecord(item: any): boolean {
    const sType = (item.spiritType || item.spirit_type || '').toLowerCase();
    const ref = (item.referenceNo || item.reference_no || '').toLowerCase();
    
    // Explicitly exclude any IMFL record (e.g., IMFLREQ, IMFLREV, IMFLCAN)
    if (ref.includes('imfl') || sType.includes('imfl')) {
      return false;
    }

    return (
      sType.includes('ena') ||
      sType.includes('alcohol') ||
      sType.includes('spirit') ||
      sType.includes('grape') ||
      ref.startsWith('req/') ||
      ref.startsWith('rev-ena') ||
      ref.startsWith('cnc-ena') ||
      ref.startsWith('can/')
    );
  }

  get filteredRequisitions(): ImflRequisitionDetailItem[] {
    let list = (this.overview?.requisitions || []).filter(i => 
      this.mainCategory === 'ena' ? this.isEnaRecord(i) : !this.isEnaRecord(i)
    );

    // ENA Distillery Filter
    if (this.mainCategory === 'ena' && this.selectedDistilleryFilter !== 'all') {
      list = list.filter(i => (i.distilleryName || i.distillery_name) === this.selectedDistilleryFilter);
    }
    // IMFL Distributor Filter (matches Distributor User)
    if (this.mainCategory === 'imfl' && this.selectedDistributorFilter !== 'all') {
      list = list.filter(i => 
        (i.distributorName || i.distributor_name || i.distributorUsername || i.distributor_username || i.distilleryName || i.distillery_name) === this.selectedDistributorFilter
      );
    }

    if (this.statusFilter === 'approved') {
      list = list.filter(i => i.status && i.status.toLowerCase().includes('approved'));
    } else if (this.statusFilter === 'pending') {
      list = list.filter(i => !i.status || !i.status.toLowerCase().includes('approved'));
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(i => 
        ((i.referenceNo || i.reference_no) && (i.referenceNo || i.reference_no).toLowerCase().includes(q)) || 
        ((i.distributorName || i.distributor_name || i.distilleryName || i.distillery_name) && (i.distributorName || i.distributor_name || i.distilleryName || i.distillery_name).toLowerCase().includes(q)) || 
        ((i.purposeName || i.purpose_name) && (i.purposeName || i.purpose_name).toLowerCase().includes(q)) ||
        ((i.spiritType || i.spirit_type) && (i.spiritType || i.spirit_type).toLowerCase().includes(q))
      );
    }
    return list;
  }

  get filteredRevalidations(): ImflRevalidationDetailItem[] {
    let list = (this.overview?.revalidations || []).filter(i => 
      this.mainCategory === 'ena' ? this.isEnaRecord(i) : !this.isEnaRecord(i)
    );

    if (this.mainCategory === 'ena' && this.selectedDistilleryFilter !== 'all') {
      list = list.filter(i => (i.distilleryName || i.distillery_name) === this.selectedDistilleryFilter);
    }
    if (this.mainCategory === 'imfl' && this.selectedDistributorFilter !== 'all') {
      list = list.filter(i => 
        (i.distributorName || i.distributor_name || i.distributorUsername || i.distributor_username || i.distilleryName || i.distillery_name || i.establishmentName || i.establishment_name) === this.selectedDistributorFilter
      );
    }

    if (this.statusFilter === 'approved') {
      list = list.filter(i => i.status && i.status.toLowerCase().includes('approved'));
    } else if (this.statusFilter === 'pending') {
      list = list.filter(i => !i.status || !i.status.toLowerCase().includes('approved'));
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(i => 
        ((i.referenceNo || i.reference_no) && (i.referenceNo || i.reference_no).toLowerCase().includes(q)) || 
        ((i.distilleryName || i.distillery_name) && (i.distilleryName || i.distillery_name).toLowerCase().includes(q)) || 
        (i.reason && i.reason.toLowerCase().includes(q)) ||
        ((i.branchName || i.branch_name) && (i.branchName || i.branch_name).toLowerCase().includes(q))
      );
    }
    return list;
  }

  get filteredCancellations(): ImflCancellationDetailItem[] {
    let list = (this.overview?.cancellations || []).filter(i => 
      this.mainCategory === 'ena' ? this.isEnaRecord(i) : !this.isEnaRecord(i)
    );

    if (this.mainCategory === 'ena' && this.selectedDistilleryFilter !== 'all') {
      list = list.filter(i => (i.distilleryName || i.distillery_name) === this.selectedDistilleryFilter);
    }
    if (this.mainCategory === 'imfl' && this.selectedDistributorFilter !== 'all') {
      list = list.filter(i => (i.distilleryName || i.distillery_name || i.establishmentName || i.establishment_name) === this.selectedDistributorFilter);
    }

    if (this.statusFilter === 'approved') {
      list = list.filter(i => i.status && i.status.toLowerCase().includes('approved'));
    } else if (this.statusFilter === 'pending') {
      list = list.filter(i => !i.status || !i.status.toLowerCase().includes('approved'));
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(i => 
        ((i.referenceNo || i.reference_no) && (i.referenceNo || i.reference_no).toLowerCase().includes(q)) || 
        ((i.requisitionRef || i.requisition_ref) && (i.requisitionRef || i.requisition_ref).toLowerCase().includes(q)) ||
        ((i.distilleryName || i.distillery_name) && (i.distilleryName || i.distillery_name).toLowerCase().includes(q)) || 
        (i.reason && i.reason.toLowerCase().includes(q))
      );
    }
    return list;
  }

  openDetailView(item: any, type: string): void {
    this.selectedDetailItem = item;
    this.selectedDetailType = type;
  }

  closeDetailView(): void {
    this.selectedDetailItem = null;
    this.selectedDetailType = '';
  }

  printDetailView(): void {
    window.print();
  }
}
