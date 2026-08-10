import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { AdditionalChargeConfig } from '../../../../../core/models/additional-charge-config.model';
import { AdminService } from '../../../admin.service';
import { ManagePachwaiExcessComponent } from '../manage/manage.component';

@Component({
  selector: 'app-pachwai-excess-list',
  standalone: true,
  imports: [MaterialModule, CommonModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class PachwaiExcessListComponent implements OnInit {
  displayedColumns: string[] = ['categoryName', 'chargeType', 'isActive', 'actions'];

  // All configs from API
  allConfigs: AdditionalChargeConfig[] = [];

  // Filtered per tab
  get pachwaiDraughtConfigs(): AdditionalChargeConfig[] {
    return this.allConfigs.filter(c => c.chargeType === 'pachwai' || c.chargeType === 'draught_beer');
  }

  get miniBarConfigs(): AdditionalChargeConfig[] {
    return this.allConfigs.filter(c => c.chargeType === 'mini_bar');
  }

  // Active tab index: 0 = Pachwai & Draught Beer, 1 = Mini Bar
  activeTabIndex = 0;

  constructor(
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadConfigs();
  }

  loadConfigs(): void {
    this.adminService.getAdditionalChargeConfigs().subscribe({
      next: (data) => this.allConfigs = data,
      error: () => Swal.fire('Error', 'Failed to load configurations.', 'error')
    });
  }

  getChargeTypeDisplay(type: string): string {
    if (type === 'pachwai') return 'Pachwai';
    if (type === 'draught_beer') return 'Draught Beer';
    if (type === 'mini_bar') return 'Mini Bar';
    return type;
  }

  onAdd(): void {
    const defaultChargeType = this.activeTabIndex === 1 ? 'mini_bar' : 'pachwai';
    const dialogRef = this.dialog.open(ManagePachwaiExcessComponent, {
      width: '500px',
      data: { _defaultChargeType: defaultChargeType }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadConfigs();
    });
  }

  onEdit(config: AdditionalChargeConfig): void {
    const dialogRef = this.dialog.open(ManagePachwaiExcessComponent, {
      width: '500px',
      data: config
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadConfigs();
    });
  }

  onDelete(config: AdditionalChargeConfig): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete configuration for category "${config.categoryName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then(result => {
      if (result.isConfirmed && config.id !== undefined) {
        this.adminService.deleteAdditionalChargeConfig(config.id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Configuration deleted.', 'success');
            this.loadConfigs();
          },
          error: () => Swal.fire('Error', 'Failed to delete configuration.', 'error')
        });
      }
    });
  }
}
