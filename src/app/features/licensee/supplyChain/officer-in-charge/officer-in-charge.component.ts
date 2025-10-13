import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface TransitPermitRecord {
  referenceNo: string;
  submissionDate: string;
  distilleryName: string;
  paymentStatus: string;
  amount: string;
  status: string;
  applicationDetails?: any;
}

interface FilterOptions {
  referenceNumber: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

interface OfficerInfo {
  name: string;
  distilleryName: string;
  phone: string;
  email: string;
  officerId: string;
}

interface OfficerActivity {
  dateTime: string;
  action: string;
  referenceNo: string;
  amount: string;
  status: string;
  comments: string;
}

@Component({
  selector: 'app-officer-in-charge',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './officer-in-charge.component.html',
  styleUrl: './officer-in-charge.component.scss'
})
export class OfficerInChargeComponent implements OnInit {
  Math = Math;
  activeTab = 'applications';
  
  // Current officer information - in real app, this would come from authentication
  currentOfficer: OfficerInfo = {
    name: 'Rajesh Kumar',
    distilleryName: 'Sikkim Distilleries Ltd',
    phone: '+91 98765 43210',
    email: 'rajesh.kumar@sikkimdistilleries.com',
    officerId: 'OFF001'
  };

  // Sample officer activities for the register
  officerActivities: OfficerActivity[] = [
    {
      dateTime: '2024-01-15 14:30:25',
      action: 'APPROVED',
      referenceNo: 'TP003/2024',
      amount: '18000.00',
      status: 'APPROVED',
      comments: 'Application approved after document verification'
    },
    {
      dateTime: '2024-01-12 16:45:10',
      action: 'TERMINATED',
      referenceNo: 'TP004/2024',
      amount: '9500.00',
      status: 'TERMINATED',
      comments: 'Incomplete documentation provided'
    },
    {
      dateTime: '2024-01-10 11:20:15',
      action: 'APPROVED',
      referenceNo: 'TP006/2024',
      amount: '13500.00',
      status: 'APPROVED',
      comments: 'All requirements met'
    },
    {
      dateTime: '2024-01-08 09:15:30',
      action: 'TERMINATED',
      referenceNo: 'TP008/2024',
      amount: '14200.00',
      status: 'TERMINATED',
      comments: 'Payment verification failed'
    },
    {
      dateTime: '2024-01-06 13:45:20',
      action: 'APPROVED',
      referenceNo: 'TP010/2024',
      amount: '11200.00',
      status: 'APPROVED',
      comments: 'Application processed successfully'
    }
  ];
  
  // Sample data for development - only applications for current officer's distillery
  allData: TransitPermitRecord[] = [
    {
      referenceNo: 'TP001/2024',
      submissionDate: '2024-01-15',
      distilleryName: 'Sikkim Distilleries Ltd',
      paymentStatus: 'PAID',
      amount: '15000.00',
      status: 'PENDING_APPROVAL'
    },
    {
      referenceNo: 'TP002/2024',
      submissionDate: '2024-01-14',
      distilleryName: 'Sikkim Distilleries Ltd',
      paymentStatus: 'PAID',
      amount: '12000.00',
      status: 'PENDING_APPROVAL'
    },
    {
      referenceNo: 'TP003/2024',
      submissionDate: '2024-01-13',
      distilleryName: 'Sikkim Distilleries Ltd',
      paymentStatus: 'PAID',
      amount: '18000.00',
      status: 'APPROVED'
    },
    {
      referenceNo: 'TP004/2024',
      submissionDate: '2024-01-12',
      distilleryName: 'Sikkim Distilleries Ltd',
      paymentStatus: 'PAID',
      amount: '9500.00',
      status: 'TERMINATED'
    },
    {
      referenceNo: 'TP005/2024',
      submissionDate: '2024-01-11',
      distilleryName: 'Sikkim Distilleries Ltd',
      paymentStatus: 'PAID',
      amount: '22000.00',
      status: 'PENDING_APPROVAL'
    },
    {
      referenceNo: 'TP006/2024',
      submissionDate: '2024-01-10',
      distilleryName: 'Sikkim Distilleries Ltd',
      paymentStatus: 'PAID',
      amount: '13500.00',
      status: 'APPROVED'
    },
    {
      referenceNo: 'TP007/2024',
      submissionDate: '2024-01-09',
      distilleryName: 'Sikkim Distilleries Ltd',
      paymentStatus: 'PAID',
      amount: '16800.00',
      status: 'PENDING_APPROVAL'
    },
    {
      referenceNo: 'TP008/2024',
      submissionDate: '2024-01-08',
      distilleryName: 'Sikkim Distilleries Ltd',
      paymentStatus: 'PAID',
      amount: '14200.00',
      status: 'TERMINATED'
    },
    {
      referenceNo: 'TP009/2024',
      submissionDate: '2024-01-07',
      distilleryName: 'Sikkim Distilleries Ltd',
      paymentStatus: 'PAID',
      amount: '19800.00',
      status: 'PENDING_APPROVAL'
    },
    {
      referenceNo: 'TP010/2024',
      submissionDate: '2024-01-06',
      distilleryName: 'Sikkim Distilleries Ltd',
      paymentStatus: 'PAID',
      amount: '11200.00',
      status: 'APPROVED'
    }
  ];

  filteredData: TransitPermitRecord[] = [];
  paginatedData: TransitPermitRecord[] = [];
  
  filters: FilterOptions = {
    referenceNumber: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  };

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  // Modal data
  selectedRecord: TransitPermitRecord | null = null;
  approvalComments = '';
  terminationReason = '';

  ngOnInit() {
    this.filteredData = [...this.allData];
    this.updatePagination();
  }

  getCurrentDateTime(): string {
    return new Date().toLocaleString();
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  applyFilters() {
    this.filteredData = this.allData.filter(record => {
      const matchesReference = !this.filters.referenceNumber || 
        record.referenceNo.toLowerCase().includes(this.filters.referenceNumber.toLowerCase());
      
      const matchesStatus = !this.filters.status || 
        record.status === this.filters.status;
      
      const matchesDateFrom = !this.filters.dateFrom || 
        new Date(record.submissionDate) >= new Date(this.filters.dateFrom);
      
      const matchesDateTo = !this.filters.dateTo || 
        new Date(record.submissionDate) <= new Date(this.filters.dateTo);

      return matchesReference && matchesStatus && 
             matchesDateFrom && matchesDateTo;
    });
    
    this.currentPage = 1;
    this.updatePagination();
  }

  clearFilters() {
    this.filters = {
      referenceNumber: '',
      status: '',
      dateFrom: '',
      dateTo: ''
    };
    this.filteredData = [...this.allData];
    this.currentPage = 1;
    this.updatePagination();
  }

  exportData() {
    // In a real application, this would export the filtered data
    console.log('Exporting data:', this.filteredData);
    alert('Export functionality will be implemented with backend integration');
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredData.length / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedData = this.filteredData.slice(startIndex, endIndex);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  getPaymentStatusClass(status: string): string {
    switch (status) {
      case 'PAID': return 'bg-success';
      case 'PENDING': return 'bg-warning';
      case 'FAILED': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  getPaymentStatusIcon(status: string): string {
    switch (status) {
      case 'PAID': return 'bi bi-check-circle';
      case 'PENDING': return 'bi bi-clock';
      case 'FAILED': return 'bi bi-x-circle';
      default: return 'bi bi-question-circle';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING_APPROVAL': return 'bg-warning text-dark';
      case 'APPROVED': return 'bg-success';
      case 'TERMINATED': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'PENDING_APPROVAL': return 'bi bi-clock';
      case 'APPROVED': return 'bi bi-check-circle';
      case 'TERMINATED': return 'bi bi-x-circle';
      default: return 'bi bi-question-circle';
    }
  }

  getActivityClass(action: string): string {
    switch (action) {
      case 'APPROVED': return 'bg-success';
      case 'TERMINATED': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  getActivityIcon(action: string): string {
    switch (action) {
      case 'APPROVED': return 'bi bi-check-circle';
      case 'TERMINATED': return 'bi bi-x-circle';
      default: return 'bi bi-question-circle';
    }
  }

  viewDetails(record: TransitPermitRecord) {
    console.log('Viewing details for:', record);
    alert(`Viewing details for ${record.referenceNo}. This will open a detailed view modal.`);
  }

  approveApplication(record: TransitPermitRecord) {
    this.selectedRecord = record;
    this.approvalComments = '';
    // In a real application, you would open the modal here
    // For now, we'll show an alert
    const comments = prompt('Enter approval comments (optional):');
    if (comments !== null) {
      this.approvalComments = comments;
      this.confirmApproval();
    }
  }

  terminateApplication(record: TransitPermitRecord) {
    this.selectedRecord = record;
    this.terminationReason = '';
    // In a real application, you would open the modal here
    // For now, we'll show an alert
    const reason = prompt('Enter termination reason (required):');
    if (reason && reason.trim()) {
      this.terminationReason = reason;
      this.confirmTermination();
    }
  }

  confirmApproval() {
    if (this.selectedRecord) {
      // Update the record status
      const recordIndex = this.allData.findIndex(r => r.referenceNo === this.selectedRecord!.referenceNo);
      if (recordIndex !== -1) {
        this.allData[recordIndex].status = 'APPROVED';
        this.applyFilters();
      }
      
      // Add activity to register
      const newActivity: OfficerActivity = {
        dateTime: new Date().toLocaleString(),
        action: 'APPROVED',
        referenceNo: this.selectedRecord.referenceNo,
        amount: this.selectedRecord.amount,
        status: 'APPROVED',
        comments: this.approvalComments || 'Application approved'
      };
      this.officerActivities.unshift(newActivity);
      
      console.log('Application approved:', this.selectedRecord.referenceNo);
      console.log('Comments:', this.approvalComments);
      alert(`Application ${this.selectedRecord.referenceNo} has been approved!`);
      
      this.selectedRecord = null;
      this.approvalComments = '';
    }
  }

  confirmTermination() {
    if (this.selectedRecord && this.terminationReason.trim()) {
      // Update the record status
      const recordIndex = this.allData.findIndex(r => r.referenceNo === this.selectedRecord!.referenceNo);
      if (recordIndex !== -1) {
        this.allData[recordIndex].status = 'TERMINATED';
        this.applyFilters();
      }
      
      // Add activity to register
      const newActivity: OfficerActivity = {
        dateTime: new Date().toLocaleString(),
        action: 'TERMINATED',
        referenceNo: this.selectedRecord.referenceNo,
        amount: this.selectedRecord.amount,
        status: 'TERMINATED',
        comments: this.terminationReason
      };
      this.officerActivities.unshift(newActivity);
      
      console.log('Application terminated:', this.selectedRecord.referenceNo);
      console.log('Reason:', this.terminationReason);
      console.log('Amount to be refunded:', this.selectedRecord.amount);
      alert(`Application ${this.selectedRecord.referenceNo} has been terminated. Amount ₹${this.selectedRecord.amount} will be credited to distillery wallet.`);
      
      this.selectedRecord = null;
      this.terminationReason = '';
    }
  }
}
