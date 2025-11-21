import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterOutlet, NavigationEnd } from "@angular/router";
import { Subscription } from "rxjs";
import { filter } from "rxjs/operators";

interface PermitData {
  referenceNo: string;
  submissionDate: Date;
  distilleryName: string;
  status: string;
  amount: number;
  type: "requisition" | "revalidation" | "cancellation" | "transit";
}

@Component({
  selector: "app-permit-section",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet],
  templateUrl: "./permit-section.component.html",
  styleUrls: ["./permit-section.component.scss"],
})
export class PermitSectionComponent implements OnInit, OnDestroy {
  activeTab = "requisition";
  searchName = "";
  selectedDate = "";
  selectedMonth = "";
  selectedYear = "";
  selectedDistillery = "";
  selectedStatus = "";
  isViewingApplication = false;
  private routerSubscription?: Subscription;

  // Sample data matching the .NET dashboard image
  allPermits: PermitData[] = [
    {
      referenceNo: "IBPS/02/EXCISE",
      submissionDate: new Date("2025-09-22"),
      distilleryName: "Sikkim Distilleries Ltd",
      status:
        "THE PERMIT HAS BEEN GENERATED AND WILL BE MAILED TO THE CONCERNED AUTHORITY.",
      amount: 8.0,
      type: "requisition",
    },
    {
      referenceNo: "IBPS/02/EXCISE",
      submissionDate: new Date("2025-09-15"),
      distilleryName: "Mount Distilleries Ltd",
      status:
        "THE PERMIT HAS BEEN GENERATED AND WILL BE MAILED TO THE CONCERNED AUTHORITY.",
      amount: 120.0,
      type: "requisition",
    },
    {
      referenceNo: "IBPS/03/EXCISE",
      submissionDate: new Date("2025-09-05"),
      distilleryName: "Darjeeling Artisan Pvt Ltd",
      status:
        "THE PERMIT HAS BEEN GENERATED AND WILL BE MAILED TO THE CONCERNED AUTHORITY.",
      amount: 8.0,
      type: "requisition",
    },
    {
      referenceNo: "REV/001/2025",
      submissionDate: new Date("2025-09-10"),
      distilleryName: "Sikkim Distilleries Ltd",
      status: "REVALIDATION APPROVED BY COMMISSIONER",
      amount: 50.0,
      type: "revalidation",
    },
    {
      referenceNo: "CAN/001/2025",
      submissionDate: new Date("2025-09-08"),
      distilleryName: "Mount Distilleries Ltd",
      status: "CANCELLATION PENDING APPROVAL",
      amount: 25.0,
      type: "cancellation",
    },
    {
      referenceNo: "TRP/001/2025",
      submissionDate: new Date("2025-09-20"),
      distilleryName: "Sikkim Distilleries Ltd",
      status: "TRANSIT PERMIT APPROVED",
      amount: 75.0,
      type: "transit",
    },
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Listen to router events to determine if we're viewing an individual application
    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        // Check if the current URL contains child routes (indicating an individual application view)
        this.isViewingApplication =
          event.urlAfterRedirects.includes("/app-permit-section/") &&
          (event.urlAfterRedirects.includes("/requisition/") ||
            event.urlAfterRedirects.includes("/revalidation/") ||
            event.urlAfterRedirects.includes("/cancellation/") ||
            event.urlAfterRedirects.includes("/transit/"));
      });

    // Check initial route
    this.isViewingApplication =
      this.router.url.includes("/app-permit-section/") &&
      (this.router.url.includes("/requisition/") ||
        this.router.url.includes("/revalidation/") ||
        this.router.url.includes("/cancellation/") ||
        this.router.url.includes("/transit/"));
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
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
  }

  viewPermitSlip(permit: PermitData): void {
    console.log("Viewing permit slip for:", permit.referenceNo);
    alert(`Viewing permit slip for ${permit.referenceNo}`);
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
      transit: "Transit",
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
}
