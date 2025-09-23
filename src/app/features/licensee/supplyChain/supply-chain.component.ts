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
  selectedDate = '';
  selectedMonth = '';
  selectedYear = '';
  selectedDistillery = '';
  selectedStatus = '';
  activeTab = 'requisition';
  
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

  constructor(private router: Router) {}

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
}