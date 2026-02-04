import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { RoleDashboardGuard } from '../../core/guards/role-dashboard.guard';
import { UnifiedLayoutComponent } from '../../shared/components/layout/unified-layout/unified-layout.component';

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
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }