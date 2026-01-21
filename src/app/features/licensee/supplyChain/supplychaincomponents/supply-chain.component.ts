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

  userUnits: any[] = [];
  showUnitSwitcher = false;

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
          this.loadUserUnits(); // Load other units
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

  loadUserUnits() {
    this.profileService.getUserUnits().subscribe({
      next: (res) => {
        if (res.success) {
          this.userUnits = res.data;
        }
      }
    });
  }

  toggleUnitSwitcher() {
    this.showUnitSwitcher = !this.showUnitSwitcher;
  }

  switchUnit(licenseeId: string) {
    if (confirm('Verify switching to this unit?')) {
      this.profileService.switchUnit(licenseeId).subscribe({
        next: () => {
          window.location.reload();
        },
        error: (err) => {
          console.error('Switch failed', err);
          alert('Failed to switch unit');
        }
      })
    }
  }

  addNewUnit() {
    if (confirm('This will take you to registration page to add a NEW unit. Continue?')) {
      // We do NOT delete the profile, effectively "logging out" of the active session 
      // but since we want to add *new*, we just go to registration.
      // However, registration checks "if exists". We might need to clear active session first?
      // Actually, to add new, we should just go to reg page.
      // But the backend view checks `if SupplyChainUserProfile.objects.filter(user=request.user).exists(): return error`.
      // So we DO need to clear the active session to allow "new" registration.
      this.profileService.resetProfile().subscribe(() => {
        this.router.navigate(['/licensee/supply-chain-registration']);
      });
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
