import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { LicenseFee } from '../../../../../core/models/license-fee.model';
import { MasterService } from '../../../../../core/services/master.service';
import { ManageLicenseFeeComponent } from '../manage-license-fee/manage-license-fee.component';

@Component({
  selector: 'app-additional-charge-list',
  standalone: true,
  imports: [MaterialModule, CommonModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  licenseFeeColumns: string[] = ['category', 'subcategory', 'location', 'fee', 'security', 'renewal', 'lateFee', 'status', 'actions'];
  licenseFees: LicenseFee[] = [];

  constructor(
    private masterService: MasterService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadLicenseFees();
  }

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
