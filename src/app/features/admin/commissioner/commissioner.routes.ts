import { Routes } from '@angular/router';

export const commissionerRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./commissioner-dashboard/commissioner-dashboard.component').then(m => m.CommissionerDashboardComponent),
    title: 'Commissioner Dashboard'
  }
];