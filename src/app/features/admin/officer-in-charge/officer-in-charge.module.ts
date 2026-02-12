import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { UserRouteAccessService } from '../../../core/config/user-route-access.service';

const routes: Routes = [
  {
    path: 'hologram',
    loadComponent: () =>
      import('./officer-in-charge.component').then(
        (m) => m.OfficerInChargeComponent
      ),
    canActivate: [UserRouteAccessService],
    data: {
      requiredPermission: 'officer.oic.hologram.view',
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
export class OfficerInChargeModule { }
