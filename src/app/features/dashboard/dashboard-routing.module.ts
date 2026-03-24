import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { RoleDashboardGuard } from '../../core/guards';
import { UnifiedLayoutComponent } from '../../shared/components/layout/unified-layout/unified-layout.component';
import { UserRouteAccessService } from '../../core/config/user-route-access.service';

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
      // {
      //   path: 'admin/districts',
      //   loadComponent: () =>
      //     import('../admin/master/district/list/list.component').then((m) => m.ListComponent),
      //   canActivate: [UserRouteAccessService],
      //   data: { authorities: [Authority.SITE_ADMIN] }
      // },
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
        path: 'admin/license-types',
        loadComponent: () =>
          import('../admin/master/license-type/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { requiredPermission: 'master.license_types.view' }
      },
      {
        path: 'admin/license-categories',
        loadComponent: () =>
          import('../admin/master/license-category/list/list.component').then((m) => m.ListComponent),
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
        path: 'admin/license-subcategories',
        loadComponent: () =>
          import('../admin/master/license-subcategory/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { requiredPermission: 'master.license_subcategories.view' }
      },
      {
        path: 'admin/roads',
        loadComponent: () =>
          import('../admin/master/road/list/list.component').then((m) => m.ListComponent),
        canActivate: [UserRouteAccessService],
        data: { requiredPermission: 'master.roads.view' }
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
      // ✅ COMMENTED OUT: District redirect (matches commented route above)
      // { path: 'districts', redirectTo: 'admin/districts', pathMatch: 'full' },
      { path: 'subdivisions', redirectTo: 'admin/subdivisions', pathMatch: 'full' },
      { path: 'police-stations', redirectTo: 'admin/police-stations', pathMatch: 'full' },
      { path: 'license-types', redirectTo: 'admin/license-types', pathMatch: 'full' },
      { path: 'license-categories', redirectTo: 'admin/license-categories', pathMatch: 'full' },
      { path: 'license-titles', redirectTo: 'admin/license-titles', pathMatch: 'full' },
      { path: 'license-subcategories', redirectTo: 'admin/license-subcategories', pathMatch: 'full' },
      { path: 'roads', redirectTo: 'admin/roads', pathMatch: 'full' },
      { path: 'oic', redirectTo: 'admin/oic', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }
