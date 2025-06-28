import { Routes } from '@angular/router';
import { UserRouteAccessService } from '../../core/config/user-route-access.service';
import { Authority } from '../../shared/constants/authority.enum';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home.component').then(m => m.HomeComponent),
    canActivate: [UserRouteAccessService],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [
            Authority.SITE_ADMIN, 
            Authority.LEVEL_1, 
            Authority.LEVEL_2,
            Authority.LEVEL_3, 
            Authority.LEVEL_4, 
            Authority.LEVEL_5, 
          ]
        }, 
      },
      {
        path: 'district/new',
        loadComponent: () => import('./add-district/add-district.component').then(m => m.AddDistrictComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'districts',
        loadComponent: () => import('./list-district/list-district.component').then(m => m.ListDistrictComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'subdivision/new',
        loadComponent: () => import('./add-subdivision/add-subdivision.component').then(m => m.AddSubdivisionComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'subdivisions',
        loadComponent: () => import('./list-subdivision/list-subdivision.component').then(m => m.ListSubdivisionComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'user/new',
        loadComponent: () => import('./add-user/add-user.component').then(m => m.AddUserComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'users',
        loadComponent: () => import('./list-user/list-user.component').then(m => m.ListUserComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'police-station/new',
        loadComponent: () => import('./add-policestation/add-policestation.component').then(m => m.AddPolicestationComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'police-stations',
        loadComponent: () => import('./list-policestation/list-policestation.component').then(m => m.ListPolicestationComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'license-type/new',
        loadComponent: () => import('./add-licensetype/add-licensetype.component').then(m => m.AddLicensetypeComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'license-types',
        loadComponent: () => import('./list-licensetype/list-licensetype.component').then(m => m.ListLicensetypeComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'license-category/new',
        loadComponent: () => import('./add-licensecategory/add-licensecategory.component').then(m => m.AddLicensecategoryComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'license-categories',
        loadComponent: () => import('./list-licensecategory/list-licensecategory.component').then(m => m.ListLicensecategoryComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
    ],
  },
];

export default routes;
