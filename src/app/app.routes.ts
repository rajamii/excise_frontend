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

  // UNIFIED DASHBOARD ROUTE - Works for ALL roles
  {
    path: "dashboard",
    canActivate: [UserRouteAccessService],
    data: {
      authorities: [
        // Admin roles
        Authority.SITE_ADMIN,
        Authority.SINGLE_WINDOW,
        Authority.DISTRICT_USER,
        Authority.JOINT_COMMISSIONER,
        Authority.SECRETARY,
        Authority.SUB_ENQUIRY_OFFICER,
        // Officer roles
        Authority.COMMISSIONER,
        Authority.IT_CELL,
        Authority.PERMIT_SECTION,
        Authority.OFFICER_IN_CHARGE,
        // Licensee roles
        Authority.LICENSEE,
        Authority.SUPPLY_CHAIN
      ],
    },
    loadChildren: () => import("./features/dashboard/dashboard.module").then(m => m.DashboardModule),
  },

  // UNIFIED OFFICER DASHBOARDS - SPA with sidebar navigation
  {
    path: "officer-dashboard/oic",
    canActivate: [UserRouteAccessService],
    data: {
      authorities: [Authority.OFFICER_IN_CHARGE],
    },
    loadComponent: () => import("./features/admin/officer-in-charge/officer-in-charge.component").then(m => m.OfficerInChargeComponent),
  },
  {
    path: "officer-dashboard/commissioner",
    canActivate: [UserRouteAccessService],
    data: {
      authorities: [Authority.COMMISSIONER],
    },
    loadComponent: () => import("./features/admin/commissioner/commissioner-dashboard/commissioner-dashboard.component").then(m => m.CommissionerDashboardComponent),
  },
  {
    path: "officer-dashboard/itcell",
    canActivate: [UserRouteAccessService],
    data: {
      authorities: [Authority.IT_CELL],
    },
    loadComponent: () => import("./features/admin/it-cell/itcell.component").then(m => m.ITCELLComponent),
  },
  {
    path: "officer-dashboard/permit-section",
    canActivate: [UserRouteAccessService],
    data: {
      authorities: [Authority.PERMIT_SECTION],
    },
    loadComponent: () => import("./features/admin/permit-section/permit-section.component").then(m => m.PermitSectionComponent),
  },


  {
    path: "dev-payment-confirmation",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/payments/paymentconformationpage/payment-confirmation.component"
      ).then((m) => m.PaymentConfirmationComponent),
  },
  {
    path: "supply-chain-view",
    loadComponent: () =>
      import(
        "./shared/components/unified-supply-chain-view/unified-supply-chain-view.component"
      ).then((m) => m.UnifiedSupplyChainViewComponent),
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
    path: "dev-supply-chain-revalidation-request",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/revalidation-request/revalidation-request.component"
      ).then((m) => m.RevalidationRequestComponent),
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
    path: "dev-hologramrequestlevel1",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/HoloGram/hologramrequestlevel1/hologramrequestlevel1.component"
      ).then((m) => m.Hologramrequestlevel1Component),
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
        "./features/admin/permit-section/permit-section.component"
      ).then((m) => m.PermitSectionComponent),
    children: [
    ],
  },
  {
    path: "dev-commissioner-dashboard",
    loadComponent: () =>
      import(
        "./features/admin/commissioner/commissioner-dashboard/commissioner-dashboard.component"
      ).then((m) => m.CommissionerDashboardComponent),
  },
  {
    path: "dev-officer-in-charge",
    loadComponent: () =>
      import(
        "./features/admin/officer-in-charge/officer-in-charge.component"
      ).then((m) => m.OfficerInChargeComponent),
  },
  {
    path: "dev-itcell",
    loadComponent: () =>
      import("./features/admin/it-cell/itcell.component").then(
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
    path: "dev-hologram-daily-register-oic",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/HoloGram/hologram-dailyregisteroic/hologram-dailyregisteroic.component"
      ).then((m) => m.HologramDailyregisteroicComponent),
  },

  {
    path: "dev-hologram-overview",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/HoloGram/hologramoveriew/hologramoveriew.component"
      ).then((m) => m.HologramoveriewComponent),
  },
  {
    path: "dev-hologram-request-list",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/supplychaincomponents/hologramrequest/hologramrequest.component"
      ).then((m) => m.HologramrequestComponent),
  },
  {
    path: "dev/monthlyhologramstatement-oic",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/registers/hologram-monthly-report/hologram-monthly-report.component"
      ).then((m) => m.HologramMonthlyReportComponent),
  },
  {
    path: "dev-oic-transit-permit",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/supplychaincomponents/oic-transit-permit/oic-transit-permit.component"
      ).then((m) => m.OicTransitPermitComponent),
  },
  {
    path: "dev-hologram-details",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/HoloGram/hologramdetails/hologramdetails.component"
      ).then((m) => m.HologramdetailsComponent),
  },
  {
    path: "dev-oic-daily-hologram-register",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/registers/oicdailyhologramregister/oicdailyhologramregister.component"
      ).then((m) => m.OicdailyhologramregisterComponent),
  },
  {
    path: "dev-brand-warehouse",
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/registers/brandwarehouse/brandwarehouse.component"
      ).then((m) => m.BrandwarehouseComponent),
  },
  {
    path: "dev-admin-officer-in-charge",
    loadComponent: () =>
      import(
        "./features/admin/officer-in-charge/officer-in-charge.component"
      ).then((m) => m.OfficerInChargeComponent),
  },

  // Role Protected modules
  {
    path: "admin",
    canActivate: [UserRouteAccessService],
    data: {
      authorities: [
        Authority.SITE_ADMIN,
        Authority.SINGLE_WINDOW,
        Authority.DISTRICT_USER,
        Authority.JOINT_COMMISSIONER,
        Authority.SECRETARY,
        Authority.SUB_ENQUIRY_OFFICER,
        Authority.COMMISSIONER,
        Authority.IT_CELL,
        Authority.PERMIT_SECTION,
        Authority.OFFICER_IN_CHARGE,
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
