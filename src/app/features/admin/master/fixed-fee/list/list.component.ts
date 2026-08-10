import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { FixedFee } from '../../../../../core/models/fixed-fee.model';
import { MasterService } from '../../../../../core/services/master.service';
import { ManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-fixed-fee-list',
  standalone: true,
  imports: [MaterialModule, CommonModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = ['feeCode', 'feeDesc', 'licenseCategoryName', 'licenseSubcategoryName', 'mode', 'feeType', 'amount', 'status', 'actions'];
  fixedFees: FixedFee[] = [];

  constructor(
    private masterService: MasterService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadFixedFees();
  }

  loadFixedFees(): void {
    this.masterService.getFixedFees().subscribe({
      next: (data: any) => {
        // Map any snake_case properties if returned
        this.fixedFees = data.map((item: any) => ({
          feeCode: item.feeCode || item.fee_code,
          feeDesc: item.feeDesc || item.fee_desc,
          amount: item.amount,
          isActive: item.isActive !== undefined ? item.isActive : item.is_active,
          createdDate: item.createdDate || item.created_date,
          modifiedDate: item.modifiedDate || item.modified_date,
          licenseCategory: item.licenseCategory !== undefined ? item.licenseCategory : item.license_category,
          licenseSubcategory: item.licenseSubcategory !== undefined ? item.licenseSubcategory : item.license_subcategory,
          mode: item.mode,
          feeType: item.feeType || item.fee_type,
          licenseCategoryName: item.licenseCategoryName || item.license_category_name,
          licenseSubcategoryName: item.licenseSubcategoryName || item.license_subcategory_name
        }));
      },
      error: () => Swal.fire('Error', 'Failed to load fixed service fees.', 'error')
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
      data: null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadFixedFees();
    });
  }

  onEdit(fee: FixedFee): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
      data: fee
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadFixedFees();
    });
  }

  onDelete(fee: FixedFee): void {
    Swal.fire({
      title: 'Delete Config?',
      text: `Are you sure you want to delete config "${fee.feeDesc}" (${fee.feeCode})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      this.masterService.deleteFixedFee(fee.feeCode).subscribe({
        next: () => {
          Swal.fire('Deleted!', 'Configuration deleted successfully.', 'success');
          this.loadFixedFees();
        },
        error: () => Swal.fire('Error', 'Failed to delete configuration.', 'error')
      });
    });
  }
}
