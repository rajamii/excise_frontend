import { Component, Inject, PLATFORM_ID, OnInit } from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";

interface TransitData {
  id?: string;
  referenceNo?: string;
  billNo?: string;
  submissionDate?: Date;
  date?: string;
  soleDistributor?: string;
  distilleryName?: string;
  status?: string;
  totalAmount?: number;
  brAmount?: number;
  depotAddress?: string;
  toLocation?: string;
  routeDetails?: string;
  checkpostEntry?: string;
  checkpostExit?: string;
  vehicleNumber?: string;
  products?: Array<{
    brand: string;
    size: string;
    cases: number;
    educationCess?: string;
    exciseDuty?: string;
    additionalExcise?: string;
  }>;
}

@Component({
  selector: "app-transitviewlevel1",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./transitviewlevel1.component.html",
  styleUrls: ["./transitviewlevel1.component.scss"],
})
export class Transitviewlevel1Component implements OnInit {
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
    if (!this.isBrowser) return;

    try {
      // Load from localStorage (data submitted from transit-permit form)
      const transitList: any[] = JSON.parse(localStorage.getItem('transitPermitRequests') || '[]');
      const foundTransit = transitList.find((r: any) => (r.billNo || r.refNo) === refNo);
      
      if (foundTransit) {
        this.transitData = {
          id: foundTransit.id || refNo,
          referenceNo: foundTransit.billNo || foundTransit.refNo,
          billNo: foundTransit.billNo,
          submissionDate: new Date(foundTransit.submissionDate || foundTransit.date || Date.now()),
          date: foundTransit.date,
          soleDistributor: foundTransit.soleDistributor,
          distilleryName: foundTransit.distilleryName,
          status: foundTransit.status || 'TRANSIT PERMIT ISSUED',
          totalAmount: Number(foundTransit.totalAmount || foundTransit.brAmount || 0),
          brAmount: Number(foundTransit.brAmount || 0),
          depotAddress: foundTransit.depotAddress,
          toLocation: foundTransit.toLocation,
          routeDetails: foundTransit.routeDetails,
          checkpostEntry: foundTransit.checkpostEntry,
          checkpostExit: foundTransit.checkpostExit,
          vehicleNumber: foundTransit.vehicleNumber,
          products: foundTransit.products || []
        };
        return;
      }

      // If not found in localStorage, check importPermitRequests for backward compatibility
      const importList: any[] = JSON.parse(localStorage.getItem('importPermitRequests') || '[]');
      const foundImport = importList.find((r: any) => r.refNo === refNo && r.type === 'transit-permit');
      
      if (foundImport) {
        this.transitData = {
          id: foundImport.id || refNo,
          referenceNo: foundImport.refNo,
          submissionDate: new Date(foundImport.date || Date.now()),
          soleDistributor: foundImport.soleDistributor,
          status: 'TRANSIT PERMIT ISSUED',
          totalAmount: Number(foundImport.brAmount || 215.5),
          depotAddress: foundImport.depotAddress,
          products: foundImport.products || []
        };
        return;
      }

      // If no data found, show sample data
      this.transitData = {
        referenceNo: refNo,
        submissionDate: new Date(),
        soleDistributor: 'M/s Karma Chapel Bhutia',
        status: 'TRANSIT PERMIT ISSUED',
        totalAmount: 215.5,
        depotAddress: 'gangtok',
        toLocation: 'Gangtok, Sikkim',
        routeDetails: 'Gangtok - Siliguri Highway via Rangpo',
        checkpostEntry: 'Rangpo Checkpost',
        checkpostExit: 'Melli Checkpost',
        vehicleNumber: 'SK 01 AB 1234',
        products: [
          {
            brand: 'Royal Stag',
            size: '180ml',
            cases: 1,
            educationCess: '15.50',
            exciseDuty: '125.00',
            additionalExcise: '45.00'
          }
        ]
      };
    } catch (error) {
      console.error('Error loading transit data:', error);
      this.router.navigate(["/dev-supply-chain"]);
    }
  }

  getLocationName(value?: string): string {
    if (!value) return 'Gangtok, Sikkim';
    const map: Record<string, string> = {
      gangtok: 'Gangtok, Sikkim',
      namchi: 'Namchi, Sikkim',
      gyalshing: 'Gyalshing, Sikkim',
      mangan: 'Mangan, Sikkim'
    };
    return map[value] || value;
  }

  calculateEducationCessTotal(): string {
    if (!this.transitData?.products || this.transitData.products.length === 0) {
      return '15.50';
    }
    
    const total = this.transitData.products.reduce((sum, product) => {
      const cess = parseFloat(product.educationCess || '15.50');
      return sum + (cess * product.cases);
    }, 0);
    
    return total.toFixed(2);
  }

  calculateExciseDutyTotal(): string {
    if (!this.transitData?.products || this.transitData.products.length === 0) {
      return '125.00';
    }
    
    const total = this.transitData.products.reduce((sum, product) => {
      const duty = parseFloat(product.exciseDuty || '125.00');
      return sum + (duty * product.cases);
    }, 0);
    
    return total.toFixed(2);
  }

  calculateAdditionalExciseTotal(): string {
    if (!this.transitData?.products || this.transitData.products.length === 0) {
      return '45.00';
    }
    
    const total = this.transitData.products.reduce((sum, product) => {
      const excise = parseFloat(product.additionalExcise || '45.00');
      return sum + (excise * product.cases);
    }, 0);
    
    return total.toFixed(2);
  }

  goBack(): void {
    this.router.navigate(["/dev-supply-chain"]);
  }

  printApplication(): void {
    const printable = document.getElementById("transitPrintSection")?.innerHTML || "";
    const styles = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style'),
    )
      .map((el) => (el as HTMLElement).outerHTML)
      .join("");
    const win = window.open("", "_blank", "width=900,height=1000");
    if (!win) return;
    win.document.open();
    const ref = this.transitData?.referenceNo || this.transitData?.billNo || "";
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
}