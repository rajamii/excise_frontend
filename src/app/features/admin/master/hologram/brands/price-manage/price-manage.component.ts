import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../../shared/material.module';
import { BrandWarehouse, BrandWarehouseService } from '../../../../../licensee/supplyChain/services/brand-warehouse.service';

@Component({
  selector: 'app-brand-warehouse-price-manage',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './price-manage.component.html',
  styleUrl: './price-manage.component.scss',
})
export class PriceManageComponent implements OnInit {
  row!: BrandWarehouse;

  constructor(
    private brandWarehouseService: BrandWarehouseService,
    public dialogRef: MatDialogRef<PriceManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { row: BrandWarehouse }
  ) {}

  ngOnInit(): void {
    this.row = { ...this.data.row };
  }

  onSave(): void {
    Swal.fire({
      title: 'Update prices?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Update',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (!result.isConfirmed) return;

      const payload: Partial<BrandWarehouse> = {
        ex_factory_price_rs_per_case: Number(this.row.ex_factory_price_rs_per_case ?? 0),
        excise_duty_rs_per_case: Number(this.row.excise_duty_rs_per_case ?? 0),
        education_cess_rs_per_case: Number(this.row.education_cess_rs_per_case ?? 0),
        additional_excise_duty_rs_per_case: Number(this.row.additional_excise_duty_rs_per_case ?? 0),
        additional_excise_duty_12_5_percent_rs_per_case: Number(this.row.additional_excise_duty_12_5_percent_rs_per_case ?? 0),
        mrp_rs_per_bottle: Number(this.row.mrp_rs_per_bottle ?? 0),
      };

      this.brandWarehouseService.patchBrandWarehouse(this.row.id as number, payload).subscribe({
        next: () => {
          Swal.fire('Success', 'Prices updated successfully.', 'success');
          this.dialogRef.close(true);
        },
        error: (err: any) => {
          const msg = err?.error?.detail || err?.error?.message || 'Failed to update prices.';
          Swal.fire('Error', msg, 'error');
        },
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

