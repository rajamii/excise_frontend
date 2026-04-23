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
      requiredPermission: 'officer.commissioner.hologram.view',
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
      requiredPermission: 'officer.commissioner.payments.view',
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
      requiredPermission: 'officer.commissioner.daily_hologram.view',
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
