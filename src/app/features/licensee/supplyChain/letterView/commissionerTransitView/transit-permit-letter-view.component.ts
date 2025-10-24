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
        referenceNo: "TP/001/2025",
        submissionDate: new Date("2025-01-20"),
        distilleryName: "Sikkim Distilleries Ltd",
        status: "Pending",
        brAmount: 0,
        permitType: "Alcohol Transit Permit",
        vehicleNumber: "SK-01-AB-1234",
        driverName: "Rajesh Kumar",
        driverLicense: "DL-1234567890",
        fromLocation: "Gangtok, Sikkim",
        toLocation: "Siliguri, West Bengal",
        goodsDescription: "Grain ENA (95.5% strength)",
        quantity: 1000,
        unit: "BL",
        routeDetails: "Gangtok - Siliguri Highway via Rangpo",
        checkpostEntry: "Rangpo Checkpost",
        checkpostExit: "Melli Checkpost",
        validityPeriod: 7,
        issuedBy: "Excise Officer",
        issuedDate: new Date("2025-01-20"),
        // New fields for letter format
        soleDistributor: "Karma Chopel Bhutia",
        unitLocation: "Rangpo (Sikkim)",
        salesDepotLocation: "Siliguri, West Bengal",
        brandName: "Sikkim Premium ENA",
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
    const printable =
      document.getElementById("transitPermitPrintSection")?.innerHTML || "";
    const styles = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style'),
    )
      .map((el) => (el as HTMLElement).outerHTML)
      .join("");
    const win = window.open("", "_blank", "width=900,height=1000");
    if (!win) return;
    win.document.open();
    const ref = this.transitPermitData?.referenceNo || "";
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>Transit Permit - ${ref}</title>
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
    switch (status) {
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
