import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface HologramFormData {
  refNo: string;
  date: string;
  companyName: string;
  localQtyLakh: number | null;
  exportQtyLakh: number | null;
  defenceQtyLakh: number | null;
  status: 'Draft' | 'Submitted' | 'Forwarded to IT Cell' | 'Under Review' | 'Forwarded to Commissioner' | 'Approved by Commissioner - Ready for Payment' | 'Payment Completed' | 'Approved' | 'Rejected';
  submittedDate?: string;
  reviewedBy?: string;
  reviewedDate?: string;
  remarks?: string;
  editedByCommissioner?: boolean;
  editHistory?: {
    editedBy: string;
    editedDate: string;
    originalQuantities: {
      local: number;
      export: number;
      defence: number;
      total: number;
    };
    updatedQuantities: {
      local: number;
      export: number;
      defence: number;
      total: number;
    };
  };
}



@Component({
  selector: 'app-itcell',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './itcell.component.html',
  styleUrl: './itcell.component.scss'
})
export class ITCELLComponent implements OnInit {
  selectedTabIndex = 0;
  
  // Hologram Management
  hologramData: HologramFormData[] = [];
  filteredHologramData: HologramFormData[] = [];
  displayedColumns: string[] = ['refNo', 'date', 'companyName', 'localQtyLakh', 'exportQtyLakh', 'defenceQtyLakh', 'status', 'actions'];
  
  // Modal state
  showHologramModal = false;
  selectedHologram: HologramFormData | null = null;
  
  // Filters
  selectedMonth: string = '';
  selectedYear: string = '';
  selectedDate: string = '';
  statusFilter: string = '';
  companyFilter: string = '';
  

  
  // Available options
  months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];
  
  years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  statusOptions = ['All', 'Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected'];

  
  private isBrowser = false;

  constructor(@Inject(PLATFORM_ID) platformId: Object, private router: Router) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.loadHologramData();
    this.applyFilters();
  }

  private loadHologramData(): void {
    if (!this.isBrowser) {
      this.hologramData = [];
      return;
    }
    
    const stored = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    this.hologramData = stored.map((item: any) => {
      // Determine the display status based on approval stages
      let displayStatus = item.status || 'Submitted';
      
      // Check conditions in priority order (most specific first)
      
      // 1. If payment completed, show "Payment Completed"
      if (item.paymentCompleted === true) {
        displayStatus = 'Payment Completed';
      }
      // 2. If Commissioner approved (and payment not completed), show "Approved by Commissioner"
      else if (item.commissionerStatus === 'Approved' && item.paymentCompleted !== true) {
        displayStatus = 'Approved by Commissioner - Ready for Payment';
      }
      // 3. If IT Cell forwarded to Commissioner and Commissioner pending, show "Forwarded to Commissioner"
      else if (item.itCellStatus === 'Forwarded' && item.commissionerStatus === 'Pending') {
        displayStatus = 'Forwarded to Commissioner';
      }
      // 4. If status is already set to Forwarded to Commissioner
      else if (item.status === 'Forwarded to Commissioner') {
        displayStatus = 'Forwarded to Commissioner';
      }
      
      return {
        ...item,
        status: displayStatus,
        submittedDate: item.submittedDate || item.date,
        reviewedBy: item.reviewedBy || '',
        reviewedDate: item.reviewedDate || '',
        remarks: item.remarks || ''
      };
    });

    // Add sample data if none exists
    if (this.hologramData.length === 0) {
      this.hologramData = [
        {
          refNo: 'YB/1/BREW/24',
          date: '2024-01-15',
          companyName: 'Yuksom Breweries Ltd.',
          localQtyLakh: 15,
          exportQtyLakh: 0,
          defenceQtyLakh: 0,
          status: 'Under Review',
          submittedDate: '2024-01-15',
          reviewedBy: 'IT Cell',
          reviewedDate: '2024-01-16',
          remarks: 'File forwarded for processing'
        },
        {
          refNo: 'YB/2/BREW/24',
          date: '2024-01-20',
          companyName: 'Yuksom Breweries Ltd.',
          localQtyLakh: 10,
          exportQtyLakh: 2,
          defenceQtyLakh: 0,
          status: 'Approved',
          submittedDate: '2024-01-20',
          reviewedBy: 'Commissioner',
          reviewedDate: '2024-01-22',
          remarks: 'Approved and processed'
        },
        {
          refNo: 'YB/3/BREW/24',
          date: '2024-02-01',
          companyName: 'Yuksom Breweries Ltd.',
          localQtyLakh: 20,
          exportQtyLakh: 0,
          defenceQtyLakh: 1,
          status: 'Draft',
          submittedDate: '2024-02-01',
          reviewedBy: '',
          reviewedDate: '',
          remarks: ''
        }
      ];
    }
  }



  applyFilters(): void {
    let filtered = [...this.hologramData];

    if (this.selectedMonth) {
      filtered = filtered.filter(item => {
        const itemMonth = new Date(item.date).getMonth() + 1;
        return itemMonth.toString().padStart(2, '0') === this.selectedMonth;
      });
    }

    if (this.selectedYear) {
      filtered = filtered.filter(item => {
        const itemYear = new Date(item.date).getFullYear();
        return itemYear.toString() === this.selectedYear;
      });
    }

    if (this.selectedDate) {
      filtered = filtered.filter(item => item.date === this.selectedDate);
    }

    if (this.statusFilter && this.statusFilter !== 'All') {
      filtered = filtered.filter(item => item.status === this.statusFilter);
    }

    if (this.companyFilter) {
      filtered = filtered.filter(item => 
        item.companyName.toLowerCase().includes(this.companyFilter.toLowerCase())
      );
    }

    this.filteredHologramData = filtered;
  }

  clearFilters(): void {
    this.selectedMonth = '';
    this.selectedYear = '';
    this.selectedDate = '';
    this.statusFilter = '';
    this.companyFilter = '';
    this.applyFilters();
  }



  private updateHologramInStorage(hologram: HologramFormData): void {
    if (!this.isBrowser) return;
    
    // Update the hologram in the array
    const index = this.hologramData.findIndex(h => h.refNo === hologram.refNo);
    if (index !== -1) {
      this.hologramData[index] = hologram;
      localStorage.setItem('hologramRequests', JSON.stringify(this.hologramData));
    }
  }



  updateHologramStatus(hologram: HologramFormData, status: string): void {
    hologram.status = status as any;
    hologram.reviewedBy = 'IT Cell';
    hologram.reviewedDate = new Date().toISOString().split('T')[0];
    
    if (status === 'Under Review') {
      hologram.remarks = 'File forwarded for processing';
    } else if (status === 'Approved') {
      hologram.remarks = 'Approved and processed';
    }

    if (this.isBrowser) {
      localStorage.setItem('hologramRequests', JSON.stringify(this.hologramData));
    }
    
    this.applyFilters();
  }

  getTotalHolograms(hologram: HologramFormData): number {
    return (hologram.localQtyLakh || 0) + (hologram.exportQtyLakh || 0) + (hologram.defenceQtyLakh || 0);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Draft': return 'warn';
      case 'Submitted': return 'primary';
      case 'Under Review': return 'accent';
      case 'Approved': return 'primary';
      case 'Rejected': return 'warn';
      default: return 'primary';
    }
  }

  getStatusClass(status: string): string {
    if (status === 'Payment Completed' || status === 'Approved') {
      return 'bg-success-subtle text-success';
    } else if (status === 'Forwarded to Commissioner' || status === 'Approved by Commissioner - Ready for Payment') {
      return 'bg-info-subtle text-info';
    } else if (status === 'Under Review') {
      return 'bg-warning-subtle text-warning';
    } else if (status === 'Draft') {
      return 'bg-secondary-subtle text-secondary';
    } else {
      return 'bg-primary-subtle text-primary';
    }
  }

  getStatusCount(status: string): number {
    return this.filteredHologramData.filter(h => h.status === status).length;
  }

  getTotalQuantity(): number {
    return this.filteredHologramData.reduce((sum, h) => sum + this.getTotalHolograms(h), 0);
  }

  viewHologramDetails(hologram: HologramFormData): void {
    this.selectedHologram = hologram;
    this.showHologramModal = true;
  }

  closeHologramDetails(): void {
    this.showHologramModal = false;
    this.selectedHologram = null;
  }



  viewApplication(hologram: HologramFormData): void {
    // Navigate to unified supply chain hologram view page with IT Cell context
    const applicationUrl = `/dev-supply-chain-hologram-view?ref=${encodeURIComponent(hologram.refNo)}&from=itcell`;
    
    // Open in new tab/window
    window.open(applicationUrl, '_blank');
    
    console.log('Viewing application for:', hologram.refNo);
  }

  forwardToCommissioner(hologram: HologramFormData): void {
    // IT Cell forwards directly to Commissioner - no upload slip needed
    hologram.status = 'Forwarded to Commissioner';
    hologram.reviewedBy = 'IT Cell';
    hologram.reviewedDate = new Date().toISOString().split('T')[0];
    hologram.remarks = 'Verified by IT Cell and forwarded to Commissioner for approval.';
    
    // Update in storage
    if (this.isBrowser) {
      // Update hologramRequests
      const stored = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
      const index = stored.findIndex((h: any) => h.refNo === hologram.refNo);
      if (index !== -1) {
        stored[index] = {
          ...stored[index],
          ...hologram,
          itCellStatus: 'Forwarded',
          uploadSlipEnabled: false, // No upload slip needed in new flow
          commissionerStatus: 'Pending', // Set Commissioner status to Pending
          status: 'Forwarded to Commissioner'
        };
        localStorage.setItem('hologramRequests', JSON.stringify(stored));
      }

      // Also update hologramApplications (used by supply chain dashboard)
      const applications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
      // Update all rows with the same refNo
      applications.forEach((app: any) => {
        if (app.refNo === hologram.refNo) {
          app.status = 'Forwarded to Commissioner';
          app.itCellStatus = 'Forwarded';
          app.uploadSlipEnabled = false; // No upload slip in new flow
          app.commissionerStatus = 'Pending'; // Set Commissioner status to Pending
        }
      });
      localStorage.setItem('hologramApplications', JSON.stringify(applications));
    }
    
    // Reload data to ensure UI updates
    this.loadHologramData();
    this.applyFilters();
    
    alert('Application forwarded to Commissioner for approval. After Commissioner approval, supply chain user can proceed with payment.');
  }

  // Payment calculation methods
  calculateWalletPayment(hologram: HologramFormData): number {
    // Wallet payment: ₹0.15 per hologram (only payment required)
    const total = (hologram.localQtyLakh || 0) + (hologram.exportQtyLakh || 0) + (hologram.defenceQtyLakh || 0);
    return total * 0.15;
  }

  // Check if payment slip has been uploaded
  isSlipUploaded(hologram: HologramFormData): boolean {
    if (!this.isBrowser) return false;
    
    const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    const request = hologramRequests.find((req: any) => req.refNo === hologram.refNo);
    
    return request?.paymentSlipUploaded === true;
  }

  // Check if payment is completed (ALL types with same ref must be paid)
  isPaymentCompleted(hologram: HologramFormData): boolean {
    if (!this.isBrowser) return false;
    
    // Check if ALL applications with the same reference number have payment completed
    const applications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
    const sameRefApplications = applications.filter((app: any) => app.refNo === hologram.refNo);
    
    if (sameRefApplications.length === 0) return false;
    
    // All applications with this ref must have paymentCompleted = true
    return sameRefApplications.every((app: any) => app.paymentCompleted === true);
  }

  // View payment slip
  viewPaymentSlip(hologram: HologramFormData): void {
    this.router.navigate(['/dev-payslip'], {
      queryParams: {
        ref: hologram.refNo,
        type: 'HOLOGRAM'
      }
    });
  }
}
