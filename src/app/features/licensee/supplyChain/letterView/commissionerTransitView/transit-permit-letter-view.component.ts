import { Component, Inject, PLATFORM_ID, OnInit } from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";

interface TransitPermitData {
  id: string;
  referenceNo: string;
  submissionDate: Date;
  distilleryName: string;
  status: string;
  brAmount: number;
  permitType?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverLicense?: string;
  fromLocation?: string;
  toLocation?: string;
  goodsDescription?: string;
  quantity?: number;
  unit?: string;
  routeDetails?: string;
  checkpostEntry?: string;
  checkpostExit?: string;
  validityPeriod?: number;
  issuedBy?: string;
  issuedDate?: Date;
  // New fields for letter format
  soleDistributor?: string;
  unitLocation?: string;
  salesDepotLocation?: string;
  brandName?: string;
  // New fields for product details
  size?: string;
  cases?: string;
  educationCess?: string;
  exciseDuty?: string;
  additionalExcise?: string;
  educationCessTotal?: string;
  exciseDutyTotal?: string;
  additionalExciseTotal?: string;
  permitFee?: string;
}

@Component({
  selector: "app-transit-permit-letter-view",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./transit-permit-letter-view.component.html",
  styleUrls: ["./transit-permit-letter-view.component.scss"],
})
export class TransitPermitLetterViewComponent implements OnInit {
  transitPermitData?: TransitPermitData;
  private isBrowser = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      const ref = this.route.snapshot.queryParamMap.get("ref");
      const source = this.route.snapshot.queryParamMap.get("source");

      // Check if accessed directly without proper authorization
      const currentUrl = window.location.href;
      const referrer = document.referrer;

      // Allow access only if:
      // 1. Coming from commissioner dashboard (source parameter)
      // 2. Coming from commissioner dashboard URL (referrer check)
      // 3. Direct access with valid ref (for testing purposes)
      if (
        ref &&
        (source === "commissioner-dashboard" ||
          referrer.includes("dev-commissioner-dashboard") ||
          currentUrl.includes("dev-transit-permit-letter-view"))
      ) {
        this.loadTransitPermitData(ref);
      } else {
        // Redirect to commissioner dashboard if unauthorized access
        alert(
          "Access denied. Transit permit letters can only be viewed from the Commissioner Dashboard.",
        );
        this.router.navigate(["/dev-commissioner-dashboard"]);
      }
    }
  }

  private loadTransitPermitData(refNo: string): void {
    // Sample data - in a real application, this would be fetched from an API
    const sampleData: TransitPermitData[] = [
      {
        id: "13",
        referenceNo: "TRP/14/EXCISE",
        submissionDate: new Date("2025-10-30"),
        distilleryName: "Sikkim Distilleries Ltd",
        status: "TRANSIT PERMIT ISSUED",
        brAmount: 0,
        permitType: "Alcohol Transit Permit",
        vehicleNumber: "SK 01 AB 1234",
        driverName: "Rajesh Kumar",
        driverLicense: "DL-1234567890",
        fromLocation: "Gangtok, Sikkim",
        toLocation: "Gangtok, Sikkim",
        goodsDescription: "Royal Stag 180ml",
        quantity: 1,
        unit: "Cases",
        routeDetails: "Gangtok - Siliguri Highway via Rangpo",
        checkpostEntry: "Rangpo Checkpost",
        checkpostExit: "Melli Checkpost",
        validityPeriod: 7,
        issuedBy: "Excise Officer",
        issuedDate: new Date("2025-10-30"),
        // New fields for letter format
        soleDistributor: "M/s Karma Chopel Bhutia",
        unitLocation: "Rangpo (Sikkim)",
        salesDepotLocation: "Siliguri, West Bengal",
        brandName: "Royal Stag",
        // Product details
        size: "180ml",
        cases: "1",
        educationCess: "15.5",
        exciseDuty: "125",
        additionalExcise: "45",
        educationCessTotal: "15.50",
        exciseDutyTotal: "125.00",
        additionalExciseTotal: "45.00",
        permitFee: "185.5",
      },
      {
        id: "14",
        referenceNo: "TP/002/2025",
        submissionDate: new Date("2025-01-21"),
        distilleryName: "Mount Distilleries Ltd",
        status: "Approved",
        brAmount: 0,
        permitType: "Alcohol Transit Permit",
        vehicleNumber: "SK-02-CD-5678",
        driverName: "Amit Singh",
        driverLicense: "DL-9876543210",
        fromLocation: "Namchi, Sikkim",
        toLocation: "Darjeeling, West Bengal",
        goodsDescription: "Molasses ENA (96.0% strength)",
        quantity: 1500,
        unit: "BL",
        routeDetails: "Namchi - Darjeeling via Melli",
        checkpostEntry: "Melli Checkpost",
        checkpostExit: "Kurseong Checkpost",
        validityPeriod: 10,
        issuedBy: "Senior Excise Officer",
        issuedDate: new Date("2025-01-21"),
        // New fields for letter format
        soleDistributor: "Mount Distributors Pvt Ltd",
        unitLocation: "Namchi (Sikkim)",
        salesDepotLocation: "Darjeeling, West Bengal",
        brandName: "Mount Heritage ENA",
        // Product details
        size: "750ml",
        cases: "2",
        educationCess: "20.0",
        exciseDuty: "150.0",
        additionalExcise: "50.0",
        educationCessTotal: "40.00",
        exciseDutyTotal: "300.00",
        additionalExciseTotal: "100.00",
        permitFee: "440.0",
      },
      {
        id: "15",
        referenceNo: "TP/003/2025",
        submissionDate: new Date("2025-01-22"),
        distilleryName: "Darjeeling Artisan Pvt Ltd",
        status: "Forwarded",
        brAmount: 0,
        permitType: "Alcohol Transit Permit",
        vehicleNumber: "SK-03-EF-9012",
        driverName: "Vikram Das",
        driverLicense: "DL-1122334455",
        fromLocation: "Pelling, Sikkim",
        toLocation: "Kolkata, West Bengal",
        goodsDescription: "Rectified Spirit (94.5% strength)",
        quantity: 800,
        unit: "BL",
        routeDetails: "Pelling - Kolkata via Rangpo and Siliguri",
        checkpostEntry: "Rangpo Checkpost",
        checkpostExit: "Panitanki Checkpost",
        validityPeriod: 15,
        issuedBy: "Excise Inspector",
        issuedDate: new Date("2025-01-22"),
        // New fields for letter format
        soleDistributor: "Artisan Distributors",
        unitLocation: "Pelling (Sikkim)",
        salesDepotLocation: "Kolkata, West Bengal",
        brandName: "Artisan Premium Spirit",
        // Product details
        size: "375ml",
        cases: "3",
        educationCess: "18.0",
        exciseDuty: "140.0",
        additionalExcise: "42.0",
        educationCessTotal: "54.00",
        exciseDutyTotal: "420.00",
        additionalExciseTotal: "126.00",
        permitFee: "600.0",
      },
    ];

    const found = sampleData.find((r) => r.referenceNo === refNo);
    if (found) {
      this.transitPermitData = found;
    } else {
      // If not found, redirect back to commissioner dashboard
      this.router.navigate(["/dev-commissioner-dashboard"]);
    }
  }

  goBack(): void {
    this.router.navigate(["/dev-commissioner-dashboard"]);
  }

  printLetter(): void {
    if (this.isBrowser) {
      // Use the browser's built-in print functionality with optimized CSS
      window.print();
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case "TRANSIT PERMIT ISSUED":
        return "TRANSIT PERMIT ISSUED";
      case "Approved":
        return "APPROVED";
      case "Forwarded":
        return "FORWARDED";
      case "Pending":
        return "PENDING APPROVAL";
      case "Rejected":
        return "REJECTED";
      default:
        return status;
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case "TRANSIT PERMIT ISSUED":
      case "Approved":
        return "badge bg-success";
      case "Forwarded":
        return "badge bg-info";
      case "Pending":
        return "badge bg-warning";
      case "Rejected":
        return "badge bg-danger";
      default:
        return "badge bg-secondary";
    }
  }
}
