import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface HologramRow {
  refNo: string;
  date: string;
  companyName: string;
  localQtyLakh?: number;
  exportQtyLakh?: number;
  defenceQtyLakh?: number;
  procurementType?: 'Local' | 'Export' | 'Defence';
  status: string;
  paymentCompleted?: boolean;
  editedByCommissioner?: boolean;
  editHistory?: any;
}

@Component({
  selector: 'app-hologramprocurement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hologramprocurement.component.html',
  styleUrl: './hologramprocurement.component.scss'
})
export class HologramprocurementComponent implements OnInit {
  Math = Math;
  hologramList: HologramRow[] = [];
  filteredHologramData: HologramRow[] = [];
  private isBrowser = false;
  showHologramModal = false;
  selectedHologram: HologramRow | null = null;
  
  // Filter properties
  hologramDateFilter: string = '';
  hologramMonthFilter: string = '';
  hologramYearFilter: string = '';
  hologramStatusFilter: string = '';

  // Pagination
  pageSizeOptions: number[] = [5, 10, 15];
  pageSize: number = 5;
  currentPage: number = 1;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.refreshHologramList();
  }

  ngOnInit(): void {
    this.filteredHologramData = [...this.hologramList];

    if (this.isBrowser) {
      // Add visibility change listener
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          console.log('🔄 Tab became visible, refreshing hologram data...');
          this.refreshHologramList();
        }
      });

      // Add storage event listener
      window.addEventListener('storage', (event) => {
        if (event.key === 'hologramRequests' || event.key === 'hologramApplications') {
          console.log('🔄 Storage changed, refreshing hologram data...');
          this.refreshHologramList();
        }
      });
    }
  }

  private refreshHologramList(): void {
    if (!this.isBrowser) {
      this.hologramList = [];
      return;
    }

    const storedApplications = JSON.parse(localStorage.getItem("hologramApplications") || "[]");
    const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    
    console.log('📦 Loading hologram data from hologramApplications:', storedApplications.length, 'items');

    let mapped: HologramRow[] = (storedApplications || []).map((a: any) => {
      const request = hologramRequests.find((req: any) => req.refNo === a.refNo);
      
      let displayStatus = request?.status || a.status || "Submitted";
      
      if (request?.paymentCompleted === true || a.paymentCompleted === true) {
        displayStatus = "Payment Completed";
      }
      
      return {
        refNo: a.refNo,
        date: a.date,
        companyName: a.companyName,
        localQtyLakh: a.localQtyLakh,
        exportQtyLakh: a.exportQtyLakh,
        defenceQtyLakh: a.defenceQtyLakh,
        procurementType: a.procurementType,
        status: displayStatus,
        paymentCompleted: a.paymentCompleted || request?.paymentCompleted || false,
        editedByCommissioner: a.editedByCommissioner || request?.editedByCommissioner || false,
        editHistory: a.editHistory || request?.editHistory || null,
      };
    });

    // Sort by date (newest first)
    if (mapped.length > 0) {
      mapped = mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    // Ensure all items have procurementType
    mapped = mapped.map(item => {
      if (!item.procurementType) {
        if (item.exportQtyLakh && item.exportQtyLakh > 0) {
          item.procurementType = 'Export';
        } else if (item.defenceQtyLakh && item.defenceQtyLakh > 0) {
          item.procurementType = 'Defence';
        } else {
          item.procurementType = 'Local';
        }
      }
      return item;
    });

    this.hologramList = mapped;
    this.filteredHologramData = [...this.hologramList];
  }

  // Filter methods
  applyHologramFilters(): void {
    this.filteredHologramData = this.hologramList.filter(item => {
      let matchesDate = true;
      let matchesMonth = true;
      let matchesYear = true;
      let matchesStatus = true;

      const itemDate = new Date(item.date);

      if (this.hologramDateFilter) {
        const filterDate = new Date(this.hologramDateFilter);
        matchesDate = itemDate.getFullYear() === filterDate.getFullYear() &&
          itemDate.getMonth() === filterDate.getMonth() &&
          itemDate.getDate() === filterDate.getDate();
      }

      if (this.hologramMonthFilter) {
        const filterDate = new Date(this.hologramMonthFilter + '-01');
        matchesMonth = itemDate.getFullYear() === filterDate.getFullYear() &&
          itemDate.getMonth() === filterDate.getMonth();
      }

      if (this.hologramYearFilter) {
        const filterYear = parseInt(this.hologramYearFilter);
        matchesYear = itemDate.getFullYear() === filterYear;
      }

      if (this.hologramStatusFilter) {
        matchesStatus = item.status.toUpperCase() === this.hologramStatusFilter.toUpperCase();
      }

      return matchesDate && matchesMonth && matchesYear && matchesStatus;
    });

    this.currentPage = 1;
  }

  clearHologramFilters(): void {
    this.hologramDateFilter = '';
    this.hologramMonthFilter = '';
    this.hologramYearFilter = '';
    this.hologramStatusFilter = '';
    this.filteredHologramData = [...this.hologramList];
    this.currentPage = 1;
  }

  onHologramDateFilterChange(): void {
    this.applyHologramFilters();
  }

  onHologramMonthFilterChange(): void {
    this.applyHologramFilters();
  }

  onHologramYearFilterChange(): void {
    this.applyHologramFilters();
  }

  onHologramStatusFilterChange(): void {
    this.applyHologramFilters();
  }

  // Summary methods
  getHologramStatusCount(status: string): number {
    return this.hologramList.filter(item =>
      item.status.toLowerCase().includes(status.toLowerCase())
    ).length;
  }

  getTotalHologramQuantity(): number {
    return this.hologramList.reduce((total, item) => 
      total + this.getHologramTotal(item), 0
    );
  }

  getHologramTotal(row: HologramRow): number {
    return (
      (row.localQtyLakh || 0) +
      (row.exportQtyLakh || 0) +
      (row.defenceQtyLakh || 0)
    );
  }

  getProcurementType(row: HologramRow): 'Local' | 'Export' | 'Defence' {
    if (row.procurementType) {
      return row.procurementType;
    }
    
    if (row.exportQtyLakh && row.exportQtyLakh > 0) {
      return 'Export';
    } else if (row.defenceQtyLakh && row.defenceQtyLakh > 0) {
      return 'Defence';
    } else {
      return 'Local';
    }
  }

  // Pagination methods
  getTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredHologramData.length / this.pageSize));
  }

  getPaged(data: HologramRow[]): HologramRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return data.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    const total = this.getTotalPages();
    if (page < 1 || page > total) return;
    this.currentPage = page;
  }

  updatePagination(): void {
    this.currentPage = 1;
  }

  // Modal methods
  openHologramDetails(row: HologramRow): void {
    this.selectedHologram = row;
    this.showHologramModal = true;
  }

  closeHologramDetails(): void {
    this.showHologramModal = false;
    this.selectedHologram = null;
  }

  getTotalHolograms(hologram: HologramRow): number {
    return this.getHologramTotal(hologram);
  }

  // Navigation methods
  viewHologramApplication(item: HologramRow): void {
    this.router.navigate(["/dev-supply-chain-hologram-view"], {
      queryParams: { 
        ref: item.refNo,
        type: item.procurementType || this.getProcurementType(item)
      },
    });
  }

  navigateTo(route: string){
        this.router.navigate(["/dev-hologram"]);  
    }
  navigateToPaymentPage(hologram: HologramRow): void {
    if (!this.isBrowser) return;

    const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    const request = hologramRequests.find((req: any) => req.refNo === hologram.refNo);
    
    if (!request || request.commissionerStatus !== 'Approved') {
      alert('Payment is pending Commissioner approval. Please wait for Commissioner to approve your application.');
      return;
    }

    if (request.paymentCompleted === true) {
      alert('Payment has already been completed for this reference number.');
      return;
    }

    const sameRefItems = this.hologramList.filter(item => item.refNo === hologram.refNo);
    
    if (sameRefItems.length > 1) {
      const allApproved = sameRefItems.every(item => {
        const req = hologramRequests.find((r: any) => r.refNo === item.refNo);
        return req && req.commissionerStatus === 'Approved';
      });

      if (!allApproved) {
        const notReadyTypes = sameRefItems.filter(item => {
          const req = hologramRequests.find((r: any) => r.refNo === item.refNo);
          return !req || req.commissionerStatus !== 'Approved';
        }).map(item => this.getProcurementType(item));

        alert(
          `Multiple types exist for reference number ${hologram.refNo}.\n\n` +
          `The following types are not yet ready for payment:\n${notReadyTypes.join(', ')}\n\n` +
          `All types must be approved by Commissioner before making payment.`
        );
        return;
      }
    }

    this.proceedToPayment(hologram.refNo);
  }

  private proceedToPayment(refNo: string): void {
    if (!this.isBrowser) return;

    const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    const updatedRequests = hologramRequests.map((req: any) => {
      if (req.refNo === refNo) {
        return { ...req, paymentPageVisited: true };
      }
      return req;
    });
    localStorage.setItem('hologramRequests', JSON.stringify(updatedRequests));

    this.router.navigate(['/dev-payment-confirmation'], {
      queryParams: { 
        tab: 'hologram',
        refNo: refNo,
        action: 'makePayment'
      }
    });
  }

  viewPaymentSlip(item: HologramRow): void {
    this.router.navigate(['/dev-payslip'], {
      queryParams: {
        ref: item.refNo,
        type: 'HOLOGRAM'
      }
    });
  }

  // Payment methods
  isPaymentEnabled(item: HologramRow): boolean {
    if (!this.isBrowser) {
      return false;
    }

    const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    const request = hologramRequests.find((req: any) => req.refNo === item.refNo);

    if (!request) {
      return false;
    }

    const commissionerApproved = request.commissionerStatus === 'Approved';
    return commissionerApproved;
  }

  calculatePaymentAmount(hologram: HologramRow): number {
    const totalQty = this.getHologramTotal(hologram);
    return totalQty * 0.15;
  }

  getPaymentStatusClass(item: HologramRow): string {
    const status = item.status?.toLowerCase() || '';
    
    if (status.includes('payment completed') || item.paymentCompleted) {
      return 'bg-success-subtle text-success';
    } else if (status.includes('approved')) {
      return 'bg-primary-subtle text-primary';
    } else if (status.includes('pending')) {
      return 'bg-warning-subtle text-warning';
    } else if (status.includes('rejected')) {
      return 'bg-danger-subtle text-danger';
    } else {
      return 'bg-secondary-subtle text-secondary';
    }
  }

  markPaymentCompleted(refNo: string): void {
    if (!this.isBrowser) return;

    const applications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
    const sameRefApplications = applications.filter((app: any) => app.refNo === refNo);
    
    const allPaid = sameRefApplications.every((app: any) => app.paymentCompleted === true);
    
    if (!allPaid) {
      const updatedApplications = applications.map((app: any) => {
        if (app.refNo === refNo && app.procurementType === this.getProcurementType(this.hologramList.find(h => h.refNo === refNo)!)) {
          return {
            ...app,
            paymentCompleted: true,
            paymentDate: new Date().toISOString()
          };
        }
        return app;
      });
      localStorage.setItem('hologramApplications', JSON.stringify(updatedApplications));
      
      const updatedSameRefApps = updatedApplications.filter((app: any) => app.refNo === refNo);
      const nowAllPaid = updatedSameRefApps.every((app: any) => app.paymentCompleted === true);
      
      if (nowAllPaid) {
        this.updateAllPaymentsCompleted(refNo);
      } else {
        alert(`Payment marked for this type. ${updatedSameRefApps.filter((a: any) => !a.paymentCompleted).length} more payment(s) pending for ${refNo}.`);
      }
    } else {
      alert(`All payments already completed for ${refNo}.`);
    }

    this.refreshHologramList();
  }

  private updateAllPaymentsCompleted(refNo: string): void {
    if (!this.isBrowser) return;

    const hologramRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    const updatedRequests = hologramRequests.map((req: any) => {
      if (req.refNo === refNo) {
        return {
          ...req,
          paymentCompleted: true,
          status: 'Payment Completed',
          paymentDate: new Date().toISOString()
        };
      }
      return req;
    });
    localStorage.setItem('hologramRequests', JSON.stringify(updatedRequests));

    const applications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
    const updatedApplications = applications.map((app: any) => {
      if (app.refNo === refNo) {
        return {
          ...app,
          paymentCompleted: true,
          status: 'Payment Completed',
          paymentDate: new Date().toISOString()
        };
      }
      return app;
    });
    localStorage.setItem('hologramApplications', JSON.stringify(updatedApplications));

    alert(`All payments completed for ${refNo}. Status updated to "Payment Completed" in all dashboards.`);
  }

  // Clear data methods (for testing)
  clearPaymentSlipData(): void {
    if (!this.isBrowser) return;
    
    const confirmed = window.confirm('This will clear all uploaded payment slips. Are you sure?');
    if (!confirmed) return;

    localStorage.removeItem('hologramPayments');
    
    const applications = JSON.parse(localStorage.getItem('hologramApplications') || '[]');
    const updatedApplications = applications.map((app: any) => {
      const { paymentSlipUploaded, ...rest } = app;
      return rest;
    });
    localStorage.setItem('hologramApplications', JSON.stringify(updatedApplications));
    
    this.refreshHologramList();
    
    alert('Payment slip data cleared successfully!');
  }

  clearHologramData(): void {
    if (!this.isBrowser) return;
    
    const confirmed = window.confirm('This will clear ALL hologram data including applications, payments, and transactions. Are you sure?');
    if (!confirmed) return;

    localStorage.removeItem('hologramApplications');
    localStorage.removeItem('hologramPayments');
    localStorage.removeItem('hologramPaymentTransactions');
    localStorage.removeItem('hologramRequests');
    
    this.refreshHologramList();
    
    alert('All hologram data cleared successfully!');
  }
}
