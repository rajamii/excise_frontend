import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { AdditionalChargeConfig } from '../../../../../core/models/additional-charge-config.model';
import { PaymentModule } from '../../../../../core/models/payment-module.model';
import { AdminService } from '../../../admin.service';
import { ManageComponent } from '../manage/manage.component';
import { ManagePaymentModuleComponent } from '../manage-payment-module/manage-payment-module.component';

@Component({
  selector: 'app-additional-charge-list',
  standalone: true,
  imports: [MaterialModule, CommonModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = ['categoryName', 'chargeType', 'isActive', 'actions'];
  configs: AdditionalChargeConfig[] = [];

  paymentModuleColumns: string[] = ['moduleCode', 'moduleDesc', 'licenseFee', 'visibilityStatus', 'actions'];
  paymentModules: PaymentModule[] = [];

  constructor(
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadConfigs();
    this.loadPaymentModules();
  }

  loadConfigs(): void {
    this.adminService.getAdditionalChargeConfigs().subscribe({
      next: (data) => this.configs = data,
      error: () => Swal.fire('Error', 'Failed to load additional charge configurations.', 'error')
    });
  }

  loadPaymentModules(): void {
    this.adminService.getPaymentModules().subscribe({
      next: (data) => this.paymentModules = data,
      error: () => Swal.fire('Error', 'Failed to load payment modules.', 'error')
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

  // ========================== Master Payment Module CRUD Handlers ==========================

  onAddPaymentModule(): void {
    const dialogRef = this.dialog.open(ManagePaymentModuleComponent, {
      width: '500px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadPaymentModules();
    });
  }

  onEditPaymentModule(module: PaymentModule): void {
    const dialogRef = this.dialog.open(ManagePaymentModuleComponent, {
      width: '500px',
      data: module
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadPaymentModules();
    });
  }

  onDeletePaymentModule(module: PaymentModule): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete payment module "${module.moduleDesc}" (${module.moduleCode})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then(result => {
      if (result.isConfirmed) {
        this.adminService.deletePaymentModule(module.moduleCode).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Payment module deleted.', 'success');
            this.loadPaymentModules();
          },
          error: () => Swal.fire('Error', 'Failed to delete payment module.', 'error')
        });
      }
    });
  }
}

