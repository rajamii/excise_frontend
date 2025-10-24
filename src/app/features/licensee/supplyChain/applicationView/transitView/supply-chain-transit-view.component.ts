import { Component, Inject, PLATFORM_ID, OnInit } from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";

interface TransitData {
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
  transporterName?: string;
  transporterLicense?: string;
  estimatedTravelTime?: string;
  securityDeposit?: number;
  insuranceDetails?: string;
}

@Component({
  selector: "app-supply-chain-transit-view",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./supply-chain-transit-view.component.html",
  styleUrls: ["./supply-chain-transit-view.component.scss"],
})
export class SupplyChainTransitViewComponent implements OnInit {
  transitData?: TransitData;
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
      if (ref) {
        this.loadTransitData(ref);
      } else {
        this.router.navigate(["/dev-supply-chain"]);
      }
    }
  }

  private loadTransitData(refNo: string): void {
    const sampleData: TransitData[] = [
      {
        id: "1",
        referenceNo: "TRN/BF801",
        submissionDate: new Date("2025-09-13"),
        distilleryName: "Royal Sikkim Brewery",
        status: "TRANSIT PERMIT ISSUED",
        brAmount: 10.0,
        permitType: "Alcohol Transit Permit",
        vehicleNumber: "SK-01-AB-1234",
        driverName: "Rajesh Kumar",
        driverLicense: "DL-1234567890",
        fromLocation: "Gangtok, Sikkim",
        toLocation: "Siliguri, West Bengal",
        goodsDescription: "Grain ENA (96.0% strength)",
        quantity: 1000,
        unit: "BL",
        routeDetails: "Gangtok - Siliguri Highway via Rangpo",
        checkpostEntry: "Rangpo Checkpost",
        checkpostExit: "Melli Checkpost",
        validityPeriod: 7,
        issuedBy: "Excise Officer",
        issuedDate: new Date("2025-09-13"),
        transporterName: "Himalayan Transport Services",
        transporterLicense: "HTS/2025/001",
        estimatedTravelTime: "6 hours",
        securityDeposit: 5000,
        insuranceDetails: "Comprehensive coverage - Policy No. INS/2025/001",
      },
      {
        id: "2",
        referenceNo: "TRN/BF802",
        submissionDate: new Date("2025-09-12"),
        distilleryName: "Mountain View Distilleries",
        status: "TRANSIT APPLICATION PROCESSING",
        brAmount: 8.5,
        permitType: "Alcohol Transit Permit",
        vehicleNumber: "SK-02-CD-5678",
        driverName: "Amit Singh",
        driverLicense: "DL-9876543210",
        fromLocation: "Namchi, Sikkim",
        toLocation: "Darjeeling, West Bengal",
        goodsDescription: "Molasses ENA (95.0% strength)",
        quantity: 850,
        unit: "BL",
        routeDetails: "Namchi - Darjeeling via Melli",
        checkpostEntry: "Melli Checkpost",
        checkpostExit: "Kurseong Checkpost",
        validityPeriod: 10,
        issuedBy: "Senior Excise Officer",
        issuedDate: new Date("2025-09-12"),
        transporterName: "Mountain Logistics Pvt Ltd",
        transporterLicense: "MLP/2025/002",
        estimatedTravelTime: "8 hours",
        securityDeposit: 4000,
        insuranceDetails: "Basic coverage - Policy No. INS/2025/002",
      },
    ];

    const found = sampleData.find((r) => r.referenceNo === refNo);
    if (found) {
      this.transitData = found;
    } else {
      this.router.navigate(["/dev-supply-chain"]);
    }
  }

  goBack(): void {
    this.router.navigate(["/dev-supply-chain"]);
  }

  printApplication(): void {
    const printable =
      document.getElementById("transitPrintSection")?.innerHTML || "";
    const styles = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style'),
    )
      .map((el) => (el as HTMLElement).outerHTML)
      .join("");
    const win = window.open("", "_blank", "width=900,height=1000");
    if (!win) return;
    win.document.open();
    const ref = this.transitData?.referenceNo || "";
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>Transit Permit Application - ${ref}</title>
          ${styles}
          <style>
            @page { size: A4; margin: 12mm; }
            body { background: #fff; }
            .no-print { display:none !important; }
            .printable-content, .printable-content * { visibility: visible !important; }
          </style>
        </head>
        <body>
          ${printable}
        </body>
      </html>`);
    win.document.close();
    win.onload = () => {
      win.focus();
      win.print();
      win.close();
    };
  }

  getStatusBadgeClass(status: string): string {
    if (status.includes("ISSUED") || status.includes("APPROVED")) {
      return "badge bg-success";
    } else if (status.includes("PROCESSING") || status.includes("PENDING")) {
      return "badge bg-warning";
    } else if (status.includes("REJECTED") || status.includes("CANCELLED")) {
      return "badge bg-danger";
    } else {
      return "badge bg-info";
    }
  }

  getValidityStatus(): string {
    if (!this.transitData?.issuedDate || !this.transitData?.validityPeriod) {
      return "Unknown";
    }

    const issuedDate = new Date(this.transitData.issuedDate);
    const expiryDate = new Date(issuedDate);
    expiryDate.setDate(expiryDate.getDate() + this.transitData.validityPeriod);

    const today = new Date();

    if (today > expiryDate) {
      return "Expired";
    } else if (today >= issuedDate && today <= expiryDate) {
      return "Active";
    } else {
      return "Not Yet Active";
    }
  }

  getValidityBadgeClass(): string {
    const status = this.getValidityStatus();
    switch (status) {
      case "Active":
        return "badge bg-success";
      case "Expired":
        return "badge bg-danger";
      case "Not Yet Active":
        return "badge bg-warning";
      default:
        return "badge bg-info";
    }
  }

  getExpiryDate(): Date | null {
    if (!this.transitData?.issuedDate || !this.transitData?.validityPeriod) {
      return null;
    }

    const issuedDate = new Date(this.transitData.issuedDate);
    const expiryDate = new Date(issuedDate);
    expiryDate.setDate(expiryDate.getDate() + this.transitData.validityPeriod);

    return expiryDate;
  }
}
