import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { UserRouteAccessService } from '../../../core/config/user-route-access.service';

const routes: Routes = [
  {
    path: 'requisition',
    loadComponent: () =>
      import('./permit-section.component').then(
        (m) => m.PermitSectionComponent
      ),
    canActivate: [UserRouteAccessService],
    data: {
      requiredPermission: 'permit.requisition.view',
    },
  },
  {
    path: 'revalidation',
    loadComponent: () =>
      import('./permit-section.component').then(
        (m) => m.PermitSectionComponent
      ),
    canActivate: [UserRouteAccessService],
    data: {
      requiredPermission: 'permit.revalidation.view',
    },
  },
  {
    path: 'transit',
    loadComponent: () =>
      import('./permit-section.component').then(
        (m) => m.PermitSectionComponent
      ),
    canActivate: [UserRouteAccessService],
    data: {
      requiredPermission: 'permit.transit.view',
    },
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class PermitSectionModule { }
