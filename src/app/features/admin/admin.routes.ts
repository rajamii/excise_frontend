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
        loadComponent: () => import('./master/user/list/list.component').then(m => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'roles',
        loadComponent: () => import('./master/role/list/list.component').then(m => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'districts',
        loadComponent: () => import('./master/district/list/list.component').then(m => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'subdivisions',
        loadComponent: () => import('./master/subdivision/list/list.component').then(m => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'police-stations',
        loadComponent: () => import('./master/police-station/list/list.component').then(m => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'license-types',
        loadComponent: () => import('./master/license-type/list/list.component').then(m => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'license-categories',
        loadComponent: () => import('./master/license-category/list/list.component').then(m => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'license-subcategories',
        loadComponent: () => import('./master/license-subcategory/list/list.component').then(m => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'roads',
        loadComponent: () => import('./master/road/list/list.component').then(m => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'workflow',
        loadComponent: () => import('./master/workflow/list/list.component').then(m => m.WorkflowListComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'stages',
        loadComponent: () => import('./master/workflow/stages/list/list.component').then(m => m.WorkflowStageListComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'permissions',
        loadComponent: () => import('./master/workflow/permissions/list/list.component').then(m => m.StagePermissionListComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
      {
        path: 'transitions',
        loadComponent: () => import('./master/workflow/transitions/list/list.component').then(m => m.WorkflowTransitionListComponent),
        canActivate: [UserRouteAccessService],
        data: {
          authorities: [Authority.SITE_ADMIN]
        },
      },
    ],
  },
];

export default routes;