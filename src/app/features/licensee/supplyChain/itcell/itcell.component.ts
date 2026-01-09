import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HologramDataService } from '../services/hologram-data.service';

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
  hologramData: any[] = [];
  filteredHologramData: any[] = [];

  // Modal state
  showHologramModal = false;
  selectedHologram: any | null = null;

  // Filters
  selectedMonth: string = '';
  selectedYear: string = '';
  selectedDate: string = '';
  statusFilter: string = '';
  companyFilter: string = '';

  // Available options
  months = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' },
    { value: '03', label: 'March' }, { value: '04', label: 'April' },
    { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' },
    { value: '09', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' }
  ];

  years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  statusOptions = ['All', 'Submitted', 'Under IT Cell Review', 'Forwarded to Commissioner', 'Approved'];

  private isBrowser = false;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private router: Router,
    private hologramService: HologramDataService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.loadHologramData();
  }

  private loadHologramData(): void {
    this.hologramService.getProcurements().subscribe({
      next: (data) => {
        this.hologramData = data.map((item: any) => ({
          ...item,
          // Map API fields to UI expected fields
          refNo: item.refNo,
          date: item.date,
          companyName: item.licenseeName || item.manufacturingUnit,
          localQtyLakh: Number(item.localQty),
          exportQtyLakh: Number(item.exportQty),
          defenceQtyLakh: Number(item.defenceQty),
          status: item.status, // Uses status name from backend
          allowedActions: item.allowedActions || []
        }));
        this.applyFilters();
      },
      error: (err) => {
        console.error('Error loading holograms:', err);
      }
    });
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
      filtered = filtered.filter(item => item.date.startsWith(this.selectedDate));
    }

    if (this.statusFilter && this.statusFilter !== 'All') {
      filtered = filtered.filter(item => item.status === this.statusFilter);
    }

    if (this.companyFilter) {
      filtered = filtered.filter(item =>
        (item.companyName || '').toLowerCase().includes(this.companyFilter.toLowerCase())
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

  processProcurementAction(hologram: any): void {
    let action = '';
    let confirmationMsg = '';
    let successMsg = '';

    if (hologram.status === 'Submitted') {
      action = 'verify';
      
      confirmationMsg = 'Are you sure you want to VERIFY this application? It will move to "Under IT Cell Review".';
      successMsg = 'Application verified successfully.';
    } else if (hologram.status === 'Under IT Cell Review') {
      action = 'forward';
      confirmationMsg = 'Are you sure you want to FORWARD this application to the Commissioner?';
      successMsg = 'Application forwarded to Commissioner successfully.';
    } else {
      console.warn('Unknown status for action:', hologram.status);
      return;
    }

    if (!confirm(confirmationMsg)) {
      return;
    }

    this.hologramService.performAction('procurement', hologram.id, action, `Action '${action}' performed by IT Cell`).subscribe({
      next: (res) => {
        alert(successMsg);
        this.loadHologramData();
      },
      error: (err) => {
        console.error(`Error performing ${action}:`, err);
        alert(`Failed to perform action: ${action}`);
      }
    });
  }

  getTotalHolograms(hologram: any): number {
    return (hologram.localQtyLakh || 0) + (hologram.exportQtyLakh || 0) + (hologram.defenceQtyLakh || 0);
  }

  // ... (Other helper methods if needed, mostly UI formatting)

  getStatusClass(status: string): string {
    if (status === 'Payment Completed' || status === 'Heading for Carton Assignment') {
      return 'bg-success-subtle text-success';
    } else if (status === 'Forwarded to Commissioner' || status === 'Hologram Verified') {
      return 'bg-info-subtle text-info';
    } else if (status === 'Submitted') {
      return 'bg-warning-subtle text-warning';
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

  viewHologramDetails(hologram: any): void {
    this.selectedHologram = hologram;
    this.showHologramModal = true;
  }

  closeHologramDetails(): void {
    this.showHologramModal = false;
    this.selectedHologram = null;
  }

  viewApplication(hologram: any): void {
    // Navigate to unified supply chain hologram view page
    const applicationUrl = `/dev-supply-chain-hologram-view?ref=${encodeURIComponent(hologram.refNo)}&from=itcell`;
    window.open(applicationUrl, '_blank');
  }

  isPaymentCompleted(hologram: any): boolean {
    return hologram.paymentStatus === 'Verify' || hologram.status === 'Payment Completed';
  }

  viewPaymentSlip(hologram: any): void {
    console.log('View payment slip for:', hologram.refNo);
    // TODO: Implement actual slip viewing logic (e.g., open a modal or download PDF)
    alert(`Payment slip for ${hologram.refNo} would open here.`);
  }

  calculateWalletPayment(hologram: any): number {
    if (!hologram) return 0;
    // Mock calculation or use actual amount if available
    // Assuming each hologram costs something, or just return a mock total
    // If backend provides 'amount', use that.
    return 15000; // Mock amount for now to fix error
  }

  closeModal(): void {
    this.showHologramModal = false;
    this.selectedHologram = null;
  }
}

