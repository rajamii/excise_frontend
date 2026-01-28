import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterOutlet, NavigationEnd } from "@angular/router";
import { Subscription } from "rxjs";
import { filter } from "rxjs/operators";
import { RequisitionComponent } from "../supplychaincomponents/requisition/requisition.component";
import { RevalidationComponent } from "../supplychaincomponents/revalidation/revalidation.component";
import { SupplyChainService } from "../services/supplychain.service";


interface PermitData {
  referenceNo: string;
  submissionDate: Date;
  distilleryName: string;
  status: string;
  amount: number;
  type: "requisition" | "revalidation" | "cancellation" | "transit";

  allowedActions?: string[];
  id?: number;
  originalId?: number; // For mapping backend ID
  details?: any; // To store full object if needed
}

@Component({
  selector: "app-permit-section",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RequisitionComponent, RevalidationComponent],
  templateUrl: "./permit-section.component.html",
  styleUrls: ["./permit-section.component.scss"],
})
export class PermitSectionComponent implements OnInit, OnDestroy {
  activeTab = "requisition";
  searchName = "";
  // ... existing properties ...
  selectedDate = "";
  selectedMonth = "";
  selectedYear = "";
  selectedDistillery = "";
  selectedStatus = "";
  isViewingApplication = false;
  private routerSubscription?: Subscription;

  allPermits: PermitData[] = [];

  constructor(
    private router: Router,
    private supplyChainService: SupplyChainService,
  ) { }

  ngOnInit(): void {
    // ... existing router logic ...
    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.isViewingApplication =
          event.urlAfterRedirects.includes("/app-permit-section/") &&
          (event.urlAfterRedirects.includes("/requisition/") ||
            event.urlAfterRedirects.includes("/revalidation/") ||
            event.urlAfterRedirects.includes("/cancellation/") ||
            event.urlAfterRedirects.includes("/transit/")
          );
      });

    this.isViewingApplication =
      this.router.url.includes("/app-permit-section/") &&
      (this.router.url.includes("/requisition/") ||
        this.router.url.includes("/revalidation/") ||
        this.router.url.includes("/cancellation/") ||
        this.router.url.includes("/transit/"));

    this.loadCancellationData();
    this.loadCancellationData();
  }


  loadCancellationData() {
    // ... existing cancellation load logic ...
    this.supplyChainService.getCancellations().subscribe({
      next: (data) => {
        const cancellations: PermitData[] = data.map((item: any) => ({
          referenceNo: item.ourRefNo || item.our_ref_no || item.referenceNo || 'N/A',
          submissionDate: item.cancellationDate ? new Date(item.cancellationDate) : (item.cancellation_date ? new Date(item.cancellation_date) : new Date()),
          distilleryName: item.branchName || item.branch_name || item.distilleryName || item.distillery_name || 'N/A',
          status: item.status || 'PENDING',
          amount: parseFloat(item.totalCancellationAmount || item.total_cancellation_amount || '0'),
          type: "cancellation",
          allowedActions: item.allowedActions || item.allowed_actions || [],
          id: item.id
        }));

        this.allPermits = [
          ...this.allPermits.filter(p => p.type !== 'cancellation'),
          ...cancellations
        ];
      },
      error: (err) => console.error('Error fetching cancellations', err)
    });
  }



  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.resetPagination();
  }
  getFilteredData(): PermitData[] {
    let filtered = this.allPermits.filter(
      (permit) => permit.type === this.activeTab,
    );

    // Apply filters
    if (this.selectedDate) {
      filtered = filtered.filter((permit) => {
        const permitDate = permit.submissionDate.toISOString().split("T")[0];
        return permitDate === this.selectedDate;
      });
    }

    if (this.selectedMonth) {
      filtered = filtered.filter((permit) => {
        const permitMonth = String(
          permit.submissionDate.getMonth() + 1,
        ).padStart(2, "0");
        return permitMonth === this.selectedMonth;
      });
    }

    if (this.selectedYear) {
      filtered = filtered.filter((permit) => {
        const permitYear = permit.submissionDate.getFullYear().toString();
        return permitYear === this.selectedYear;
      });
    }

    if (this.selectedDistillery) {
      filtered = filtered.filter((permit) => {
        const distilleryMap: { [key: string]: string } = {
          "sikkim-distilleries": "Sikkim Distilleries Ltd",
          "mount-distilleries": "Mount Distilleries Ltd",
          "darjeeling-artisan": "Darjeeling Artisan Pvt Ltd",
        };
        const distilleryName = distilleryMap[this.selectedDistillery];
        return permit.distilleryName === distilleryName;
      });
    }

    if (this.selectedStatus) {
      filtered = filtered.filter((permit) =>
        permit.status.toLowerCase().includes(this.selectedStatus.toLowerCase()),
      );
    }

    return filtered;
  }

  onSearch(): void {
    // Search functionality is handled by getFilteredData()
    console.log("Searching with:", this.searchName);
  }

  onClear(): void {
    this.searchName = "";
    this.selectedDate = "";
    this.selectedMonth = "";
    this.selectedYear = "";
    this.selectedDistillery = "";
    this.selectedStatus = "";
    this.resetPagination();
  }

  approveCancellation(permit: PermitData): void {
    if (!permit.id) {
      console.error('Permit ID missing for approval');
      return;
    }

    if (confirm('Are you sure you want to approve this cancellation request?')) {
      this.supplyChainService.performCancellationAction(permit.id, 'APPROVE', 'Approved by Permit Section')
        .subscribe({
          next: (res) => {
            alert('Cancellation approved successfully');
            // Refresh logic - ideally reload data
            this.loadCancellationData();
          },
          error: (err) => {
            console.error('Error approving cancellation', err);
            alert('Failed to approve cancellation');
          }
        });
    }
  }



  viewPermitSlip(permit: PermitData): void {
    console.log("Viewing permit slip for:", permit.referenceNo);
    alert(`Viewing permit slip for ${permit.referenceNo
      }`);
  }

  printApproval(permit: PermitData): void {
    console.log("Printing approval for:", permit.referenceNo);
    alert(`Printing approval for ${permit.referenceNo}`);
  }

  viewApplication(permit: PermitData): void {
    console.log("Viewing application:", permit.referenceNo);
    // Navigate based on permit type
    switch (permit.type) {
      case "requisition":
        this.router.navigate([
          "/app-permit-section/requisition",
          permit.referenceNo,
        ]);
        break;
      case "revalidation":
        this.router.navigate([
          "/app-permit-section/revalidation",
          permit.referenceNo,
        ]);
        break;
      case "cancellation":
        this.router.navigate([
          "/app-permit-section/cancellation",
          permit.referenceNo,
        ]);
        break;
      case "transit":
        this.router.navigate([
          "/app-permit-section/transit",
          permit.referenceNo,
        ]);
        break;
      default:
        this.router.navigate(["/app-permit-section"]);
    }
  }

  viewPaymentSlip(permit: PermitData): void {
    console.log("Viewing payment slip for:", permit.referenceNo);
    this.router.navigate(["/dev-payment-receipt"], {
      queryParams: {
        transactionId: permit.referenceNo,
        type: permit.type,
      },
    });
  }

  canViewPaymentSlip(permit: PermitData): boolean {
    // Show payment slip button for permits with amount > 0
    return permit.amount > 0;
  }

  // Navigation methods
  navigateToImportPermit(): void {
    this.router.navigate(["/dev-import-permit"]);
  }

  navigateToTransitPermit(): void {
    this.router.navigate(["/dev-transit-permit"]);
  }

  navigateToSupplyChain(): void {
    this.router.navigate(["/dev-supply-chain"]);
  }

  navigateToPaymentConfirmation(): void {
    this.router.navigate(["/dev-payment-confirmation"]);
  }

  navigateToPaymentReceipt(): void {
    this.router.navigate(["/dev-payment-receipt"]);
  }

  getActiveTabTitle(): string {
    const titles: { [key: string]: string } = {
      requisition: "Requisition",
      revalidation: "Revalidation",
      cancellation: "Cancellation",
      transit: "Transit"

    };
    return titles[this.activeTab] || "Permit";
  }

  // Summary card methods
  getPendingCount(): number {
    return this.getFilteredData().filter(permit =>
      permit.status.toLowerCase().includes('pending')
    ).length;
  }

  getApprovedCount(): number {
    return this.getFilteredData().filter(permit =>
      permit.status.toLowerCase().includes('approved') ||
      permit.status.toLowerCase().includes('generated')
    ).length;
  }

  getTotalAmount(): number {
    return this.getFilteredData().reduce((total, permit) => total + permit.amount, 0);
  }

  // Status display methods
  getStatusClass(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('pending')) return 'pending';
    if (statusLower.includes('approved') || statusLower.includes('generated')) return 'approved';
    if (statusLower.includes('rejected')) return 'rejected';
    return 'default';
  }

  getStatusDisplay(status: string): string {
    if (status.length > 50) {
      return status.substring(0, 50) + '...';
    }
    return status;
  }

  // Helper methods for filter display
  getMonthName(monthNumber: string): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const index = parseInt(monthNumber) - 1;
    return months[index] || monthNumber;
  }

  getDistilleryName(distilleryKey: string): string {
    const distilleryMap: { [key: string]: string } = {
      'sikkim-distilleries': 'Sikkim Distilleries Ltd',
      'mount-distilleries': 'Mount Distilleries Ltd',
      'darjeeling-artisan': 'Darjeeling Artisan Pvt Ltd',
    };
    return distilleryMap[distilleryKey] || distilleryKey;
  }

  getTotalCountForActiveTab(): number {
    return this.allPermits.filter(permit => permit.type === this.activeTab).length;
  }

  // Pagination Logic
  Math = Math;
  pageSizeOptions: number[] = [5, 10, 15, 20];
  currentPage: number = 1;
  pageSize: number = 10;

  getCurrentPage(): number {
    return this.currentPage;
  }

  getPageSize(): number {
    return this.pageSize;
  }

  getTotalPages(): number {
    return Math.max(1, Math.ceil((this.getFilteredData()?.length || 0) / this.pageSize));
  }

  getPaged(): PermitData[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return (this.getFilteredData() || []).slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    const total = this.getTotalPages();
    if (page < 1 || page > total) return;
    this.currentPage = page;
  }

  changePageSize(size: string | number): void {
    const s = typeof size === "string" ? parseInt(size, 10) : size;
    if (!s) return;
    this.pageSize = s;
    this.currentPage = 1;
  }

  resetPagination(): void {
    this.currentPage = 1;
  }
}
