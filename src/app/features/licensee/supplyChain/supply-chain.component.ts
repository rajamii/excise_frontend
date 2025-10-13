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
    },
    {
      referenceNo: 'BF503/EXCISE',
      submissionDate: '21-Sep-2025',
      distilleryName: 'Himalayan Distilleries Pvt Ltd',
      status: 'APPLICATION UNDER REVIEW BY DEPARTMENT.',
      amount: '12.50'
    },
    {
      referenceNo: 'BF504/EXCISE',
      submissionDate: '20-Sep-2025',
      distilleryName: 'Royal Sikkim Brewery',
      status: 'PERMIT APPROVED AND READY FOR COLLECTION.',
      amount: '15.75'
    },
    {
      referenceNo: 'BF505/EXCISE',
      submissionDate: '19-Sep-2025',
      distilleryName: 'Mountain View Distilleries',
      status: 'DOCUMENTATION VERIFICATION IN PROGRESS.',
      amount: '9.25'
    },
    {
      referenceNo: 'BF506/EXCISE',
      submissionDate: '18-Sep-2025',
      distilleryName: 'Eastern Himalaya Distillery',
      status: 'PERMIT PROCESSING - AWAITING FINAL APPROVAL.',
      amount: '11.00'
    },
    {
      referenceNo: 'BF507/EXCISE',
      submissionDate: '17-Sep-2025',
      distilleryName: 'Gangtok Premium Spirits',
      status: 'APPLICATION SUBMITTED - INITIAL REVIEW COMPLETED.',
      amount: '14.25'
    },
    {
      referenceNo: 'BF508/EXCISE',
      submissionDate: '16-Sep-2025',
      distilleryName: 'Khangchendzonga Breweries',
      status: 'PERMIT READY FOR DISPATCH TO LICENSEE.',
      amount: '13.50'
    },
    {
      referenceNo: 'BF509/EXCISE',
      submissionDate: '15-Sep-2025',
      distilleryName: 'Teesta Valley Distilleries',
      status: 'TECHNICAL EVALUATION IN PROGRESS.',
      amount: '16.80'
    },
    {
      referenceNo: 'BF510/EXCISE',
      submissionDate: '14-Sep-2025',
      distilleryName: 'Rangit River Spirits',
      status: 'COMPLIANCE CHECK COMPLETED - AWAITING CLEARANCE.',
      amount: '10.75'
    },
    {
      referenceNo: 'BF511/EXCISE',
      submissionDate: '13-Sep-2025',
      distilleryName: 'Sikkim Highland Brewery',
      status: 'PERMIT APPROVED - COLLECTION NOTICE SENT.',
      amount: '18.90'
    },
    {
      referenceNo: 'BF512/EXCISE',
      submissionDate: '12-Sep-2025',
      distilleryName: 'Pelling Craft Distillery',
      status: 'APPLICATION UNDER DEPARTMENTAL REVIEW.',
      amount: '7.60'
    },
    {
      referenceNo: 'BF513/EXCISE',
      submissionDate: '11-Sep-2025',
      distilleryName: 'Yuksom Traditional Spirits',
      status: 'PERMIT GENERATION IN FINAL STAGE.',
      amount: '20.25'
    },
    {
      referenceNo: 'BF514/EXCISE',
      submissionDate: '10-Sep-2025',
      distilleryName: 'Namchi Valley Breweries',
      status: 'DOCUMENTATION REVIEW COMPLETED - PROCESSING.',
      amount: '12.40'
    },
    {
      referenceNo: 'BF515/EXCISE',
      submissionDate: '09-Sep-2025',
      distilleryName: 'Jorethang Premium Distillery',
      status: 'PERMIT ISSUED - READY FOR COLLECTION.',
      amount: '19.15'
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
    },
    {
      referenceNo: 'REV/BF601',
      submissionDate: '18-Sep-2025',
      distilleryName: 'Himalayan Distilleries Pvt Ltd',
      status: 'REVALIDATION REQUEST PENDING APPROVAL',
      amount: '5.00',
      isLive: false,
      isInvalid: false
    },
    {
      referenceNo: 'REV/BF602',
      submissionDate: '17-Sep-2025',
      distilleryName: 'Royal Sikkim Brewery',
      status: 'PERMIT EXPIRED - REQUIRES IMMEDIATE REVALIDATION',
      amount: '7.50',
      isLive: true,
      isInvalid: true
    },
    {
      referenceNo: 'REV/BF603',
      submissionDate: '16-Sep-2025',
      distilleryName: 'Mountain View Distilleries',
      status: 'REVALIDATION APPROVED - PERMIT EXTENDED',
      amount: '6.25',
      isLive: false,
      isInvalid: false
    }
  ];

  cancellationData: TableData[] = [
    {
      referenceNo: 'CAN/BF701',
      submissionDate: '15-Sep-2025',
      distilleryName: 'Sikkim Distilleries Ltd',
      status: 'CANCELLATION REQUEST APPROVED',
      amount: '0.00'
    },
    {
      referenceNo: 'CAN/BF702',
      submissionDate: '14-Sep-2025',
      distilleryName: 'Himalayan Distilleries Pvt Ltd',
      status: 'CANCELLATION UNDER REVIEW',
      amount: '0.00'
    }
  ];
  transitData: TableData[] = [
    {
      referenceNo: 'TRN/BF801',
      submissionDate: '13-Sep-2025',
      distilleryName: 'Royal Sikkim Brewery',
      status: 'TRANSIT PERMIT ISSUED',
      amount: '10.00'
    },
    {
      referenceNo: 'TRN/BF802',
      submissionDate: '12-Sep-2025',
      distilleryName: 'Mountain View Distilleries',
      status: 'TRANSIT APPLICATION PROCESSING',
      amount: '8.50'
    }
  ];

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
      case 'daily-production-register':
        this.router.navigate(['/dev-daily-production-register']);
        break;
      case 'brands-details':
        this.router.navigate(['/dev-brands-details']);
        break;
      case 'yuksom-local-sales-register':
        this.router.navigate(['/dev-local-sales-register']);
        break;
      case 'beer-production-register':
        this.router.navigate(['/dev-beer-production-register']);
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