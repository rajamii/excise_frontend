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
      // Check if ref is from route params (permit section) or query params (supply chain)
      let ref = this.route.snapshot.paramMap.get('ref');
      if (!ref) {
        ref = this.route.snapshot.queryParamMap.get("ref");
      }
      
      if (ref) {
        this.loadTransitData(ref);
      } else {
        this.goBack();
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

      // If no data found, check sample data
      const sampleData: TransitData[] = [
        // Supply Chain Sample Data
        {
          referenceNo: 'TRP/1/EXCISE',
          submissionDate: new Date('2025-09-20'),
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
        },
        // Permit Section Sample Data
        {
          referenceNo: 'TRP/001/2025',
          submissionDate: new Date('2025-09-20'),
          soleDistributor: 'M/s Sikkim Distilleries Ltd',
          distilleryName: 'Sikkim Distilleries Ltd',
          status: 'TRANSIT PERMIT APPROVED',
          totalAmount: 75.0,
          depotAddress: 'gangtok',
          toLocation: 'Siliguri, West Bengal',
          routeDetails: 'Gangtok - Siliguri Highway via NH-10',
          checkpostEntry: 'Rangpo Checkpost',
          checkpostExit: 'Melli Checkpost',
          vehicleNumber: 'SK 02 CD 5678',
          products: [
            {
              brand: 'Grain ENA',
              size: '1000 BL',
              cases: 1,
              educationCess: '15.00',
              exciseDuty: '35.00',
              additionalExcise: '25.00'
            }
          ]
        },
        // Officer in Charge Sample Data
        {
          referenceNo: 'TP001/2024',
          billNo: 'TP001/2024',
          submissionDate: new Date('2024-11-15'),
          soleDistributor: 'M/s Royal Sikkim Brewery',
          distilleryName: 'Royal Sikkim Brewery',
          status: 'TRANSIT PERMIT ISSUED - OFFICER IN CHARGE',
          totalAmount: 185.5,
          depotAddress: 'gangtok',
          toLocation: 'Darjeeling, West Bengal',
          routeDetails: 'Gangtok - Darjeeling via Rangpo and Kurseong',
          checkpostEntry: 'Rangpo Checkpost',
          checkpostExit: 'Kurseong Checkpost',
          vehicleNumber: 'SK 03 EF 9012',
          products: [
            {
              brand: 'Himalayan Whisky',
              size: '750ml',
              cases: 1,
              educationCess: '15.50',
              exciseDuty: '120.00',
              additionalExcise: '50.00'
            }
          ]
        },
        // Commissioner Dashboard Sample Data
        {
          referenceNo: 'TRN/BF801',
          billNo: 'TRN/BF801',
          submissionDate: new Date('2025-09-13'),
          soleDistributor: 'M/s Royal Sikkim Brewery',
          distilleryName: 'Royal Sikkim Brewery',
          status: 'TRANSIT PERMIT ISSUED - COMMISSIONER APPROVED',
          totalAmount: 10.00,
          depotAddress: 'gangtok',
          toLocation: 'Siliguri, West Bengal',
          routeDetails: 'Gangtok - Siliguri Highway via Rangpo',
          checkpostEntry: 'Rangpo Checkpost',
          checkpostExit: 'Melli Checkpost',
          vehicleNumber: 'SK 01 AB 1234',
          products: [
            {
              brand: 'Grain ENA',
              size: '1000 BL',
              cases: 1,
              educationCess: '0.00',
              exciseDuty: '0.00',
              additionalExcise: '10.00'
            }
          ]
        }
      ];

      const found = sampleData.find(d => d.referenceNo === refNo);
      if (found) {
        this.transitData = found;
      } else {
        // Default fallback
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
      }
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
    // Check if we came from permit section, officer in charge, commissioner, or supply chain
    const currentUrl = this.router.url;
    console.log('Going back from URL:', currentUrl); // Debug log
    
    if (currentUrl.includes('/app-permit-section/')) {
      this.router.navigate(['/app-permit-section']);
    } else if (currentUrl.includes('dev-supply-chain-transit-view-level2')) {
      this.router.navigate(['/dev-officer-in-charge']);
    } else if (currentUrl.includes('dev-transit-permit-letter-view')) {
      this.router.navigate(['/dev-commissioner-dashboard']);
    } else {
      this.router.navigate(["/dev-supply-chain"]);
    }
  }

  getBackButtonText(): string {
    const currentUrl = this.router.url;
    console.log('Current URL:', currentUrl); // Debug log
    
    if (currentUrl.includes('/app-permit-section/')) {
      return 'Back to Permit Section';
    } else if (currentUrl.includes('dev-supply-chain-transit-view-level2')) {
      return 'Back to Officer in Charge';
    } else if (currentUrl.includes('dev-transit-permit-letter-view')) {
      return 'Back to Commissioner Dashboard';
    } else {
      return 'Back to Supply Chain';
    }
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