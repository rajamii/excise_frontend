import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";

interface PermitRecord {
  id: string;
  referenceNo: string;
  submissionDate: Date;
  distilleryName: string;
  status: string;
  brAmount: number;
  revalidationAmount?: number;
  cancellationAmount?: number;
  type:
    | "requisition"
    | "revalidation"
    | "cancellation"
    | "transit"
    | "hologram";
  hasPaymentSlip?: boolean;
  cancellationBRFilePath?: string;
  // Hologram specific fields
  localQtyLakh?: number;
  exportQtyLakh?: number;
  defenceQtyLakh?: number;
  companyName?: string;
}

@Component({
  selector: "app-commissioner-dashboard",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./commissioner-dashboard.component.html",
  styleUrl: "./commissioner-dashboard.component.scss",
})
export class CommissionerDashboardComponent implements OnInit {
  activeTab = "requisition";
  searchFilter = "";
  currentPage = 1;
  pageSize = 10;
  totalRecords = 0;

  // Filter properties
  selectedDate = "";
  selectedMonth = "";
  selectedYear = "";
  selectedDistillery = "";
  selectedStatus = "";

  // Expose Math to template
  Math = Math;

  // Sample data based on the ASP.NET GridView
  allRecords: PermitRecord[] = [
    // Requisition Records
    {
      id: "1",
      referenceNo: "IBPS/02/EXCISE",
      submissionDate: new Date("2025-09-22"),
      distilleryName: "Sikkim Distilleries Ltd",
      status: "IMPORT PERMIT GENERATED",
      brAmount: 8.0,
      type: "requisition",
      hasPaymentSlip: true,
    },
    {
      id: "2",
      referenceNo: "IBPS/06/EXCISE",
      submissionDate: new Date("2025-09-15"),
      distilleryName: "Mount Distilleries Ltd",
      status: "IMPORT PERMIT GENERATED",
      brAmount: 120.0,
      type: "requisition",
      hasPaymentSlip: true,
    },
    {
      id: "3",
      referenceNo: "IBPS/03/EXCISE",
      submissionDate: new Date("2025-09-05"),
      distilleryName: "Darjeeling Artisan Pvt Ltd",
      status: "IMPORT PERMIT GENERATED",
      brAmount: 8.0,
      type: "requisition",
      hasPaymentSlip: true,
    },
    {
      id: "4",
      referenceNo: "IBPS/04/EXCISE",
      submissionDate: new Date("2025-09-20"),
      distilleryName: "Sikkim Distilleries Ltd",
      status: "Pending",
      brAmount: 75.0,
      type: "requisition",
      hasPaymentSlip: false,
    },
    {
      id: "5",
      referenceNo: "IBPS/05/EXCISE",
      submissionDate: new Date("2025-09-18"),
      distilleryName: "Mount Distilleries Ltd",
      status: "ForwardedToCommissioner",
      brAmount: 95.0,
      type: "requisition",
      hasPaymentSlip: false,
    },
    // Revalidation Records
    {
      id: "6",
      referenceNo: "REV/001/2025",
      submissionDate: new Date("2025-09-10"),
      distilleryName: "Sikkim Distilleries Ltd",
      status: "ForwardedRevalidationToCommissioner",
      brAmount: 50.0,
      revalidationAmount: 25.0,
      type: "revalidation",
      hasPaymentSlip: true,
    },
    {
      id: "7",
      referenceNo: "REV/002/2025",
      submissionDate: new Date("2025-09-12"),
      distilleryName: "Mount Distilleries Ltd",
      status: "ApprovedRevalidationByCommissioner",
      brAmount: 60.0,
      revalidationAmount: 30.0,
      type: "revalidation",
      hasPaymentSlip: true,
    },
    // Cancellation Records
    {
      id: "8",
      referenceNo: "CAN/001/2025",
      submissionDate: new Date("2025-09-08"),
      distilleryName: "Sikkim Distilleries Ltd",
      status: "Cancellation Pending",
      brAmount: 25.0,
      cancellationAmount: 15.0,
      type: "cancellation",
      hasPaymentSlip: true,
      cancellationBRFilePath: "/assets/documents/cancellation-br-001.pdf",
    },
    {
      id: "9",
      referenceNo: "CAN/002/2025",
      submissionDate: new Date("2025-09-14"),
      distilleryName: "Darjeeling Artisan Pvt Ltd",
      status: "Approved Cancellation",
      brAmount: 40.0,
      cancellationAmount: 20.0,
      type: "cancellation",
      hasPaymentSlip: true,
    },
    // Hologram Records
    {
      id: "10",
      referenceNo: "YB/1/BREW/25",
      submissionDate: new Date("2025-01-15"),
      distilleryName: "Yuksom Breweries Ltd",
      status: "Pending",
      brAmount: 0,
      type: "hologram",
      localQtyLakh: 15,
      exportQtyLakh: 5,
      defenceQtyLakh: 2,
      companyName: "Yuksom Breweries Ltd",
    },
    {
      id: "11",
      referenceNo: "YB/2/BREW/25",
      submissionDate: new Date("2025-01-16"),
      distilleryName: "Sikkim Distilleries Ltd",
      status: "Forwarded to IT Cell",
      brAmount: 0,
      type: "hologram",
      localQtyLakh: 20,
      exportQtyLakh: 8,
      defenceQtyLakh: 3,
      companyName: "Sikkim Distilleries Ltd",
    },
    {
      id: "12",
      referenceNo: "YB/3/BREW/25",
      submissionDate: new Date("2025-01-17"),
      distilleryName: "Mount Distilleries Ltd",
      status: "Approved",
      brAmount: 0,
      type: "hologram",
      localQtyLakh: 12,
      exportQtyLakh: 6,
      defenceQtyLakh: 1,
      companyName: "Mount Distilleries Ltd",
    },
    // Transit Permit Records
    {
      id: "13",
      referenceNo: "TP/001/2025",
      submissionDate: new Date("2025-01-20"),
      distilleryName: "Sikkim Distilleries Ltd",
      status: "Pending",
      brAmount: 0,
      type: "transit",
      hasPaymentSlip: false,
    },
    {
      id: "14",
      referenceNo: "TP/002/2025",
      submissionDate: new Date("2025-01-21"),
      distilleryName: "Mount Distilleries Ltd",
      status: "Approved",
      brAmount: 0,
      type: "transit",
      hasPaymentSlip: true,
    },
    {
      id: "15",
      referenceNo: "TP/003/2025",
      submissionDate: new Date("2025-01-22"),
      distilleryName: "Darjeeling Artisan Pvt Ltd",
      status: "Forwarded",
      brAmount: 0,
      type: "transit",
      hasPaymentSlip: false,
    },
    {
      id: "16",
      referenceNo: "TP/004/2025",
      submissionDate: new Date("2025-01-23"),
      distilleryName: "Yuksom Breweries Ltd",
      status: "Approved",
      brAmount: 0,
      type: "transit",
      hasPaymentSlip: true,
    },
    {
      id: "17",
      referenceNo: "TP/005/2025",
      submissionDate: new Date("2025-01-24"),
      distilleryName: "Highland Breweries",
      status: "Pending",
      brAmount: 0,
      type: "transit",
      hasPaymentSlip: false,
    },
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.updatePagination();
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.currentPage = 1;
    this.updatePagination();
  }

  getFilteredRecords(): PermitRecord[] {
    let filtered = this.allRecords.filter(
      (record) => record.type === this.activeTab,
    );

    // Apply text search filter
    if (this.searchFilter.trim()) {
      const filter = this.searchFilter.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.referenceNo.toLowerCase().includes(filter) ||
          record.distilleryName.toLowerCase().includes(filter) ||
          record.status.toLowerCase().includes(filter),
      );
    }

    // Apply date filter
    if (this.selectedDate) {
      filtered = filtered.filter((record) => {
        const recordDate = record.submissionDate.toISOString().split("T")[0];
        return recordDate === this.selectedDate;
      });
    }

    // Apply month filter
    if (this.selectedMonth) {
      filtered = filtered.filter((record) => {
        const recordMonth = String(
          record.submissionDate.getMonth() + 1,
        ).padStart(2, "0");
        return recordMonth === this.selectedMonth;
      });
    }

    // Apply year filter
    if (this.selectedYear) {
      filtered = filtered.filter((record) => {
        const recordYear = record.submissionDate.getFullYear().toString();
        return recordYear === this.selectedYear;
      });
    }

    // Apply distillery filter
    if (this.selectedDistillery) {
      filtered = filtered.filter((record) => {
        const distilleryMap: { [key: string]: string } = {
          "sikkim-distilleries": "Sikkim Distilleries Ltd",
          "mount-distilleries": "Mount Distilleries Ltd",
          "darjeeling-artisan": "Darjeeling Artisan Pvt Ltd",
        };
        const distilleryName = distilleryMap[this.selectedDistillery];
        return record.distilleryName === distilleryName;
      });
    }

    // Apply status filter
    if (this.selectedStatus) {
      filtered = filtered.filter((record) =>
        record.status.toLowerCase().includes(this.selectedStatus.toLowerCase()),
      );
    }

    return filtered;
  }

  getPaginatedRecords(): PermitRecord[] {
    const filtered = this.getFilteredRecords();
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return filtered.slice(startIndex, startIndex + this.pageSize);
  }

  updatePagination(): void {
    this.totalRecords = this.getFilteredRecords().length;
  }

  getTotalPages(): number {
    return Math.ceil(this.totalRecords / this.pageSize);
  }

  onSearch(): void {
    this.currentPage = 1;
    this.updatePagination();
  }

  onClear(): void {
    this.searchFilter = "";
    this.selectedDate = "";
    this.selectedMonth = "";
    this.selectedYear = "";
    this.selectedDistillery = "";
    this.selectedStatus = "";
    this.currentPage = 1;
    this.updatePagination();
  }

  // Pagination methods
  goToFirstPage(): void {
    this.currentPage = 1;
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.getTotalPages()) {
      this.currentPage++;
    }
  }

  goToLastPage(): void {
    this.currentPage = this.getTotalPages();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
    }
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const pages: number[] = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(
      1,
      this.currentPage - Math.floor(maxVisiblePages / 2),
    );
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  // Action methods for Requisition
  forwardToCommissioner(record: PermitRecord): void {
    console.log("Forwarding to Commissioner:", record.referenceNo);
    alert(`Forwarding ${record.referenceNo} to Commissioner`);
  }

  viewApplication(record: PermitRecord): void {
    console.log("Viewing application:", record.referenceNo);
    // Navigate to appropriate application view
    switch (record.type) {
      case "requisition":
        this.router.navigate(["/dev-requisition-letter-view"], {
          queryParams: { ref: record.referenceNo },
        });
        break;
      case "transit":
        this.router.navigate(["/dev-transit-permit-letter-view"], {
          queryParams: {
            ref: record.referenceNo,
            source: "commissioner-dashboard",
          },
        });
        break;
      default:
        alert(`Viewing application for ${record.referenceNo}`);
    }
  }

  viewTransitApplication(record: PermitRecord): void {
    console.log("Viewing transit application view:", record.referenceNo);
    // Navigate to the transitviewlevel3 component
    this.router.navigate(["/dev-supply-chain-transit-view-level3"], {
      queryParams: {
        ref: record.referenceNo,
        source: "commissioner-dashboard"
      },
    });
  }

  approveApplication(record: PermitRecord): void {
    console.log("Approving application:", record.referenceNo);
    alert(`Approving application ${record.referenceNo} and printing permit`);
    // Update status
    record.status = "Approved";
  }

  terminateRequisition(record: PermitRecord): void {
    if (
      confirm(
        "Are you sure you want to terminate this requisition? This action cannot be undone.",
      )
    ) {
      console.log("Terminating requisition:", record.referenceNo);
      record.status = "Terminated";
      alert(`Requisition ${record.referenceNo} has been terminated`);
    }
  }

  viewPaymentSlip(record: PermitRecord): void {
    console.log("Viewing payment slip:", record.referenceNo);
    this.router.navigate(["/dev-payment-receipt"], {
      queryParams: {
        ref: record.referenceNo,
        type: record.type,
      },
    });
  }

  // Action methods for Revalidation
  viewPermit(record: PermitRecord): void {
    console.log("Viewing permit:", record.referenceNo);
    this.router.navigate(["/dev-revalidation-letter-view"], {
      queryParams: { ref: record.referenceNo },
    });
  }

  viewRevalidationApplication(record: PermitRecord): void {
    console.log("Viewing revalidation application:", record.referenceNo);
    this.router.navigate(["/dev-revalidation-letter-view"], {
      queryParams: { ref: record.referenceNo },
    });
  }

  approveRevalidation(record: PermitRecord): void {
    console.log("Approving revalidation:", record.referenceNo);
    record.status = "ApprovedRevalidationByCommissioner";
    alert(`Revalidation approved for ${record.referenceNo}`);
  }

  // Action methods for Cancellation
  viewApprovalCancellation(record: PermitRecord): void {
    console.log("Viewing approval cancellation:", record.referenceNo);
    this.router.navigate(["/dev-cancellation-letter-view"], {
      queryParams: { ref: record.referenceNo },
    });
  }

  viewCancellationBR(record: PermitRecord): void {
    if (record.cancellationBRFilePath) {
      window.open(record.cancellationBRFilePath, "_blank");
    }
  }

  approveCancellation(record: PermitRecord): void {
    console.log("Approving cancellation:", record.referenceNo);
    record.status = "Approved Cancellation";
    alert(`Cancellation approved for ${record.referenceNo}`);
  }

  cancelPermit(record: PermitRecord): void {
    if (confirm("Are you sure you want to cancel this permit?")) {
      console.log("Cancelling permit:", record.referenceNo);
      record.status = "Cancelled";
      alert(`Permit ${record.referenceNo} has been cancelled`);
    }
  }

  // Utility methods
  canShowTerminateButton(record: PermitRecord): boolean {
    return (
      record.status === "Pending" || record.status === "ForwardedToCommissioner"
    );
  }

  canShowPaymentSlip(record: PermitRecord): boolean {
    const paymentStatuses = [
      "PaymentSuccessfulForwardedToPermitSection",
      "ApprovedEVCByPermitSection",
      "Import permit extends 45 days - INVALID",
      "ForwardedBRToCommissioner",
      "ForwardedBRToJointCommissioner",
      "Approved",
      "ForwardedEVCToPermitSection",
      "IMPORT PERMIT GENERATED",
    ];
    return (
      paymentStatuses.includes(record.status) || record.hasPaymentSlip === true
    );
  }

  canShowRevalidationPaymentSlip(record: PermitRecord): boolean {
    const revalidationPaymentStatuses = [
      "ForwardedRevalidationToPermitSection",
      "ForwardedRevalidationToCommissioner",
      "ForwardedBRRevalidationToOfficerInCharge",
      "ForwardedBRRevalidationToCommissioner",
      "ForwardedBRRevalidationToPermitSection",
      "ApprovedRevalidationByCommissioner",
      "ApprovedRevalidation",
      "ApprovedRevalidationByJointCommissioner",
      "RevalidationPending",
    ];
    return revalidationPaymentStatuses.includes(record.status);
  }

  getActiveTabTitle(): string {
    const titles: { [key: string]: string } = {
      requisition: "Requisition",
      revalidation: "Revalidation",
      cancellation: "Cancellation",
      transit: "Transit",
      hologram: "Hologram",
    };
    return titles[this.activeTab] || "Records";
  }

  getAmountByType(record: PermitRecord): number {
    switch (this.activeTab) {
      case "revalidation":
        return record.revalidationAmount || record.brAmount;
      case "cancellation":
        return record.cancellationAmount || record.brAmount;
      default:
        return record.brAmount;
    }
  }

  // Hologram specific methods
  getHologramTotalQty(record: PermitRecord): number {
    const local = record.localQtyLakh || 0;
    const exportQty = record.exportQtyLakh || 0;
    const defence = record.defenceQtyLakh || 0;
    return local + exportQty + defence;
  }

  viewHologramApplication(record: PermitRecord): void {
    console.log("Viewing hologram application:", record.referenceNo);
    this.router.navigate(["/dev-hologram-letter-view"], {
      queryParams: { ref: record.referenceNo },
    });
  }

  forwardToITCell(record: PermitRecord): void {
    if (
      confirm(
        `Are you sure you want to forward ${record.referenceNo} to IT Cell?`,
      )
    ) {
      console.log("Forwarding to IT Cell:", record.referenceNo);
      record.status = "Forwarded to IT Cell";
      alert(
        `Hologram request ${record.referenceNo} has been forwarded to IT Cell`,
      );
    }
  }

  viewHologramLetter(record: PermitRecord): void {
    this.router.navigate(["/dev-hologram-letter-view"], {
      queryParams: { ref: record.referenceNo },
    });
  }

  printFinalApplication(record: PermitRecord): void {
    this.router.navigate(["/dev-final-requisition-letters"], {
      queryParams: { ref: record.referenceNo },
    });
  }
}
