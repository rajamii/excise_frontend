import { Routes } from '@angular/router';
import { LicenseeDashboardComponent } from './licensee-dashboard/licensee-dashboard.component';
import { LicenseeHomeComponent } from './licensee-home/licensee-home.component';
import { ApplyLicenseComponent } from './apply-license/apply-license.component';
import { ApplyNewLicenseComponent } from './apply-new-license/apply-new-license.component';
import { UserRouteAccessService } from '../../core/config/user-route-access.service';
import { Authority } from '../../shared/constants/authority.enum';

export const licenseeRoutes: Routes = [
  {
    path: '',
    component: LicenseeHomeComponent, // Wrapper/layout component
    children: [
      {
        path: 'dashboard',
        component: LicenseeDashboardComponent,
        canActivate: [UserRouteAccessService],
        data: { authorities: [Authority.LICENSEE] },
      },
      {
        path: 'apply-license',
        component: ApplyLicenseComponent,
        canActivate: [UserRouteAccessService],
        data: { authorities: [Authority.LICENSEE] },
      },
      {
        path: 'apply-new-license',
        component: ApplyNewLicenseComponent,
        canActivate: [UserRouteAccessService],
        data: { authorities: [Authority.LICENSEE] },
      },      

      // Company Registration Flow
      {
        path: 'company',
        children: [
          {
            path: 'prepare-application',
            loadComponent: () => import('./company-registration/prepare-application/prepare-application.component').then(m => m.PrepareApplicationComponent),
            canActivate: [UserRouteAccessService],
            data: { authorities: [Authority.LICENSEE] },
          },
          {
            path: 'application-action',
            loadComponent: () => import('./company-registration/act-on-application/act-on-application.component').then(m => m.ActOnApplicationComponent),
            canActivate: [UserRouteAccessService],
            data: { authorities: [Authority.LICENSEE] },
          },
          {
            path: 'print-certificate',
            loadComponent: () => import('./company-registration/print-certificate/print-certificate.component').then(m => m.PrintCertificateComponent),
            canActivate: [UserRouteAccessService],
            data: { authorities: [Authority.LICENSEE] },
          },
        ]
      },
      // Salesman Registration Flow
      {
        path: 'salesman-barman',
        children: [
          {
            path: 'prepare-application',
            loadComponent: () => import('./salesman-registration/prepare-application/prepare-application.component').then(m => m.PrepareApplicationComponent),
            canActivate: [UserRouteAccessService],
            data: { authorities: [Authority.LICENSEE] },
          },
          {
            path: 'application-action',
            loadComponent: () => import('./salesman-registration/act-on-draft-application/act-on-draft-application.component').then(m => m.ActOnDraftApplicationComponent),
            canActivate: [UserRouteAccessService],
            data: { authorities: [Authority.LICENSEE] },
          },
          {
            path: 'print-certificate',
            loadComponent: () => import('./salesman-registration/print-certificate/print-certificate.component').then(m => m.PrintCertificateComponent),
            canActivate: [UserRouteAccessService],
            data: { authorities: [Authority.LICENSEE] },
          },
          {
            path: 'application-status',
            loadComponent: () => import('./salesman-registration/application-status/application-status.component').then(m => m.ApplicationStatusComponent),
            canActivate: [UserRouteAccessService],
            data: { authorities: [Authority.LICENSEE] },
          }
        ]
      },
      
      // Supply Chain Management
      {
        path: 'supply-chain',
        children: [
          {
            path: '',
            loadComponent: () => import('./supplyChain/supply-chain.component').then(m => m.SupplyChainComponent),
            canActivate: [UserRouteAccessService],
            data: { authorities: [Authority.LICENSEE] },
          },
          {
            path: 'payments',
            loadComponent: () => import('./supplyChain/payments/paymentconformationpage/payment-confirmation.component').then(m => m.PaymentConfirmationComponent),
            canActivate: [UserRouteAccessService],
            data: { authorities: [Authority.LICENSEE] },
          }
        ]
      },
      
      // Default Redirect to Dashboard
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
    ],
  },
];
