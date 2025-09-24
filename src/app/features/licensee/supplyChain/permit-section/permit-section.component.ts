import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface PermitData {
  referenceNo: string;
  submissionDate: Date;
  distilleryName: string;
  status: string;
  amount: number;
  type: 'requisition' | 'revalidation' | 'cancellation' | 'transit';
}

@Component({
  selector: 'app-permit-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './permit-section.component.html',
  styleUrls: ['./permit-section.component.scss']
})
export class PermitSectionComponent implements OnInit {
  activeTab = 'requisition';
  searchName = '';
  selectedDate = '';
  selectedMonth = '';
  selectedYear = '';
  selectedDistillery = '';
  selectedStatus = '';

  // Sample data matching the .NET dashboard image
  allPermits: PermitData[] = [
    {
      referenceNo: 'IBPS/02/EXCISE',
      submissionDate: new Date('2025-09-22'),
      distilleryName: 'Sikkim Distilleries Ltd',
      status: 'THE PERMIT HAS BEEN GENERATED AND WILL BE MAILED TO THE CONCERNED AUTHORITY.',
      amount: 8.00,
      type: 'requisition'
    },
    {
      referenceNo: 'IBPS/02/EXCISE',
      submissionDate: new Date('2025-09-15'),
      distilleryName: 'Mount Distilleries Ltd',
      status: 'THE PERMIT HAS BEEN GENERATED AND WILL BE MAILED TO THE CONCERNED AUTHORITY.',
      amount: 120.00,
      type: 'requisition'
    },
    {
      referenceNo: 'IBPS/03/EXCISE',
      submissionDate: new Date('2025-09-05'),
      distilleryName: 'Darjeeling Artisan Pvt Ltd',
      status: 'THE PERMIT HAS BEEN GENERATED AND WILL BE MAILED TO THE CONCERNED AUTHORITY.',
      amount: 8.00,
      type: 'requisition'
    },
    {
      referenceNo: 'REV/001/2025',
      submissionDate: new Date('2025-09-10'),
      distilleryName: 'Sikkim Distilleries Ltd',
      status: 'REVALIDATION APPROVED BY COMMISSIONER',
      amount: 50.00,
      type: 'revalidation'
    },
    {
      referenceNo: 'CAN/001/2025',
      submissionDate: new Date('2025-09-08'),
      distilleryName: 'Mount Distilleries Ltd',
      status: 'CANCELLATION PENDING APPROVAL',
      amount: 25.00,
      type: 'cancellation'
    },
    {
      referenceNo: 'TRP/001/2025',
      submissionDate: new Date('2025-09-20'),
      distilleryName: 'Sikkim Distilleries Ltd',
      status: 'TRANSIT PERMIT APPROVED',
      amount: 75.00,
      type: 'transit'
    }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Component initialization
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  getFilteredData(): PermitData[] {
    let filtered = this.allPermits.filter(permit => permit.type === this.activeTab);

    // Apply filters
    if (this.selectedDate) {
      filtered = filtered.filter(permit => {
        const permitDate = permit.submissionDate.toISOString().split('T')[0];
        return permitDate === this.selectedDate;
      });
    }

    if (this.selectedMonth) {
      filtered = filtered.filter(permit => {
        const permitMonth = String(permit.submissionDate.getMonth() + 1).padStart(2, '0');
        return permitMonth === this.selectedMonth;
      });
    }

    if (this.selectedYear) {
      filtered = filtered.filter(permit => {
        const permitYear = permit.submissionDate.getFullYear().toString();
        return permitYear === this.selectedYear;
      });
    }

    if (this.selectedDistillery) {
      filtered = filtered.filter(permit => {
        const distilleryMap: { [key: string]: string } = {
          'sikkim-distilleries': 'Sikkim Distilleries Ltd',
          'mount-distilleries': 'Mount Distilleries Ltd',
          'darjeeling-artisan': 'Darjeeling Artisan Pvt Ltd'
        };
        const distilleryName = distilleryMap[this.selectedDistillery];
        return permit.distilleryName === distilleryName;
      });
    }

    if (this.selectedStatus) {
      filtered = filtered.filter(permit => 
        permit.status.toLowerCase().includes(this.selectedStatus.toLowerCase())
      );
    }

    return filtered;
  }

  onSearch(): void {
    // Search functionality is handled by getFilteredData()
    console.log('Searching with:', this.searchName);
  }

  onClear(): void {
    this.searchName = '';
    this.selectedDate = '';
    this.selectedMonth = '';
    this.selectedYear = '';
    this.selectedDistillery = '';
    this.selectedStatus = '';
  }

  viewPermitSlip(permit: PermitData): void {
    console.log('Viewing permit slip for:', permit.referenceNo);
    alert(`Viewing permit slip for ${permit.referenceNo}`);
  }

  printApproval(permit: PermitData): void {
    console.log('Printing approval for:', permit.referenceNo);
    alert(`Printing approval for ${permit.referenceNo}`);
  }

  viewApplication(permit: PermitData): void {
    console.log('Viewing application:', permit.referenceNo);
    // Navigate based on permit type
    switch (permit.type) {
      case 'requisition':
        this.router.navigate(['/dev-import-permit'], { 
          queryParams: { ref: permit.referenceNo } 
        });
        break;
      case 'transit':
        this.router.navigate(['/dev-transit-permit'], { 
          queryParams: { ref: permit.referenceNo } 
        });
        break;
      default:
        this.router.navigate(['/dev-supply-chain']);
    }
  }

  viewPaymentSlip(permit: PermitData): void {
    console.log('Viewing payment slip for:', permit.referenceNo);
    this.router.navigate(['/dev-payment-receipt'], { 
      queryParams: { 
        transactionId: permit.referenceNo,
        type: permit.type 
      } 
    });
  }

  canViewPaymentSlip(permit: PermitData): boolean {
    // Show payment slip button for permits with amount > 0
    return permit.amount > 0;
  }

  // Navigation methods
  navigateToImportPermit(): void {
    this.router.navigate(['/dev-import-permit']);
  }

  navigateToTransitPermit(): void {
    this.router.navigate(['/dev-transit-permit']);
  }

  navigateToSupplyChain(): void {
    this.router.navigate(['/dev-supply-chain']);
  }

  navigateToPaymentConfirmation(): void {
    this.router.navigate(['/dev-payment-confirmation']);
  }

  navigateToPaymentReceipt(): void {
    this.router.navigate(['/dev-payment-receipt']);
  }

  getActiveTabTitle(): string {
    const titles: { [key: string]: string } = {
      'requisition': 'Requisition',
      'revalidation': 'Revalidation',
      'cancellation': 'Cancellation',
      'transit': 'Transit'
    };
    return titles[this.activeTab] || 'Permit';
  }
}