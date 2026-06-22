import { Routes } from '@angular/router';
import { UserRouteAccessService } from '../../core/config/user-route-access.service';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./home/home.component').then((m) => m.HomeComponent),
    canActivate: [UserRouteAccessService],
    children: [
      // OFFICER MODULES (MOVED FROM LICENSEE)
      {
        path: 'commissioner',
        loadChildren: () =>
          import('./commissioner/commissioner.module').then(
            (m) => m.CommissionerModule
          ),
        canActivate: [UserRouteAccessService],
        data: {
          requiredPermission: 'officer.commissioner.view',
        },
      },
      {
        path: 'it-cell',
        loadChildren: () =>
          import('./it-cell/it-cell.module').then(
            (m) => m.ItCellModule
          ),
        canActivate: [UserRouteAccessService],
        data: {
          requiredPermission: 'officer.itcell.view',
        },
      },
      {
        path: 'officer-in-charge',
        loadChildren: () =>
          import('./officer-in-charge/officer-in-charge.module').then(
            (m) => m.OfficerInChargeModule
          ),
        canActivate: [UserRouteAccessService],
        data: {
          requiredPermission: 'officer.oic.view',
        },
      },
      {
        path: 'permit-section',
        loadChildren: () =>
          import('./permit-section/permit-section.module').then(
            (m) => m.PermitSectionModule
          ),
        canActivate: [UserRouteAccessService],
        data: {
          requiredPermission: 'officer.permit_section.view',
        },
      },
      // MASTER DATA ROUTES
      {
        path: 'master',
        children: [
          {
            path: 'users',
            loadComponent: () =>
              import('./master/user/list/list.component').then(
                (m) => m.ListComponent
              ),
            canActivate: [UserRouteAccessService],
            data: {
              requiredPermission: 'master.users.view',
            },
          },
          {
            path: 'roles',
            loadComponent: () =>
              import('./master/role/list/list.component').then(
                (m) => m.ListComponent
              ),
            canActivate: [UserRouteAccessService],
            data: {
              requiredPermission: 'master.roles.view',
            },
          },
          // ✅ COMMENTED OUT: District route causing compilation errors
          // Uncomment this once the district list component export issue is fixed
          // {
          //   path: 'districts',
          //   loadComponent: () =>
          //     import('./master/district/list/list.component').then(
          //       (m) => m.ListComponent
          //     ),
          //   canActivate: [UserRouteAccessService],
          //   data: {
          //     authorities: [Authority.SITE_ADMIN],
          //   },
          // },
          {
            path: 'subdivisions',
            loadComponent: () =>
              import('./master/subdivision/list/list.component').then(
                (m) => m.ListComponent
              ),
            canActivate: [UserRouteAccessService],
            data: {
              requiredPermission: 'master.subdivisions.view',
            },
          },
          {
            path: 'police-stations',
            loadComponent: () =>
              import('./master/police-station/list/list.component').then(
                (m) => m.ListComponent
              ),
            canActivate: [UserRouteAccessService],
            data: {
              requiredPermission: 'master.police_stations.view',
            },
          },
          {
            path: 'license-types',
            loadComponent: () =>
              import('./master/license-type/list/list.component').then(
                (m) => m.ListComponent
              ),
            canActivate: [UserRouteAccessService],
            data: {
              requiredPermission: 'master.license_types.view',
            },
          },
          {
            path: 'license-categories',
            loadComponent: () =>
              import('./master/license-category/list/list.component').then(
                (m) => m.ListComponent
              ),
            canActivate: [UserRouteAccessService],
            data: {
              requiredPermission: 'master.license_categories.view',
            },
          },
          {
            path: 'additional-charges',
            loadComponent: () =>
              import('./master/additional-charge/list/list.component').then(
                (m) => m.ListComponent
              ),
            canActivate: [UserRouteAccessService],
            data: {
              requiredPermission: 'master.license_categories.view',
            },
          },
          {
            path: 'locations',
            loadComponent: () =>
              import('./master/location/list/list.component').then(
                (m) => m.ListComponent
              ),
            canActivate: [UserRouteAccessService],
            data: {
              requiredPermission: 'master.license_categories.view',
            },
          },
          {
            path: 'fixed-fees',
            loadComponent: () =>
              import('./master/fixed-fee/list/list.component').then(
                (m) => m.ListComponent
              ),
            canActivate: [UserRouteAccessService],
            data: {
              requiredPermission: 'master.license_categories.view',
            },
          },
          {
            path: 'license-titles',
            loadComponent: () =>
              import('./master/license-title/list/list.component').then(
                (m) => m.ListComponent
              ),
            canActivate: [UserRouteAccessService],
            data: {
              requiredPermission: 'master.license_titles.view',
            },
          },
          {
            path: 'license-subcategories',
            loadComponent: () =>
              import('./master/license-subcategory/list/list.component').then(
                (m) => m.ListComponent
              ),
            canActivate: [UserRouteAccessService],
            data: {
              requiredPermission: 'master.license_subcategories.view',
            },
          },
          {
            path: 'roads',
            loadComponent: () =>
              import('./master/road/list/list.component').then(
                (m) => m.ListComponent
              ),
            canActivate: [UserRouteAccessService],
            data: {
              requiredPermission: 'master.roads.view',
            },
          },
          {
            path: 'whats-current',
            loadComponent: () =>
              import('./master/whats-current/list/list.component').then(
                (m) => m.ListComponent
              ),
            canActivate: [UserRouteAccessService],
            data: {
              requiredPermission: 'master.license_categories.view',
            },
          },
          {
            path: 'hologram-suppliers',
            loadComponent: () =>
              import('./master/hologram-supplier/list/list.component').then(
                (m) => m.ListComponent
              ),
            canActivate: [UserRouteAccessService],
            data: { authorities: ['site_admin'] },
          },
          {
            path: 'hologram',
            redirectTo: 'hologram/transit-permit-distributor-data',
            pathMatch: 'full',
          },
          {
            path: 'hologram/transit-permit-distributor-data',
            loadComponent: () =>
              import(
                './master/hologram/transit-permit-distributor-data/list/list.component'
              ).then((m) => m.ListComponent),
            canActivate: [UserRouteAccessService],
            data: { authorities: ['site_admin'] },
          },
          {
            path: 'hologram/brand-ml-in-cases',
            loadComponent: () =>
              import('./master/hologram/brand-ml-in-cases/list/list.component').then(
                (m) => m.ListComponent
              ),
            canActivate: [UserRouteAccessService],
            data: { authorities: ['site_admin'] },
          },
          {
            path: 'brand-ml-in-cases',
            loadComponent: () =>
              import('./master/hologram/brand-ml-in-cases/list/list.component').then(
                (m) => m.ListComponent
              ),
            canActivate: [UserRouteAccessService],
            data: { authorities: ['site_admin'] },
          },
          {
            path: 'hologram/master-bottle-type',
            loadComponent: () =>
              import('./master/hologram/master-bottle-type/list/list.component').then(
                (m) => m.ListComponent
              ),
            canActivate: [UserRouteAccessService],
            data: { authorities: ['site_admin'] },
          },
          {
            path: 'hologram/master-liquor-type',
            loadComponent: () =>
              import('./master/hologram/master-liquor-type/list/list.component').then(
                (m) => m.ListComponent
              ),
            canActivate: [UserRouteAccessService],
            data: { authorities: ['site_admin'] },
          },
          {
            path: 'hologram/brands',
            loadComponent: () =>
              import('./master/hologram/brands/brands.component').then((m) => m.BrandsComponent),
            canActivate: [UserRouteAccessService],
            data: { authorities: ['site_admin'] },
          },
          {
            path: 'about-us',
            redirectTo: 'about-us/heads-of-organisations',
            pathMatch: 'full'
          },
          {
            path: 'about-us/heads-of-organisations',
            loadComponent: () =>
              import('./master/about-us/list/list.component').then(
                (m) => m.ListComponent
              ),
            canActivate: [UserRouteAccessService],
            data: {
              authorities: ['site_admin'],
              aboutUsCategory: 'headsOfOrganisations',
            },
          },
          {
            path: 'about-us/excise-secretaries',
            loadComponent: () =>
              import('./master/about-us/list/list.component').then(
                (m) => m.ListComponent
              ),
            canActivate: [UserRouteAccessService],
            data: {
              authorities: ['site_admin'],
              aboutUsCategory: 'exciseSecretaries',
            },
          },
          {
            path: 'contact-us',
            redirectTo: 'contact-us/nodal-officer',
            pathMatch: 'full'
          },
          {
            path: 'contact-us/nodal-officer',
            loadComponent: () =>
              import('./master/contact-us/list/list.component').then(
                (m) => m.ListComponent
              ),
            canActivate: [UserRouteAccessService],
            data: {
              authorities: ['site_admin'],
              contactUsCategory: 'nodalOfficer',
            },
          },
          {
            path: 'contact-us/public-information-officers',
            loadComponent: () =>
              import('./master/contact-us/list/list.component').then(
                (m) => m.ListComponent
              ),
            canActivate: [UserRouteAccessService],
            data: {
              authorities: ['site_admin'],
              contactUsCategory: 'publicInformationOfficer',
            },
          },
          {
            path: 'contact-us/directorate-district-officials',
            loadComponent: () =>
              import('./master/contact-us/list/list.component').then(
                (m) => m.ListComponent
              ),
            canActivate: [UserRouteAccessService],
            data: {
              authorities: ['site_admin'],
              contactUsCategory: 'directorateAndDistrictOfficials',
            },
          },
          {
            path: 'contact-us/grievance-redressal-officer',
            loadComponent: () =>
              import('./master/contact-us/list/list.component').then(
                (m) => m.ListComponent
              ),
            canActivate: [UserRouteAccessService],
            data: {
              authorities: ['site_admin'],
              contactUsCategory: 'grievanceRedressalOfficer',
            },
          },
          {
            path: 'license-validity-period',
            loadComponent: () =>
              import('./master/license-validity-period/license-validity-period.component').then(
                (m) => m.LicenseValidityPeriodComponent
              ),
            canActivate: [UserRouteAccessService],
            data: {
              authorities: ['site_admin'],
            },
          },
        ]
      },
    ],
  },
];

export default routes;
