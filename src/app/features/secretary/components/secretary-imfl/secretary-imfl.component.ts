import { Component, OnInit } from '@angular/core';
import { Location, CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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

  // Pagination State
  pageSize = 5;
  currentPageMap: { [key: string]: number } = {
    'requisition': 1,
    'revalidation': 1,
    'cancellation': 1
  };

  onPageSizeChange(): void {
    Object.keys(this.currentPageMap).forEach(key => {
      this.currentPageMap[key] = 1;
    });
  }

  getCurrentPage(tabKey: string): number {
    return this.currentPageMap[tabKey] || 1;
  }

  setPage(tabKey: string, page: number): void {
    const maxPages = this.getTotalPagesForTab(tabKey);
    if (page >= 1 && page <= maxPages) {
      this.currentPageMap[tabKey] = page;
    }
  }

  getPaginatedList<T>(list: T[], tabKey: string): T[] {
    const page = this.getCurrentPage(tabKey);
    const start = (page - 1) * this.pageSize;
    return (list || []).slice(start, start + this.pageSize);
  }

  getListForTab(tabKey: string): any[] {
    if (tabKey === 'requisition') return this.filteredRequisitions;
    if (tabKey === 'revalidation') return this.filteredRevalidations;
    if (tabKey === 'cancellation') return this.filteredCancellations;
    return [];
  }

  getTotalPagesForTab(tabKey: string): number {
    const len = this.getListForTab(tabKey).length;
    return Math.ceil(len / this.pageSize) || 1;
  }

  getPageNumbersForTab(tabKey: string): number[] {
    const pages = this.getTotalPagesForTab(tabKey);
    return Array.from({ length: pages }, (_, i) => i + 1);
  }

  getStartIndex(tabKey: string): number {
    const len = this.getListForTab(tabKey).length;
    if (len === 0) return 0;
    const page = this.getCurrentPage(tabKey);
    return (page - 1) * this.pageSize + 1;
  }

  getEndIndex(tabKey: string): number {
    const len = this.getListForTab(tabKey).length;
    const page = this.getCurrentPage(tabKey);
    return Math.min(page * this.pageSize, len);
  }

  overview: SecretaryImflOverview = {
    summary_kpis: {
      requisitions_count: 0,
      revalidations_count: 0,
      cancellations_count: 0,
      total_imfl_records: 0
    },
    requisitions: [],
    revalidations: [],
    cancellations: []
  };

  constructor(
    private secretaryService: SecretaryService,
    private location: Location,
    private router: Router
  ) {}

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  ngOnInit(): void {
    this.loadImflData();
  }

  loadImflData(): void {
    this.isLoading = true;
    this.secretaryService.getImflOverview().subscribe({
      next: (res) => {
        if (res) {
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
    this.currentPageMap['requisition'] = 1;
    this.currentPageMap['revalidation'] = 1;
    this.currentPageMap['cancellation'] = 1;
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.selectedDistilleryFilter = 'all';
    this.selectedDistributorFilter = 'all';
  }

  setSubTab(tab: 'requisition' | 'revalidation' | 'cancellation'): void {
    this.activeSubTab = tab;
    this.currentPageMap[tab] = 1;
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
        (i.referenceNo || i.reference_no || '').toLowerCase().includes(q) || 
        (i.distributorName || i.distributor_name || i.distilleryName || i.distillery_name || '').toLowerCase().includes(q) || 
        (i.purposeName || i.purpose_name || '').toLowerCase().includes(q) ||
        (i.spiritType || i.spirit_type || '').toLowerCase().includes(q)
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
        (i.referenceNo || i.reference_no || '').toLowerCase().includes(q) || 
        (i.requisitionRef || i.requisition_ref || '').toLowerCase().includes(q) ||
        (i.distilleryName || i.distillery_name || '').toLowerCase().includes(q) || 
        (i.reason || '').toLowerCase().includes(q)
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
