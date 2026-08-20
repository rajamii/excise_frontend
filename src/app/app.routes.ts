import { Routes } from "@angular/router";
import { LoginComponent } from "./features/login/login.component";
import { UserRouteAccessService } from "./core/config/user-route-access.service";
import { HomeComponent } from "./layouts/landing/home/home.component";
import { HomeLinksComponent } from "./layouts/landing/home/home-links/home-links.component";
import { InfoPagesComponent } from "./layouts/info-pages/info-pages.component";
import { AccessDeniedComponent } from "./shared/components/access-denied/access-denied.component";
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
      requiredPermission: 'dashboard.view',
    },
    loadChildren: () => import("./features/dashboard/dashboard.module").then(m => m.DashboardModule),
  },

  // UNIFIED OFFICER DASHBOARDS - SPA with sidebar navigation
  {
    path: "officer-dashboard/oic",
    canActivate: [UserRouteAccessService],
    data: {
      requiredPermission: 'officer.oic.view',
    },
    loadComponent: () => import("./features/admin/officer-in-charge/officer-in-charge.component").then(m => m.OfficerInChargeComponent),
  },
  {
    path: "officer-dashboard/commissioner",
    canActivate: [UserRouteAccessService],
    data: {
      requiredPermission: 'officer.commissioner.view',
    },
    loadComponent: () => import("./features/admin/commissioner/commissioner-dashboard/commissioner-dashboard.component").then(m => m.CommissionerDashboardComponent),
  },
  {
    path: "officer-dashboard/itcell",
    canActivate: [UserRouteAccessService],
    data: {
      requiredPermission: 'officer.itcell.view',
    },
    loadComponent: () => import("./features/admin/it-cell/itcell.component").then(m => m.ITCELLComponent),
  },
  {
    path: "officer-dashboard/permit-section",
    canActivate: [UserRouteAccessService],
    data: {
      requiredPermission: 'officer.permit_section.view',
    },
    loadComponent: () => import("./features/admin/permit-section/permit-section.component").then(m => m.PermitSectionComponent),
  },


  {
    path: "dev-payment-confirmation",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "licensee.module.view" },
    loadComponent: () =>
      import(
        "./shared/components/payment-wallet-redirect/payment-wallet-redirect.component"
      ).then((m) => m.PaymentWalletRedirectComponent),
  },
  {
    path: "dev-payment-integrations",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "licensee.module.view" },
    loadComponent: () =>
      import("./features/licensee/payment-integrations/payment-integrations.component").then(
        (m) => m.PaymentIntegrationsComponent
      ),
  },
  {
    path: "payment/callback",
    loadComponent: () =>
      import("./features/licensee/payment-integrations/payment-callback.component").then(
        (m) => m.PaymentCallbackComponent
      ),
  },
  {
    path: "payment/cancel",
    loadComponent: () =>
      import("./features/licensee/payment-integrations/payment-cancel.component").then(
        (m) => m.PaymentCancelComponent
      ),
  },
  {
    path: "supply-chain-view",
    canActivate: [UserRouteAccessService],
    loadComponent: () =>
      import(
        "./shared/components/unified-supply-chain-view/unified-supply-chain-view.component"
      ).then((m) => m.UnifiedSupplyChainViewComponent),
  },
  {
    path: "final-license",
    canActivate: [UserRouteAccessService],
    loadComponent: () =>
      import(
        "./features/licensee/final-license/final-license.component"
      ).then((m) => m.FinalLicenseComponent),
  },
  {
    path: "dev-local-sales-register",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "licensee.module.view" },
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/breweryRegisters/local-sales-register/local-sales-register.component"
      ).then((m) => m.LocalSalesRegisterComponent),
  },
  {
    path: "dev-final-transit-permit-view",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "licensee.module.view" },
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/UnifiedletterView/finaltransitpermit/finaltransitpermit.component"
      ).then((m) => m.FinaltransitpermitComponent),
  },
  {
    path: "dev-final-requisition-letters",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "licensee.module.view" },
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/UnifiedletterView/finalrequistionletters/finalrequistionletters/finalrequistionletters.component"
      ).then((m) => m.FinalrequistionlettersComponent),
  },
  {
    path: "payment-slip-view",
    canActivate: [UserRouteAccessService],
    loadComponent: () =>
      import(
        "./shared/components/unified-payment-slip-view/unified-payment-slip-view.component"
      ).then((m) => m.UnifiedPaymentSlipViewComponent),
  },
  {
    path: "unified-letter-view/cancellation",
    canActivate: [UserRouteAccessService],
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/UnifiedletterView/unifiedfinalletterview/unifiedfinalletterview.component"
      ).then((m) => m.UnifiedfinalletterviewComponent),
  },
  {
    path: "unified-letter-view/revalidation",
    canActivate: [UserRouteAccessService],
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/UnifiedletterView/unifiedfinalletterview/unifiedfinalletterview.component"
      ).then((m) => m.UnifiedfinalletterviewComponent),
  },
  {
    path: "unified-letter-view/requisition",
    canActivate: [UserRouteAccessService],
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/UnifiedletterView/finalrequistionletters/finalrequistionletters/finalrequistionletters.component"
      ).then((m) => m.FinalrequistionlettersComponent),
  },
  {
    path: "unified-letter-view/special-permit",
    canActivate: [UserRouteAccessService],
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/UnifiedletterView/finalspecialpermit/finalspecialpermit.component"
      ).then((m) => m.FinalspecialpermitComponent),
  },
  {
    path: "unified-letter-view/transit",
    canActivate: [UserRouteAccessService],
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/UnifiedletterView/finaltransitpermit/finaltransitpermit.component"
      ).then((m) => m.FinaltransitpermitComponent),
  },
  {
    path: "unified-letter-view/imfl-permit",
    canActivate: [UserRouteAccessService],
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/UnifiedletterView/finalimflpermit/finalimflpermit.component"
      ).then((m) => m.FinalimflpermitComponent),
  },
  {
    path: "dev-final-imfl-permit-view",
    canActivate: [UserRouteAccessService],
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/UnifiedletterView/finalimflpermit/finalimflpermit.component"
      ).then((m) => m.FinalimflpermitComponent),
  },
  {
    path: "dev-payment-receipt",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "licensee.module.view" },
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/payments/payment-receipt/payment-receipt.component"
      ).then((m) => m.PaymentReceiptComponent),
  },
  {
    path: "dev-import-permit",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "licensee.module.view" },
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/import-permit/import-permit.component"
      ).then((m) => m.ImportPermitComponent),
  },

  {
    path: "dev-supply-chain-revalidation-request",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "licensee.module.view" },
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/revalidation-request/revalidation-request.component"
      ).then((m) => m.RevalidationRequestComponent),
  },
  {
    path: "dev-transit-permit",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "licensee.module.view" },
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/transit-permit/transit-permit.component"
      ).then((m) => m.TransitPermitComponent),
  },
  {
    path: "dev-transit-permit-register",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "licensee.module.view" },
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/registers/transit-permit-register/transit-permit-register.component"
      ).then((m) => m.TransitPermitRegisterComponent),
  },
  {
    path: "dev-hologram",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "licensee.module.view" },
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/HoloGram/hologram/hologram.component"
      ).then((m) => m.HologramComponent),
  },
  {
    path: "dev-hologramrequestlevel1",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "licensee.module.view" },
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/HoloGram/hologramrequestlevel1/hologramrequestlevel1.component"
      ).then((m) => m.Hologramrequestlevel1Component),
  },
  {
    path: "dev-daily-record-register",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "licensee.module.view" },
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/registers/daily-record-register/daily-record-register.component"
      ).then((m) => m.DailyRecordRegisterComponent),
  },
  {
    path: "dev-daily-production-register",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "licensee.module.view" },
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/registers/beer-production-register/beer-production-register.component"
      ).then((m) => m.BeerProductionRegisterComponent),
  },
  {
    path: "dev-beer-production-register",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "licensee.module.view" },
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/registers/beer-production-register/beer-production-register.component"
      ).then((m) => m.BeerProductionRegisterComponent),
  },
  {
    path: "app-permit-section",
    canActivate: [UserRouteAccessService],
    data: { requiredPermission: "officer.permit_section.view" },
    loadComponent: () =>
      import(
        "./features/admin/permit-section/permit-section.component"
      ).then((m) => m.PermitSectionComponent),
    children: [
    ],
  },
  {
    path: "dev-commissioner-dashboard",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "officer.commissioner.view" },
    loadComponent: () =>
      import(
        "./features/admin/commissioner/commissioner-dashboard/commissioner-dashboard.component"
      ).then((m) => m.CommissionerDashboardComponent),
  },
  {
    path: "dev-officer-in-charge",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "officer.oic.view" },
    loadComponent: () =>
      import(
        "./features/admin/officer-in-charge/officer-in-charge.component"
      ).then((m) => m.OfficerInChargeComponent),
  },
  {
    path: "dev-itcell",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "officer.itcell.view" },
    loadComponent: () =>
      import("./features/admin/it-cell/itcell.component").then(
        (m) => m.ITCELLComponent,
      ),
  },

  {
    path: "dev-hologram-monthly-report",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "licensee.module.view" },
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/registers/hologram-monthly-report/hologram-monthly-report.component"
      ).then((m) => m.HologramMonthlyReportComponent),
  },

  {
    path: "dev-hologram-daily-register-oic",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "officer.oic.view" },
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/HoloGram/hologram-dailyregisteroic/hologram-dailyregisteroic.component"
      ).then((m) => m.HologramDailyregisteroicComponent),
  },

  {
    path: "dev-hologram-overview",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "licensee.module.view" },
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/HoloGram/hologramoveriew/hologramoveriew.component"
      ).then((m) => m.HologramoveriewComponent),
  },
  {
    path: "dev-hologram-request-list",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "officer.oic.view" },
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/HoloGram/officerinchargehologramreq/officerinchargehologramreq.component"
      ).then((m) => m.OfficerinchargehologramreqComponent),
  },
  {
    path: "dev/monthlyhologramstatement-oic",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "officer.oic.view" },
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/registers/hologram-monthly-report/hologram-monthly-report.component"
      ).then((m) => m.HologramMonthlyReportComponent),
  },
  {
    path: "dev-oic-transit-permit",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "officer.oic.view" },
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/supplychaincomponents/oic-transit-permit/oic-transit-permit.component"
      ).then((m) => m.OicTransitPermitComponent),
  },
  {
    path: "dev-hologram-details",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "licensee.module.view" },
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/HoloGram/hologramdetails/hologramdetails.component"
      ).then((m) => m.HologramdetailsComponent),
  },
  {
    path: "dev-oic-daily-hologram-register",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "officer.oic.view" },
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/registers/oicdailyhologramregister/oicdailyhologramregister.component"
      ).then((m) => m.OicdailyhologramregisterComponent),
  },
  {
    path: "dev-brand-warehouse",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "licensee.module.view" },
    loadComponent: () =>
      import(
        "./features/licensee/supplyChain/registers/brandwarehouse/brandwarehouse.component"
      ).then((m) => m.BrandwarehouseComponent),
  },
  {
    path: "dev-admin-officer-in-charge",
    canActivate: [UserRouteAccessService],
    data: { devOnly: true, requiredPermission: "officer.oic.view" },
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
      requiredPermission: 'admin.module.view',
    },
    loadChildren: () => import("./features/admin/admin.routes"),
  },

  // Licensee feature module
  {
    path: "licensee",
    canActivate: [UserRouteAccessService],
    data: {
      requiredPermission: 'licensee.module.view',
    },
    loadChildren: () =>
      import("./features/licensee/licensee.routes").then(
        (m) => m.licenseeRoutes,
      ),
  },

  {
    path: 'forgot-password',
    loadComponent: () => import('./features/login/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    // The path MUST match the format constructed in the Django email payload
    path: 'reset-password/:uid/:token',
    loadComponent: () => import('./features/login/reset-password.component').then(m => m.ResetPasswordComponent)
  },

  // Access denied aliases
  {
    path: "accessdenied",
    component: AccessDeniedComponent,
  },
  {
    path: "unauthorized",
    component: AccessDeniedComponent,
  },

  // Wildcard fallback
  {
    path: "**",
    component: PageNotFoundComponent,
  },

  
];

export default routes;
