import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
interface TableData {
  referenceNo: string;
  submissionDate: string;
  distilleryName: string;
  status: string;
  amount: string;
}
@Component({
  selector: 'app-supply-chain',
  standalone: true,
   imports: [CommonModule, FormsModule],
  templateUrl: './supply-chain.component.html',
  styleUrls: ['./supply-chain.component.scss']
})
export class SupplyChainComponent implements OnInit {
  selectedDate: string = '';
  activeTab: string = 'requisition';
  
  tableData: TableData[] = [
    {
      referenceNo: 'BF502/EXCISE',
      submissionDate: '22-Sep-2025',
      distilleryName: 'Sikkim Distilleries Ltd',
      status: 'THE PERMIT HAS BEEN GENERATED AND WILL BE MAILED TO THE CONCERNED AUTHORITY.',
      amount: '8.00'
    }
  ];

  constructor() { }

  ngOnInit(): void {
    // Initialize component
  }

  onSearch(): void {
    console.log('Search clicked with date:', this.selectedDate);
    // Implement search functionality
  }

  onClear(): void {
    this.selectedDate = '';
    console.log('Clear clicked');
    // Implement clear functionality
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    console.log('Active tab changed to:', tab);
    // Implement tab switching logic
  }

  viewApplication(item: TableData): void {
    console.log('View application clicked for:', item.referenceNo);
    // Implement view application functionality
  }

  viewSlip(item: TableData): void {
    console.log('View slip clicked for:', item.referenceNo);
    // Implement view slip functionality
  }
}