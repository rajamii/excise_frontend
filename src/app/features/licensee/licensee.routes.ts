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
          }, 
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