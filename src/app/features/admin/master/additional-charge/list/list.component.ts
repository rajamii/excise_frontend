import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { AdditionalChargeConfig } from '../../../../../core/models/additional-charge-config.model';
import { AdminService } from '../../../admin.service';
import { ManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-additional-charge-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = ['categoryName', 'chargeType', 'isActive', 'actions'];
  configs: AdditionalChargeConfig[] = [];

  constructor(
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadConfigs();
  }

  loadConfigs(): void {
    this.adminService.getAdditionalChargeConfigs().subscribe({
      next: (data) => this.configs = data,
      error: () => Swal.fire('Error', 'Failed to load additional charge configurations.', 'error')
    });
  }

  getChargeTypeDisplay(type: string): string {
    return type === 'pachwai' ? 'Pachwai' : 'Draught Beer';
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadConfigs();
    });
  }

  onEdit(config: AdditionalChargeConfig): void {
    const dialogRef = this.dialog.open(ManageComponent, {
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
      text: `Delete additional charge configuration for category "${config.categoryName}"?`,
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
