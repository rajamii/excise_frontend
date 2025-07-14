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
        path: 'users',
        loadComponent: () => import('./user/list/list.component').then(m => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'roles',
        loadComponent: () => import('./role/list/list.component').then(m => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'districts',
        loadComponent: () => import('./district/list/list.component').then(m => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'subdivisions',
        loadComponent: () => import('./subdivision/list/list.component').then(m => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'police-stations',
        loadComponent: () => import('./police-station/list/list.component').then(m => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'license-types',
        loadComponent: () => import('./license-type/list/list.component').then(m => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'license-categories',
        loadComponent: () => import('./license-category/list/list.component').then(m => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'license-titles',
        loadComponent: () => import('./license-title/list/list.component').then(m => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'license-subcategories',
        loadComponent: () => import('./license-subcategory/list/list.component').then(m => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'roads',
        loadComponent: () => import('./road/list/list.component').then(m => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
    ],
  },
];

export default routes;
