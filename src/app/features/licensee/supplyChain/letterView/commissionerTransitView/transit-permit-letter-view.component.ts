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
        id: "1",
        referenceNo: "TRN/BF801",
        submissionDate: new Date("2025-09-22"),
        distilleryName: "Sikkim Distilleries Ltd",
        status: "PENDING",
        brAmount: 2500,
        permitType: "Alcohol Transit Permit",
        vehicleNumber: "SK01AB1234",
        driverName: "Rajesh Kumar",
        driverLicense: "DL-1234567890",
        fromLocation: "Gangtok, Sikkim",
        toLocation: "Delhi",
        goodsDescription: "Royal Stag 180ml",
        quantity: 100,
        unit: "Cases",
        routeDetails: "Gangtok - Delhi via Rangpo and NH-31",
        checkpostEntry: "Rangpo Checkpost",
        checkpostExit: "Melli Checkpost",
        validityPeriod: 7,
        issuedBy: "Excise Officer",
        issuedDate: new Date("2025-09-22"),
        soleDistributor: "M/s Karma Chopel Bhutia",
        unitLocation: "Gangtok (Sikkim)",
        salesDepotLocation: "Delhi",
        brandName: "Royal Stag",
        size: "180ml",
        cases: "100",
        educationCess: "15.5",
        exciseDuty: "125",
        additionalExcise: "45",
        educationCessTotal: "1550.00",
        exciseDutyTotal: "12500.00",
        additionalExciseTotal: "4500.00",
        permitFee: "2500.00",
      },
      {
        id: "2",
        referenceNo: "TRN/BF802",
        submissionDate: new Date("2025-09-21"),
        distilleryName: "Himalayan Distilleries Pvt Ltd",
        status: "APPROVED",
        brAmount: 3200,
        permitType: "Alcohol Transit Permit",
        vehicleNumber: "MH12CD5678",
        driverName: "Amit Singh",
        driverLicense: "DL-9876543210",
        fromLocation: "Namchi, Sikkim",
        toLocation: "Mumbai",
        goodsDescription: "Premium Whiskey 750ml",
        quantity: 150,
        unit: "Cases",
        routeDetails: "Namchi - Mumbai via Siliguri and NH-6",
        checkpostEntry: "Melli Checkpost",
        checkpostExit: "Kurseong Checkpost",
        validityPeriod: 10,
        issuedBy: "Senior Excise Officer",
        issuedDate: new Date("2025-09-21"),
        soleDistributor: "Himalayan Distributors Pvt Ltd",
        unitLocation: "Namchi (Sikkim)",
        salesDepotLocation: "Mumbai, Maharashtra",
        brandName: "Himalayan Premium",
        size: "750ml",
        cases: "150",
        educationCess: "20.0",
        exciseDuty: "150.0",
        additionalExcise: "50.0",
        educationCessTotal: "3000.00",
        exciseDutyTotal: "22500.00",
        additionalExciseTotal: "7500.00",
        permitFee: "3200.0",
      },
      {
        id: "3",
        referenceNo: "TRN/BF803",
        submissionDate: new Date("2025-09-20"),
        distilleryName: "Royal Sikkim Brewery",
        status: "ISSUED",
        brAmount: 1800,
        permitType: "Alcohol Transit Permit",
        vehicleNumber: "WB03EF9012",
        driverName: "Vikram Das",
        driverLicense: "DL-1122334455",
        fromLocation: "Pelling, Sikkim",
        toLocation: "Kolkata",
        goodsDescription: "Beer Bottles 650ml",
        quantity: 200,
        unit: "Cases",
        routeDetails: "Pelling - Kolkata via Rangpo and NH-31A",
        checkpostEntry: "Rangpo Checkpost",
        checkpostExit: "Panitanki Checkpost",
        validityPeriod: 15,
        issuedBy: "Excise Inspector",
        issuedDate: new Date("2025-09-20"),
        soleDistributor: "Royal Distributors",
        unitLocation: "Pelling (Sikkim)",
        salesDepotLocation: "Kolkata, West Bengal",
        brandName: "Royal Beer",
        size: "650ml",
        cases: "200",
        educationCess: "8.0",
        exciseDuty: "75.0",
        additionalExcise: "25.0",
        educationCessTotal: "1600.00",
        exciseDutyTotal: "15000.00",
        additionalExciseTotal: "5000.00",
        permitFee: "1800.0",
      },
      {
        id: "4",
        referenceNo: "TRN/BF804",
        submissionDate: new Date("2025-09-19"),
        distilleryName: "Mountain View Distilleries",
        status: "PROCESSING",
        brAmount: 2100,
        permitType: "Alcohol Transit Permit",
        vehicleNumber: "KA05GH3456",
        driverName: "Suresh Kumar",
        driverLicense: "DL-5566778899",
        fromLocation: "Gyalshing, Sikkim",
        toLocation: "Bangalore",
        goodsDescription: "Mountain Whiskey 375ml",
        quantity: 120,
        unit: "Cases",
        routeDetails: "Gyalshing - Bangalore via Siliguri and NH-44",
        checkpostEntry: "Melli Checkpost",
        checkpostExit: "Bagdogra Checkpost",
        validityPeriod: 12,
        issuedBy: "Assistant Excise Officer",
        issuedDate: new Date("2025-09-19"),
        soleDistributor: "Mountain View Distributors",
        unitLocation: "Gyalshing (Sikkim)",
        salesDepotLocation: "Bangalore, Karnataka",
        brandName: "Mountain View",
        size: "375ml",
        cases: "120",
        educationCess: "12.0",
        exciseDuty: "100.0",
        additionalExcise: "35.0",
        educationCessTotal: "1440.00",
        exciseDutyTotal: "12000.00",
        additionalExciseTotal: "4200.00",
        permitFee: "2100.0",
      },
      {
        id: "5",
        referenceNo: "TRN/BF805",
        submissionDate: new Date("2025-09-18"),
        distilleryName: "Eastern Himalaya Distillery",
        status: "PENDING",
        brAmount: 2800,
        permitType: "Alcohol Transit Permit",
        vehicleNumber: "TN09IJ7890",
        driverName: "Ravi Sharma",
        driverLicense: "DL-3344556677",
        fromLocation: "Soreng, Sikkim",
        toLocation: "Chennai",
        goodsDescription: "Premium Rum 750ml",
        quantity: 180,
        unit: "Cases",
        routeDetails: "Soreng - Chennai via Siliguri and NH-16",
        checkpostEntry: "Rangpo Checkpost",
        checkpostExit: "Melli Checkpost",
        validityPeriod: 14,
        issuedBy: "Excise Officer",
        issuedDate: new Date("2025-09-18"),
        soleDistributor: "Eastern Himalaya Distributors",
        unitLocation: "Soreng (Sikkim)",
        salesDepotLocation: "Chennai, Tamil Nadu",
        brandName: "Himalayan Rum",
        size: "750ml",
        cases: "180",
        educationCess: "18.0",
        exciseDuty: "140.0",
        additionalExcise: "48.0",
        educationCessTotal: "3240.00",
        exciseDutyTotal: "25200.00",
        additionalExciseTotal: "8640.00",
        permitFee: "2800.0",
      },
      {
        id: "6",
        referenceNo: "TRN/BF806",
        submissionDate: new Date("2025-09-17"),
        distilleryName: "Gangtok Premium Spirits",
        status: "REJECTED",
        brAmount: 1500,
        permitType: "Alcohol Transit Permit",
        vehicleNumber: "AS01KL2345",
        driverName: "Binod Thapa",
        driverLicense: "DL-7788990011",
        fromLocation: "Gangtok, Sikkim",
        toLocation: "Guwahati",
        goodsDescription: "Premium Vodka 750ml",
        quantity: 80,
        unit: "Cases",
        routeDetails: "Gangtok - Guwahati via Rangpo and NH-31",
        checkpostEntry: "Rangpo Checkpost",
        checkpostExit: "Melli Checkpost",
        validityPeriod: 8,
        issuedBy: "Excise Inspector",
        issuedDate: new Date("2025-09-17"),
        soleDistributor: "Gangtok Premium Distributors",
        unitLocation: "Gangtok (Sikkim)",
        salesDepotLocation: "Guwahati, Assam",
        brandName: "Premium Vodka",
        size: "750ml",
        cases: "80",
        educationCess: "22.0",
        exciseDuty: "160.0",
        additionalExcise: "55.0",
        educationCessTotal: "1760.00",
        exciseDutyTotal: "12800.00",
        additionalExciseTotal: "4400.00",
        permitFee: "1500.0",
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

  printApplication(): void {
    const printable = document.getElementById("transitPermitPrintSection")?.innerHTML || "";
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

  calculateEducationCessTotal(): string {
    if (!this.transitPermitData) {
      return '15.50';
    }
    
    const cess = parseFloat(this.transitPermitData.educationCess || '15.50');
    const cases = parseInt(this.transitPermitData.cases || '1');
    const total = cess * cases;
    
    return total.toFixed(2);
  }

  calculateExciseDutyTotal(): string {
    if (!this.transitPermitData) {
      return '125.00';
    }
    
    const duty = parseFloat(this.transitPermitData.exciseDuty || '125.00');
    const cases = parseInt(this.transitPermitData.cases || '1');
    const total = duty * cases;
    
    return total.toFixed(2);
  }

  calculateAdditionalExciseTotal(): string {
    if (!this.transitPermitData) {
      return '45.00';
    }
    
    const excise = parseFloat(this.transitPermitData.additionalExcise || '45.00');
    const cases = parseInt(this.transitPermitData.cases || '1');
    const total = excise * cases;
    
    return total.toFixed(2);
  }
}
