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
  status: 'Draft' | 'Submitted' | 'Forwarded to IT Cell' | 'Under Review' | 'Approved by IT Cell' | 'Approved by IT Cell - Awaiting Slip Upload' | 'Forwarded to Commissioner for Approval' | 'Approved by Commissioner - Ready for Payment' | 'Payment Completed' | 'Approved' | 'Rejected';
  submittedDate?: string;
  reviewedBy?: string;
  reviewedDate?: string;
  remarks?: string;

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
      // 3. If IT Cell approved and slip uploaded and Commissioner pending, show "Forwarded to Commissioner"
      else if (item.itCellStatus === 'Approved' && item.paymentSlipUploaded === true && item.commissionerStatus === 'Pending') {
        displayStatus = 'Forwarded to Commissioner for Approval';
      }
      // 4. If IT Cell approved but slip not uploaded yet (check explicitly for false or undefined)
      else if (item.itCellStatus === 'Approved' && (item.paymentSlipUploaded === false || item.paymentSlipUploaded === undefined || item.paymentSlipUploaded === null)) {
        displayStatus = 'Approved by IT Cell - Awaiting Slip Upload';
      }
      // 5. If IT Cell approved (fallback for any other IT Cell approved state)
      else if (item.itCellStatus === 'Approved') {
        displayStatus = 'Approved by IT Cell';
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

  approveByITCell(hologram: HologramFormData): void {
    // IT Cell approval - enables upload slip, then requires Commissioner approval before payment
    hologram.status = 'Approved by IT Cell';
    hologram.reviewedBy = 'IT Cell';
    hologram.reviewedDate = new Date().toISOString().split('T')[0];
    hologram.remarks = 'Verified and approved by IT Cell. Upload slip enabled for supply chain user.';
    
    // Update in storage
    if (this.isBrowser) {
      // Update hologramRequests
      const stored = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
      const index = stored.findIndex((h: any) => h.refNo === hologram.refNo);
      if (index !== -1) {
        stored[index] = {
          ...stored[index],
          ...hologram,
          itCellStatus: 'Approved',
          uploadSlipEnabled: true, // Enable upload slip after IT Cell approval
          commissionerStatus: 'Pending', // Set Commissioner status to Pending
          status: 'Approved by IT Cell'
        };
        localStorage.setItem('hologramRequests', JSON.stringify(stored));
      }

      // Also update hologramApplications (used by supply chain dashboard)
      const applications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
      // Update all rows with the same refNo
      applications.forEach((app: any) => {
        if (app.refNo === hologram.refNo) {
          app.status = 'Approved by IT Cell';
          app.itCellStatus = 'Approved';
          app.uploadSlipEnabled = true; // Enable upload slip
          app.commissionerStatus = 'Pending'; // Set Commissioner status to Pending
        }
      });
      localStorage.setItem('hologramApplications', JSON.stringify(applications));
    }
    
    // Reload data to ensure UI updates
    this.loadHologramData();
    this.applyFilters();
    
    alert('Application approved by IT Cell. Upload slip is now enabled for supply chain user. After slip upload, it will be forwarded to Commissioner for final approval.');
  }

  // Payment calculation methods
  calculatePrintingCost(hologram: HologramFormData): number {
    // Printing cost: ₹0.72 per hologram
    const total = (hologram.localQtyLakh || 0) + (hologram.exportQtyLakh || 0) + (hologram.defenceQtyLakh || 0);
    return total * 0.72;
  }

  calculateWalletPayment(hologram: HologramFormData): number {
    // Wallet payment: ₹0.15 per hologram
    const total = (hologram.localQtyLakh || 0) + (hologram.exportQtyLakh || 0) + (hologram.defenceQtyLakh || 0);
    return total * 0.15;
  }

  calculateTotalPayment(hologram: HologramFormData): number {
    // Total: ₹0.72 + ₹0.15 = ₹0.87 per hologram
    return this.calculatePrintingCost(hologram) + this.calculateWalletPayment(hologram);
  }

  // Check if payment slip has been uploaded
  isSlipUploaded(hologram: HologramFormData): boolean {
    if (!this.isBrowser) return false;
    
    const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    const request = hologramRequests.find((req: any) => req.refNo === hologram.refNo);
    
    return request?.paymentSlipUploaded === true;
  }
}
