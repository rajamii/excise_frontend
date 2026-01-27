import { Component, Inject, PLATFORM_ID, OnInit } from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";
import { RequisitionComponent } from "./requisition/requisition.component";
import { RevalidationComponent } from "./revalidation/revalidation.component";
import { CancellationComponent } from "./cancellation/cancellation.component";
import { TransitComponent } from "./transit/transit.component";
import { HologramrequestComponent } from "./hologramrequest/hologramrequest.component";
import { HologramprocurementComponent } from "./hologramprocurement/hologramprocurement.component";
import { SupplyChainProfileService } from "../../../../core/services/supply-chain-profile.service";

interface TableData {
  referenceNo: string;
  submissionDate: string;
  distilleryName: string;
  status: string;
  amount: string;
  isLive?: boolean;
  isInvalid?: boolean;
}

// MOVED TO hologramprocurement.component.ts
// interface HologramRow {
//   refNo: string;
//   date: string;
//   companyName: string;
//   localQtyLakh?: number;
//   exportQtyLakh?: number;
//   defenceQtyLakh?: number;
//   procurementType?: 'Local' | 'Export' | 'Defence';
//   status: string;
//   paymentCompleted?: boolean;
//   editedByCommissioner?: boolean;
//   editHistory?: any;
// }

@Component({
  selector: "app-supply-chain",
  standalone: true,
  imports: [CommonModule, FormsModule, RequisitionComponent, RevalidationComponent, CancellationComponent, TransitComponent, HologramrequestComponent, HologramprocurementComponent],
  templateUrl: "./supply-chain.component.html",
  styleUrls: ["./supply-chain.component.scss"],
})
export class SupplyChainComponent implements OnInit {
  Math = Math;
  selectedDate = "";
  selectedMonth = "";
  selectedYear = "";
  selectedDistillery = "";
  selectedStatus = "";
  activeTab = "requisition";
  sidebarHidden = true;
  private isBrowser = false;
  currentProfile: any = null;
  loadingProfile = true;

  // MOVED TO hologramprocurement.component.ts
  // hologramList: HologramRow[] = [];



  constructor(
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) platformId: Object,
    private profileService: SupplyChainProfileService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    // MOVED TO hologramprocurement.component.ts
    // this.refreshHologramList();
  }

  ngOnInit(): void {
    // Check for profile first
    this.profileService.getProfile().subscribe({
      next: (res) => {
        if (res.exists && res.data) {
          this.currentProfile = res.data;
          this.loadingProfile = false;

        } else {
          // If checking profile fails or doesn't exist, redirect to registration
          this.router.navigate(['/licensee/supply-chain-registration']);
        }
      },
      error: (err) => {
        console.error('Failed to fetch profile', err);
        // On error, also redirect? Or show error?
        // Safer to redirect or stay loading
        this.router.navigate(['/licensee/supply-chain-registration']);
      }
    });

    // Check for tab query parameter
    if (this.isBrowser) {
      const tab = this.route.snapshot.queryParamMap.get('tab');
      if (tab) {
        this.setActiveTab(tab);
      }
    }
  }



  setActiveTab(tab: string): void {
    console.log('setActiveTab called with:', tab);
    this.activeTab = tab;
  }



  viewWallet(): void {
    this.router.navigate(["/dev-payment-confirmation"]);
  }

  navigateTo(route: string): void {
    switch (route) {
      case "import-permit":
        this.router.navigate(["/dev-import-permit"]);
        break;
      case "transit-permit":
        this.router.navigate(["/dev-transit-permit"]);
        break;
      case "hologram":
        this.router.navigate(["/dev-hologram"]);
        break;
      case "request-hologram":
        this.router.navigate(["/dev-hologramrequestlevel1"]);
        break;
      case "transit-permit-register":
        this.router.navigate(["/dev-transit-permit-register"]);
        break;
      case "daily-record-register":
        this.router.navigate(["/dev-daily-record-register"]);
        break;
      case "daily-production-register":
        this.router.navigate(["/dev-daily-production-register"]);
        break;
      case "brands-details":
        this.router.navigate(["/dev-brands-details"]);
        break;
      case "yuksom-local-sales-register":
        this.router.navigate(["/dev-local-sales-register"]);
        break;
      case "beer-production-register":
        this.router.navigate(["/dev-beer-production-register"]);
        break;
      case "hologram-daily-register":
        this.router.navigate(["/dev-hologram-daily-register"]);
        break;
      case "hologram-monthly-report":
        this.router.navigate(["/dev-hologram-monthly-report"]);
        break;
      case "dashboard":
        this.router.navigate(["/dev-supply-chain"]);
        break;
      case "payments":
        this.router.navigate(["/dev-payment-confirmation"]);
        break;
      case "payment-receipt":
        this.router.navigate(["/dev-payment-receipt"]);
        break;
      default:
        this.router.navigate(["/dev-supply-chain"]);
    }
  }

}
