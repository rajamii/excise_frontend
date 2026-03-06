import { Routes } from '@angular/router';

export const licenseeRoutes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () => import('./licensee-home/licensee-home.component').then(m => m.LicenseeHomeComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./licensee-dashboard/licensee-dashboard.component').then(m => m.LicenseeDashboardComponent)
  },
  {
    path: 'apply-license',
    loadComponent: () => import('./apply-license/apply-license.component').then(m => m.ApplyLicenseComponent)
  },
  {
    path: 'apply-new-license',
    loadComponent: () => import('./apply-new-license/apply-new-license.component').then(m => m.ApplyNewLicenseComponent)
  },
  {
    path: 'supply-chain',
    children: [
      {
        path: 'requisition',
        loadComponent: () => import('./supplyChain/supplychaincomponents/requisition/requisition.component').then(m => m.RequisitionComponent)
      },
      {
        path: 'revalidation',
        loadComponent: () => import('./supplyChain/supplychaincomponents/revalidation/revalidation.component').then(m => m.RevalidationComponent)
      },
      {
        path: 'cancellation',
        loadComponent: () => import('./supplyChain/supplychaincomponents/cancellation/cancellation.component').then(m => m.CancellationComponent)
      },
      {
        path: 'transit',
        loadComponent: () => import('./supplyChain/supplychaincomponents/transit/transit.component').then(m => m.TransitComponent)
      },
      {
        path: 'transit-permit',
        loadComponent: () => import('./supplyChain/transit-permit/transit-permit.component').then(m => m.TransitPermitComponent)
      },
      {
        path: 'import-permit',
        loadComponent: () => import('./supplyChain/import-permit/import-permit.component').then(m => m.ImportPermitComponent)
      },
      {
        path: 'hologram',
        loadComponent: () => import('./supplyChain/HoloGram/hologram/hologram.component').then(m => m.HologramComponent)
      }
    ]
  },
  {
    path: 'company/prepare-application',
    loadComponent: () => import('./registration-section-redirect/registration-section-redirect.component').then(m => m.RegistrationSectionRedirectComponent),
    data: { section: 'company-registration' }
  },
  {
    path: 'company-collaboration/prepare-application',
    loadComponent: () => import('./registration-section-redirect/registration-section-redirect.component').then(m => m.RegistrationSectionRedirectComponent),
    data: { section: 'company-collaboration' }
  },
  {
    path: 'salesman-barman/prepare-application',
    loadComponent: () => import('./registration-section-redirect/registration-section-redirect.component').then(m => m.RegistrationSectionRedirectComponent),
    data: { section: 'salesman-barman-registration' }
  },
  {
    path: 'label/prepare-application',
    loadComponent: () => import('./registration-section-redirect/registration-section-redirect.component').then(m => m.RegistrationSectionRedirectComponent),
    data: { section: 'label-registration' }
  }
];

export default licenseeRoutes;
