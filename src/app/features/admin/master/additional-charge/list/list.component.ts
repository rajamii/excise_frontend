import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { AdditionalChargeConfig } from '../../../../../core/models/additional-charge-config.model';
import { LicenseFee } from '../../../../../core/models/license-fee.model';
import { AdminService } from '../../../admin.service';
import { MasterService } from '../../../../../core/services/master.service';
import { ManageComponent } from '../manage/manage.component';
import { ManageLicenseFeeComponent } from '../manage-license-fee/manage-license-fee.component';

@Component({
  selector: 'app-additional-charge-list',
  standalone: true,
  imports: [MaterialModule, CommonModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  activeTab = 0;

  // Tab 0: Additional Charge Mappings
  displayedColumns: string[] = ['categoryName', 'chargeType', 'isActive', 'actions'];
  configs: AdditionalChargeConfig[] = [];

  // Tab 1: License Fees
  licenseFeeColumns: string[] = ['category', 'subcategory', 'location', 'fee', 'security', 'renewal', 'lateFee', 'status', 'actions'];
  licenseFees: LicenseFee[] = [];

  constructor(
    private adminService: AdminService,
    private masterService: MasterService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadConfigs();
    this.loadLicenseFees();
  }

  onTabChange(event: any): void {
    this.activeTab = event.index;
  }

  // ========================== Tab 0: Category Mapping configurations ==========================
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

  // ========================== Tab 1: License Fee configurations ==========================
  loadLicenseFees(): void {
    this.masterService.getLicenseFees().subscribe({
      next: (data: any) => (this.licenseFees = data),
      error: () => Swal.fire('Error', 'Failed to load license fees.', 'error')
    });
  }

  onAddLicenseFee(): void {
    const dialogRef = this.dialog.open(ManageLicenseFeeComponent, {
      width: '650px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadLicenseFees();
    });
  }

  onEditLicenseFee(fee: LicenseFee): void {
    const dialogRef = this.dialog.open(ManageLicenseFeeComponent, {
      width: '650px',
      data: fee
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadLicenseFees();
    });
  }

  onDeleteLicenseFee(fee: LicenseFee): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Deactivate license fee configuration?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Deactivate',
    }).then(result => {
      if (result.isConfirmed) {
        this.masterService.deleteLicenseFee(fee.id).subscribe({
          next: () => {
            Swal.fire('Deactivated!', 'License fee configuration deactivated.', 'success');
            this.loadLicenseFees();
          },
          error: () => Swal.fire('Error', 'Failed to deactivate license fee.', 'error')
        });
      }
    });
  }
}


