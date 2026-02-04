import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { UserRouteAccessService } from '../../../core/config/user-route-access.service';

const routes: Routes = [
  {
    path: 'monitor',
    loadComponent: () =>
      import('./itcell.component').then(
        (m) => m.ITCELLComponent
      ),
    canActivate: [UserRouteAccessService],
    data: {
      authorities: ['it_cell'],
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
export class ItCellModule { }