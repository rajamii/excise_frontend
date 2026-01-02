import { Routes } from '@angular/router';
import { LicenseeDashboardComponent } from './licensee-dashboard/licensee-dashboard.component';
import { LicenseeHomeComponent } from './licensee-home/licensee-home.component';
import { ApplyLicenseComponent } from './apply-license/apply-license.component';
import { ApplyNewLicenseComponent } from './apply-new-license/apply-new-license.component';
import { UserRouteAccessService } from '../../core/config/user-route-access.service';
import { Authority } from '../../shared/constants/authority.enum';
import { SupplyChainComponent } from './supplyChain/supplychaincomponents/supply-chain.component';

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

      // Company Registration and Collaboration Flow with separate components
      {
        path: 'company-registration-and-collaboration',
        children: [
          // Company Registration Flow
          {
            path: 'company-registration/prepare-application',
            loadComponent: () => import('./company-registration-and-collaboration/company-registration/prepare-application/prepare-application.component').then(m => m.PrepareApplicationComponent),
            canActivate: [UserRouteAccessService],
            data: { authorities: [Authority.LICENSEE] },
          },
          // Company Collaboration Flow
          {
            path: 'company-collaboration/prepare-application',
            loadComponent: () => import('./company-registration-and-collaboration/company-collaboration/prepare-application/prepare-application.component').then(m => m.PrepareApplicationComponent),
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
            loadComponent: () => import('./salesman-registration/prepare-application.component').then(m => m.PrepareApplicationComponent),
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
            loadComponent: () => import('./supplyChain/supplychaincomponents/supply-chain.component').then(m => m.SupplyChainComponent),
            canActivate: [UserRouteAccessService],
            data: { authorities: [Authority.LICENSEE] },
          },
          {
            path: 'ena-import',
            component:SupplyChainComponent,
            canActivate: [UserRouteAccessService],
            data: { authorities: [Authority.LICENSEE] },
          },
          {
            path: 'payments',
            loadComponent: () => import('./supplyChain/payments/paymentconformationpage/payment-confirmation.component').then(m => m.PaymentConfirmationComponent),
            canActivate: [UserRouteAccessService],
            data: { authorities: [Authority.LICENSEE] },
          },
          {
            path: 'cancellation-request',
            loadComponent: () => import('./supplyChain/cancellation-request/cancellation-request.component').then(m => m.CancellationRequestComponent),
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
