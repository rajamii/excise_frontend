import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { RoleDashboardGuard } from '../../core/guards';
import { UnifiedLayoutComponent } from '../../shared/components/layout/unified-layout/unified-layout.component';
import { UserRouteAccessService } from '../../core/config/user-route-access.service';
import { ListComponent as LicenseTermsListComponent } from '../admin/master/license-terms/list/list.component';

const routes: Routes = [
  {
    path: '',
    component: UnifiedLayoutComponent,
    canActivate: [RoleDashboardGuard],
    children: [
      {
        path: '',
        component: DashboardComponent,
        data: {
          title: 'Dashboard',
          description: 'Role-based unified dashboard'
        },
      },
      {
        path: 'wallet-recharge/success',
        loadComponent: () =>
          import('../licensee/supplyChain/payments/wallet-recharge-success/wallet-recharge-success.component').then(
            (m) => m.WalletRechargeSuccessComponent
          ),
        canActivate: [UserRouteAccessService],
        data: { requiredPermission: 'dashboard.view' }
      },
      {
        path: 'new-license/application-fee/receipt',
        loadComponent: () =>
          import('../licensee/apply-new-license/application-fee-receipt/application-fee-receipt.component').then(
            (m) => m.ApplicationFeeReceiptComponent
          ),
        canActivate: [UserRouteAccessService],
        data: { requiredPermission: 'dashboard.view' }
      },
      // Officer in charge: open hologram inventory/overview as a full page (not inside dashboard section card)
      {
        path: 'hologram-overview',
        loadComponent: () =>
          import('../licensee/supplyChain/HoloGram/hologramoveriew/hologramoveriew.component').then(
            (m) => m.HologramoveriewComponent,
          ),
        canActivate: [UserRouteAccessService],
        data: { requiredPermission: 'dashboard.view' },
      },
      // Site Admin master pages inside unified dashboard layout
      {
        path: 'admin/users',
        loadComponent: () =>
          import('../admin/master/user/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { requiredPermission: 'master.users.view' }
      },
      {
        path: 'admin/roles',
        loadComponent: () =>
          import('../admin/master/role/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { requiredPermission: 'master.roles.view' }
      },
      // ✅ COMMENTED OUT: District route causing compilation errors
      // Uncomment this once the district list component export issue is fixed
      {
        path: 'admin/districts',
        loadComponent: () =>
          import('../admin/master/district/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { requiredPermission: 'master.districts.view' }
      },
      {
        path: 'admin/subdivisions',
        loadComponent: () =>
          import('../admin/master/subdivision/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { requiredPermission: 'master.subdivisions.view' }
      },
      {
        path: 'admin/police-stations',
        loadComponent: () =>
          import('../admin/master/police-station/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { requiredPermission: 'master.police_stations.view' }
      },
      {
        path: 'admin/license-validity-period',
        loadComponent: () =>
          import('../admin/master/license-validity-period/license-validity-period.component').then((m) => m.LicenseValidityPeriodComponent),
        canActivate: [UserRouteAccessService],
        data: { authorities: ['site_admin'] }
      },
      {
        path: 'admin/license-types',
        loadComponent: () =>
          import('../admin/master/license-type/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { requiredPermission: 'master.license_types.view' }
      },
      {
        path: 'admin/license-categories',
        loadComponent: () =>
          import('../admin/master/license-subcategory/license-subcategory.component').then((m) => m.LicenseSubcategoryComponent),
        canActivate: [UserRouteAccessService],
        data: { requiredPermission: 'master.license_categories.view' }
      },
      {
        path: 'admin/license-subcategories',
        loadComponent: () =>
          import('../admin/master/license-subcategory/license-subcategory.component').then((m) => m.LicenseSubcategoryComponent),
        canActivate: [UserRouteAccessService],
        data: { requiredPermission: 'master.license_categories.view' }
      },
      {
        path: 'admin/additional-charges',
        loadComponent: () =>
          import('../admin/master/additional-charge/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { requiredPermission: 'master.license_categories.view' }
      },
      {
        path: 'admin/pachwai-excess',
        loadComponent: () =>
          import('../admin/master/pachwai-excess/list/list.component').then((m) => m.PachwaiExcessListComponent),
        canActivate: [UserRouteAccessService],
        data: { requiredPermission: 'master.license_categories.view' }
      },
      {
        path: 'admin/locations',
        loadComponent: () =>
          import('../admin/master/location/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { requiredPermission: 'master.license_categories.view' }
      },
      {
        path: 'admin/blocks-wards',
        loadComponent: () =>
          import('../admin/master/blocks-wards/blocks-wards.component').then((m) => m.BlocksWardsComponent),
        canActivate: [UserRouteAccessService],
        data: { requiredPermission: 'master.subdivisions.view' }
      },
      // Legacy redirects
      { path: 'admin/blocks',       redirectTo: 'admin/blocks-wards', pathMatch: 'full' },
      { path: 'admin/urban-wards',  redirectTo: 'admin/blocks-wards', pathMatch: 'full' },
      { path: 'admin/rural-wards',  redirectTo: 'admin/blocks-wards', pathMatch: 'full' },
      {
        path: 'admin/fixed-fees',
        loadComponent: () =>
          import('../admin/master/fixed-fee/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { requiredPermission: 'master.license_categories.view' }
      },
      {
        path: 'admin/dry-day-calendar',
        loadComponent: () =>
          import('../admin/master/dry-day-calendar/dry-day-calendar.component').then((m) => m.DryDayCalendarComponent),
        canActivate: [UserRouteAccessService],
        data: { requiredPermission: 'master.license_categories.view' }
      },
      {
        path: 'admin/license-titles',
        loadComponent: () =>
          import('../admin/master/license-title/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { requiredPermission: 'master.license_titles.view' }
      },
      {
        path: 'admin/license-terms',
        component: LicenseTermsListComponent,
        canActivate: [UserRouteAccessService],
        data: { authorities: ['site_admin'] }
      },
      {
        path: 'admin/roads',
        loadComponent: () =>
          import('../admin/master/road/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { requiredPermission: 'master.roads.view' }
      },
      {
        path: 'admin/whats-current',
        loadComponent: () =>
          import('../admin/master/whats-current/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { authorities: ['site_admin'] }
      },
      {
        path: 'admin/hologram-suppliers',
        loadComponent: () =>
          import('../admin/master/hologram-supplier/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { authorities: ['site_admin'] }
      },
      {
        path: 'admin/brand-owners',
        loadComponent: () =>
          import('../admin/master/brand-owner/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { authorities: ['site_admin'] }
      },
      {
        path: 'admin/company-details',
        loadComponent: () =>
          import('../admin/master/company-details/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { authorities: ['site_admin'] }
      },
      {
        path: 'admin/kinds-brands',
        loadComponent: () =>
          import('../admin/master/kinds-brands/kinds-brands.component').then((m) => m.KindsBrandsComponent),
        canActivate: [UserRouteAccessService],
        data: { authorities: ['site_admin'] }
      },
      {
        path: 'admin/hologram',
        redirectTo: 'admin/hologram/transit-permit-distributor-data',
        pathMatch: 'full'
      },
      {
        path: 'admin/hologram/transit-permit-distributor-data',
        loadComponent: () =>
          import('../admin/master/hologram/transit-permit-distributor-data/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { authorities: ['site_admin'] }
      },
      {
        path: 'admin/hologram/brand-ml-in-cases',
        loadComponent: () =>
          import('../admin/master/hologram/brand-ml-in-cases/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { authorities: ['site_admin'] }
      },
      {
        path: 'admin/brand-ml-in-cases',
        loadComponent: () =>
          import('../admin/master/hologram/brand-ml-in-cases/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { authorities: ['site_admin'] }
      },
      {
        path: 'admin/hologram/master-bottle-type',
        loadComponent: () =>
          import('../admin/master/hologram/master-bottle-type/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { authorities: ['site_admin'] }
      },
      {
        path: 'admin/hologram/master-liquor-type',
        loadComponent: () =>
          import('../admin/master/hologram/master-liquor-type/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { authorities: ['site_admin'] }
      },
      {
        path: 'admin/hologram/brands',
        loadComponent: () =>
          import('../admin/master/hologram/brands/brands.component').then((m) => m.BrandsComponent),
        canActivate: [UserRouteAccessService],
        data: { authorities: ['site_admin'] }
      },
      {
        path: 'admin/bulk-spirit',
        redirectTo: 'admin/bulk-spirit/ena-bulk-spirit',
        pathMatch: 'full'
      },
      {
        path: 'admin/bulk-spirit/ena-bulk-spirit',
        loadComponent: () =>
          import('../admin/master/bulk-spirit/ena-bulk-spirit/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { authorities: ['site_admin'] }
      },
      {
        path: 'admin/bulk-spirit/distillery-details',
        loadComponent: () =>
          import('../admin/master/bulk-spirit/distillery-details/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { authorities: ['site_admin'] }
      },
      {
        path: 'admin/bulk-spirit/ena-purpose-details',
        loadComponent: () =>
          import('../admin/master/bulk-spirit/ena-purpose-details/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { authorities: ['site_admin'] }
      },
      {
        path: 'admin/bulk-spirit/check-post-details',
        loadComponent: () =>
          import('../admin/master/bulk-spirit/check-post-details/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { authorities: ['site_admin'] }
      },
      {
        path: 'admin/about-us',
        redirectTo: 'admin/about-us/heads-of-organisations',
        pathMatch: 'full'
      },
      {
        path: 'admin/about-us/heads-of-organisations',
        loadComponent: () =>
          import('../admin/master/about-us/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { authorities: ['site_admin'], aboutUsCategory: 'headsOfOrganisations' }
      },
      {
        path: 'admin/about-us/excise-secretaries',
        loadComponent: () =>
          import('../admin/master/about-us/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { authorities: ['site_admin'], aboutUsCategory: 'exciseSecretaries' }
      },
      {
        path: 'admin/about-us/department-content',
        loadComponent: () =>
          import('../admin/master/about-us/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { authorities: ['site_admin'], aboutUsCategory: 'aboutUsText' }
      },
      {
        path: 'admin/preventive-raids',
        loadComponent: () =>
          import('../admin/master/preventive-raids/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { authorities: ['site_admin'] }
      },
      {
        path: 'admin/contact-us',
        redirectTo: 'admin/contact-us/nodal-officer',
        pathMatch: 'full'
      },
      {
        path: 'admin/contact-us/nodal-officer',
        loadComponent: () =>
          import('../admin/master/contact-us/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { authorities: ['site_admin'], contactUsCategory: 'nodalOfficer' }
      },
      {
        path: 'admin/contact-us/public-information-officers',
        loadComponent: () =>
          import('../admin/master/contact-us/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { authorities: ['site_admin'], contactUsCategory: 'publicInformationOfficer' }
      },
      {
        path: 'admin/contact-us/directorate-district-officials',
        loadComponent: () =>
          import('../admin/master/contact-us/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { authorities: ['site_admin'], contactUsCategory: 'directorateAndDistrictOfficials' }
      },
      {
        path: 'admin/contact-us/grievance-redressal-officer',
        loadComponent: () =>
          import('../admin/master/contact-us/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { authorities: ['site_admin'], contactUsCategory: 'grievanceRedressalOfficer' }
      },
      {
        path: 'admin/oic',
        loadComponent: () =>
          import('../admin/master/oic/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { requiredPermission: 'master.users.view' }
      },
      // Backward-compatible aliases for old paths under /dashboard/*
      { path: 'users', redirectTo: 'admin/users', pathMatch: 'full' },
      { path: 'roles', redirectTo: 'admin/roles', pathMatch: 'full' },
      { path: 'districts', redirectTo: 'admin/districts', pathMatch: 'full' },
      { path: 'subdivisions', redirectTo: 'admin/subdivisions', pathMatch: 'full' },
      { path: 'police-stations', redirectTo: 'admin/police-stations', pathMatch: 'full' },
      { path: 'license-validity-period', redirectTo: 'admin/license-validity-period', pathMatch: 'full' },
      { path: 'license-types', redirectTo: 'admin/license-types', pathMatch: 'full' },
      { path: 'license-categories', redirectTo: 'admin/license-categories', pathMatch: 'full' },
      { path: 'additional-charges', redirectTo: 'admin/additional-charges', pathMatch: 'full' },
      { path: 'license-titles', redirectTo: 'admin/license-titles', pathMatch: 'full' },
      { path: 'license-subcategories', redirectTo: 'admin/license-subcategories', pathMatch: 'full' },
      { path: 'license-terms', redirectTo: 'admin/license-terms', pathMatch: 'full' },
      { path: 'roads', redirectTo: 'admin/roads', pathMatch: 'full' },
      { path: 'hologram-suppliers', redirectTo: 'admin/hologram-suppliers', pathMatch: 'full' },
      { path: 'brand-ml-in-cases', redirectTo: 'admin/brand-ml-in-cases', pathMatch: 'full' },
      { path: 'about-us', redirectTo: 'admin/about-us', pathMatch: 'full' },
      { path: 'contact-us', redirectTo: 'admin/contact-us', pathMatch: 'full' },
      { path: 'oic', redirectTo: 'admin/oic', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }
