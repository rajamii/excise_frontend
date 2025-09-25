import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { Authority } from './shared/constants/authority.enum';
import { UserRouteAccessService } from './core/config/user-route-access.service';
import { HomeComponent } from './layouts/landing/home/home.component';
import { HomeLinksComponent } from './layouts/landing/home/home-links/home-links.component';
import { InfoPagesComponent } from './layouts/info-pages/info-pages.component';
import { PageNotFoundComponent } from './shared/components/page-not-found/page-not-found.component';

export const routes: Routes = [
  // Landing layout with nested children
  {
    path: '',
    children: [
      {
        path: '',
        component: HomeComponent,
        data: { showCarousel: true }
      },
      {
        path: 'home/:page',
        component: HomeLinksComponent
      }
    ]
  },

  // Information pages (about-us, contact-us, etc.)
  {
    path: 'info',
    children: [
      {
        path: ':page', // Dynamic info pages
        component: InfoPagesComponent
      }
    ]
  },

  // Login route
  {
    path: 'login',
    component: LoginComponent
  },

  // Development routes - bypasses authentication
  {
    path: 'dev-supply-chain',
    loadComponent: () => import('./features/licensee/supplyChain/supply-chain.component').then(m => m.SupplyChainComponent)
  },
  {
    path: 'dev-payment-confirmation',
    loadComponent: () => import('./features/licensee/supplyChain/payments/paymentconformationpage/payment-confirmation.component').then(m => m.PaymentConfirmationComponent)
  },
  {
    path: 'dev-payment-receipt',
    loadComponent: () => import('./features/licensee/supplyChain/payments/payment-receipt/payment-receipt.component').then(m => m.PaymentReceiptComponent)
  },
  {
    path: 'dev-import-permit',
    loadComponent: () => import('./features/licensee/supplyChain/import-permit/import-permit.component').then(m => m.ImportPermitComponent)
  },
  {
    path: 'dev-transit-permit',
    loadComponent: () => import('./features/licensee/supplyChain/transit-permit/transit-permit.component').then(m => m.TransitPermitComponent)
  },
  {
    path: 'app-permit-section',
    loadComponent: () => import('./features/licensee/supplyChain/permit-section/permit-section.component').then(m => m.PermitSectionComponent)
  },
  {
    path: 'dev-commissioner-dashboard',
    loadComponent: () => import('./features/licensee/supplyChain/commissioner-dashboard/commissioner-dashboard.component').then(m => m.CommissionerDashboardComponent)
  },

  // Role Protected modules
  {
    path: 'admin',
    canActivate: [UserRouteAccessService],
    data: {
      authorities: [
        Authority.SITE_ADMIN,
        Authority.LEVEL_1,
        Authority.LEVEL_2,
        Authority.LEVEL_3,
        Authority.LEVEL_4,
        Authority.LEVEL_5
      ]
    },
    loadChildren: () => import('./features/admin/admin.routes')
  },

  // Licensee feature module
  {
    path: 'licensee',
    canActivate: [UserRouteAccessService],
    data: {
      authorities: [Authority.LICENSEE]
    },
    loadChildren: () =>
      import('./features/licensee/licensee.routes').then((m) => m.licenseeRoutes)

  },

  // Wildcard fallback
  {
    path: '**',
    component: PageNotFoundComponent
  }
];

export default routes;
