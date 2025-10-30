import { Routes } from "@angular/router";
import { LoginComponent } from "./features/login/login.component";
import { Authority } from "./shared/constants/authority.enum";
import { UserRouteAccessService } from "./core/config/user-route-access.service";
import { HomeComponent } from "./layouts/landing/home/home.component";
import { HomeLinksComponent } from "./layouts/landing/home/home-links/home-links.component";
import { InfoPagesComponent } from "./layouts/info-pages/info-pages.component";
import { PageNotFoundComponent } from "./shared/components/page-not-found/page-not-found.component";

export const routes: Routes = [
  // Landing layout with nested children
  {
    path: "",
    children: [
      {
        path: "",
        component: HomeComponent,
        data: { showCarousel: true },
      },
      {
        path: "home/:page",
        component: HomeLinksComponent,
      },
    ],
  },

  // Information pages (about-us, contact-us, etc.)
  {
    path: "info",
    children: [
      {
        path: ":page", // Dynamic info pages
        component: InfoPagesComponent,
      },
    ],
  },

  // Login route
  {
    path: "login",
    component: LoginComponent,
  },

  // Development routes - bypasses authentication
  {
    path: "dev-supply-chain",
    loadComponent: () =>
      import("./features/licensee/supplyChain/supply-chain.component").then(
        (m) => m.SupplyChainComponent,
      ),
  },
  {
    path: "dev-payment-confirmation",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/payments/paymentconformationpage/payment-confirmation.component"
      ).then((m) => m.PaymentConfirmationComponent),
  },
  {
    path: "dev-local-sales-register",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/breweryRegisters/local-sales-register/local-sales-register.component"
      ).then((m) => m.LocalSalesRegisterComponent),
  },
  {
    path: "dev-payment-receipt",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/payments/payment-receipt/payment-receipt.component"
      ).then((m) => m.PaymentReceiptComponent),
  },
  {
    path: "dev-import-permit",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/import-permit/import-permit.component"
      ).then((m) => m.ImportPermitComponent),
  },
  {
    path: "dev-supply-chain-application-view",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/letterView/requisitionView/supply-chain-requisition-view.component"
      ).then((m) => m.SupplyChainRequisitionViewComponent),
  },
  {
    path: "dev-supply-chain-revalidation-view",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/letterView/revalidationView/supply-chain-revalidation-view.component"
      ).then((m) => m.SupplyChainRevalidationViewComponent),
  },
  {
    path: "dev-supply-chain-cancellation-view",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/letterView/cancellationView/supply-chain-cancellation-view.component"
      ).then((m) => m.SupplyChainCancellationViewComponent),
  },
  {
    path: "dev-supply-chain-transit-view",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/letterView/transitView/supply-chain-transit-view.component"
      ).then((m) => m.SupplyChainTransitViewComponent),
  },
  {
    path: "dev-supply-chain-transit-view-level1",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/letterView/transitviewlevel1/transitviewlevel1.component"
      ).then((m) => m.Transitviewlevel1Component),
  },
  {
    path: "dev-supply-chain-transit-view-level2",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/letterView/transitviewlevel2/transitviewlevel2.component"
      ).then((m) => m.Transitviewlevel2Component),
  },
  {
    path: "dev-supply-chain-transit-view-level3",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/letterView/transitviewlevel3/transitviewlevel3.component"
      ).then((m) => m.Transitviewlevel3Component),
  },
  {
    path: "dev-supply-chain-hologram-view",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/letterView/hologramView/supply-chain-hologram-view.component"
      ).then((m) => m.SupplyChainHologramViewComponent),
  },
  {
    path: "dev-hologram-application-view",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/letterView/hologramitcellviewapp/hologramitcellviewapp.component"
      ).then((m) => m.HologramitcellviewappComponent),
  },
  {
    path: "dev-transit-permit",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/transit-permit/transit-permit.component"
      ).then((m) => m.TransitPermitComponent),
  },
  {
    path: "dev-transit-permit-register",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/registers/transit-permit-register/transit-permit-register.component"
      ).then((m) => m.TransitPermitRegisterComponent),
  },
  {
    path: "dev-hologram",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/HoloGram/hologram/hologram.component"
      ).then((m) => m.HologramComponent),
  },
  {
    path: "dev-daily-record-register",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/registers/daily-record-register/daily-record-register.component"
      ).then((m) => m.DailyRecordRegisterComponent),
  },
  {
    path: "dev-daily-production-register",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/registers/beer-production-register/beer-production-register.component"
      ).then((m) => m.BeerProductionRegisterComponent),
  },
  {
    path: "dev-beer-production-register",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/registers/beer-production-register/beer-production-register.component"
      ).then((m) => m.BeerProductionRegisterComponent),
  },
  {
    path: "dev-brands-details",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/registers/brands-details/brands-details.component"
      ).then((m) => m.BrandsDetailsComponent),
  },
  {
    path: "app-permit-section",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/permit-section/permit-section.component"
      ).then((m) => m.PermitSectionComponent),
    children: [
      {
        path: "requisition/:ref",
        loadComponent: () =>
          import(
            "./features/licensee/supplyChain/letterView/permitSectionRequisitionView/permit-section-requisition-view.component"
          ).then((m) => m.PermitSectionRequisitionViewComponent),
      },
      {
        path: "revalidation/:ref",
        loadComponent: () =>
          import(
            "./features/licensee/supplyChain/letterView/permit-section-revalidation-application-view/permit-section-revalidation-application-view.component"
          ).then((m) => m.PermitSectionRevalidationApplicationViewComponent),
      },
      {
        path: "cancellation/:ref",
        loadComponent: () =>
          import(
            "./features/licensee/supplyChain/letterView/permit-section-cancellation-application-view/permit-section-cancellation-application-view.component"
          ).then((m) => m.PermitSectionCancellationApplicationViewComponent),
      },
      {
        path: "transit/:ref",
        loadComponent: () =>
          import(
            "./features/licensee/supplyChain/letterView/permit-section-transit-view/permit-section-transit-view.component"
          ).then((m) => m.PermitSectionTransitViewComponent),
      },
    ],
  },
  {
    path: "dev-commissioner-dashboard",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/commissioner-dashboard/commissioner-dashboard.component"
      ).then((m) => m.CommissionerDashboardComponent),
  },
  {
    path: "dev-hologram-letter-view",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/HoloGram/hologram-letter-view/hologram-letter-view.component"
      ).then((m) => m.HologramLetterViewComponent),
  },
  {
    path: "dev-requisition-letter-view",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/letterView/commissionerletterview/requisition-letter-view.component"
      ).then((m) => m.RequisitionLetterViewComponent),
  },
  {
    path: "dev-revalidation-letter-view",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/letterView/Commiosnerrevalidationview/revalidation-letter-view.component"
      ).then((m) => m.RevalidationLetterViewComponent),
  },
  {
    path: "dev-cancellation-letter-view",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/letterView/commissionercancellationview/cancellation-letter-view.component"
      ).then((m) => m.CancellationLetterViewComponent),
  },
  {
    path: "dev-transit-permit-letter-view",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/letterView/commissionerTransitView/transit-permit-letter-view.component"
      ).then((m) => m.TransitPermitLetterViewComponent),
  },
  {
    path: "dev-final-requisition-letters",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/letterView/finalrequistionletters/finalrequistionletters.component"
      ).then((m) => m.FinalrequistionlettersComponent),
  },
  {
    path: "dev-officer-in-charge",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/officer-in-charge/officer-in-charge.component"
      ).then((m) => m.OfficerInChargeComponent),
  },
  {
    path: "dev-itcell",
    loadComponent: () =>
      import("./features/licensee/supplyChain/itcell/itcell.component").then(
        (m) => m.ITCELLComponent,
      ),
  },
  {
    path: "dev-hologram-monthly-report",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/registers/hologram-monthly-report/hologram-monthly-report.component"
      ).then((m) => m.HologramMonthlyReportComponent),
  },
  {
    path: "dev-hologram-daily-register",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/registers/hologram-daily-register/hologram-daily-register.component"
      ).then((m) => m.HologramDailyRegisterComponent),
  },

  // Role Protected modules
  {
    path: "admin",
    canActivate: [UserRouteAccessService],
    data: {
      authorities: [
        Authority.SITE_ADMIN,
        Authority.LEVEL_1,
        Authority.LEVEL_2,
        Authority.LEVEL_3,
        Authority.LEVEL_4,
        Authority.LEVEL_5,
      ],
    },
    loadChildren: () => import("./features/admin/admin.routes"),
  },

  // Licensee feature module
  {
    path: "licensee",
    canActivate: [UserRouteAccessService],
    data: {
      authorities: [Authority.LICENSEE],
    },
    loadChildren: () =>
      import("./features/licensee/licensee.routes").then(
        (m) => m.licenseeRoutes,
      ),
  },

  // Wildcard fallback
  {
    path: "**",
    component: PageNotFoundComponent,
  },
];

export default routes;
