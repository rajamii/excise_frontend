import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { UserRouteAccessService } from '../../../core/config/user-route-access.service';

const routes: Routes = [
  {
    path: 'hologram',
    loadComponent: () =>
      import('./hologram-details-view/hologram-details-view.component').then(
        (m) => m.HologramDetailsViewComponent
      ),
    canActivate: [UserRouteAccessService],
    data: {
      authorities: ['commissioner'],
    },
  },
  {
    path: 'payments',
    loadComponent: () =>
      import('./payment-slips-view/payment-slips-view.component').then(
        (m) => m.PaymentSlipsViewComponent
      ),
    canActivate: [UserRouteAccessService],
    data: {
      authorities: ['commissioner'],
    },
  },
  {
    path: 'daily-hologram-register',
    loadComponent: () =>
      import('./dailyhologramrecordregister/dailyhologramrecordregister.component').then(
        (m) => m.DailyhologramrecordregisterComponent
      ),
    canActivate: [UserRouteAccessService],
    data: {
      authorities: ['commissioner'],
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
export class CommissionerModule { }