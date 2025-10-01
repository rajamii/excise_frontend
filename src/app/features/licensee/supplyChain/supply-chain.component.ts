import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface TableData {
  referenceNo: string;
  submissionDate: string;
  distilleryName: string;
  status: string;
  amount: string;
  isLive?: boolean;
  isInvalid?: boolean;
}

@Component({
  selector: 'app-supply-chain',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supply-chain.component.html',
  styleUrls: ['./supply-chain.component.scss']
})
export class SupplyChainComponent {
  Math = Math;
  selectedDate = '';
  selectedMonth = '';
  selectedYear = '';
  selectedDistillery = '';
  selectedStatus = '';
  activeTab = 'requisition';
  sidebarHidden = true;

  // Sample data for display only
  requisitionData: TableData[] = [
    {
      referenceNo: 'BF502/EXCISE',
      submissionDate: '22-Sep-2025',
      distilleryName: 'Sikkim Distilleries Ltd',
      status: 'THE PERMIT HAS BEEN GENERATED AND WILL BE MAILED TO THE CONCERNED AUTHORITY.',
      amount: '8.00'
    }
  ];

  revlidationData: TableData[] = [
    {
      referenceNo: 'IMP/SUP-AGDIST',
      submissionDate: '22-Sep-2025',
      distilleryName: 'Sikkim Distilleries Ltd',
      status: 'IMPORT PERMIT EXTENDS 45 DAYS - INVALID',
      amount: '0.00',
      isLive: true,
      isInvalid: true
    }
  ];

  cancellationData: TableData[] = [];
  transitData: TableData[] = [];

  constructor(private router: Router) { }

  // UI interaction methods only
  onSearch(): void {
    // Frontend search logic only
  }

  onClear(): void {
    this.selectedDate = '';
    this.selectedMonth = '';
    this.selectedYear = '';
    this.selectedDistillery = '';
    this.selectedStatus = '';
  }


  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  viewApplication(item: TableData): void {
    // Navigate to payment confirmation page (development route)
    this.router.navigate(['/dev-payment-confirmation'], {
      queryParams: {
        tab: 'requisition',
        referenceNo: item.referenceNo
      }
    });
  }

  viewSlip(item: TableData): void {
    // Navigate to payment confirmation page (development route)
    this.router.navigate(['/dev-payment-confirmation'], {
      queryParams: {
        tab: 'requisition',
        referenceNo: item.referenceNo,
        action: 'viewSlip'
      }
    });
  }

  requestRevlidation(item: TableData): void {
    // Navigate to payment confirmation page (development route)
    this.router.navigate(['/dev-payment-confirmation'], {
      queryParams: {
        tab: 'revalidation',
        referenceNo: item.referenceNo
      }
    });
  }

  viewWallet(): void {
    // Navigate to payment confirmation page (development route)
    this.router.navigate(['/dev-payment-confirmation']);
  }

  navigateTo(route: string): void {
    switch (route) {
      case 'import-permit':
        this.router.navigate(['/dev-import-permit']);
        break;
      case 'transit-permit':
        this.router.navigate(['/dev-transit-permit']);
        break;
      case 'transit-permit-register':
        this.router.navigate(['/dev-transit-permit-register']);
        break;
      case 'daily-record-register':
        this.router.navigate(['/dev-daily-record-register']);
        break;
      case 'dashboard':
        this.router.navigate(['/dev-supply-chain']);
        break;
      case 'payments':
        this.router.navigate(['/dev-payment-confirmation']);
        break;
      case 'payment-receipt':
        this.router.navigate(['/dev-payment-receipt']);
        break;
      default:
        this.router.navigate(['/dev-supply-chain']);
    }
  }

  toggleSidebar(): void {
    this.sidebarHidden = !this.sidebarHidden;
  }

  // Pagination state per tab
  pageSizeOptions: number[] = [5, 10, 15];
  pageSizeByTab: Record<string, number> = {
    requisition: 5,
    revalidation: 5,
    cancellation: 5,
    transit: 5
  };
  currentPageByTab: Record<string, number> = {
    requisition: 1,
    revalidation: 1,
    cancellation: 1,
    transit: 1
  };

  getCurrentPage(tab: string): number {
    return this.currentPageByTab[tab] ?? 1;
  }

  getPageSize(tab: string): number {
    return this.pageSizeByTab[tab] ?? 5;
  }

  getTotalPages(data: TableData[], tab: string): number {
    const size = this.getPageSize(tab);
    return Math.max(1, Math.ceil((data?.length || 0) / size));
  }

  getPaged(data: TableData[], tab: string): TableData[] {
    const size = this.getPageSize(tab);
    const page = this.getCurrentPage(tab);
    const start = (page - 1) * size;
    return (data || []).slice(start, start + size);
  }

  goToPage(tab: string, page: number, data: TableData[]): void {
    const total = this.getTotalPages(data, tab);
    if (page < 1 || page > total) return;
    this.currentPageByTab[tab] = page;
  }

  changePageSize(tab: string, size: string | number): void {
    const s = typeof size === 'string' ? parseInt(size, 10) : size;
    if (!s) return;
    this.pageSizeByTab[tab] = s;
    this.currentPageByTab[tab] = 1;
  }
}