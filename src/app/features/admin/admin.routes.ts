import { Routes } from '@angular/router';
import { UserRouteAccessService } from '../../core/config/user-route-access.service';
import { Authority } from '../../shared/constants/authority.enum';

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
          authorities: [Authority.COMMISSIONER],
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
          authorities: [Authority.IT_CELL],
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
          authorities: [Authority.OFFICER_IN_CHARGE],
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
          authorities: [Authority.PERMIT_SECTION],
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
              authorities: [Authority.SITE_ADMIN, Authority.IT_CELL],
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
              authorities: [Authority.SITE_ADMIN],
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
              authorities: [Authority.SITE_ADMIN],
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
              authorities: [Authority.SITE_ADMIN],
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
              authorities: [Authority.SITE_ADMIN],
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
              authorities: [Authority.SITE_ADMIN],
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
              authorities: [Authority.SITE_ADMIN],
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
              authorities: [Authority.SITE_ADMIN],
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
              authorities: [Authority.SITE_ADMIN],
            },
          },
        ]
      },
    ],
  },
];

export default routes;