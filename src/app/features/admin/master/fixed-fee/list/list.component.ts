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
  displayedColumns: string[] = ['feeCode', 'feeDesc', 'amount', 'status', 'actions'];
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
          modifiedDate: item.modifiedDate || item.modified_date
        }));
      },
      error: () => Swal.fire('Error', 'Failed to load fixed service fees.', 'error')
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
}
