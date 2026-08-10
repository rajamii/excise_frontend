import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { FixedFee } from '../../../../../core/models/fixed-fee.model';
import { MasterService } from '../../../../../core/services/master.service';
import { ManageComponent } from '../manage/manage.component';

interface DryDayGroup {
  categoryName: string;
  subcategoryName: string;
  fees: FixedFee[];
}

@Component({
  selector: 'app-fixed-fee-list',
  standalone: true,
  imports: [MaterialModule, CommonModule, FormsModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  // ── All Fees tab ────────────────────────────────────────────────────────────
  displayedColumns: string[] = [
    'feeCode', 'feeDesc', 'licenseCategoryName', 'licenseSubcategoryName',
    'mode', 'feeType', 'amount', 'status', 'actions'
  ];
  fixedFees: FixedFee[] = [];
  allFeeSearch = '';

  // ── Dry Day Permit tab ──────────────────────────────────────────────────────
  dryDayFees: FixedFee[] = [];
  dryDayGroups: DryDayGroup[] = [];
  dryDayColumns: string[] = ['feeCode', 'subcategoryName', 'mode', 'feeType', 'amount', 'status', 'actions'];

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
        this.fixedFees = data.map((item: any) => ({
          feeCode:              item.feeCode              ?? item.fee_code,
          feeDesc:              item.feeDesc              ?? item.fee_desc,
          amount:               item.amount,
          isActive:             item.isActive             ?? item.is_active,
          createdDate:          item.createdDate          ?? item.created_date,
          modifiedDate:         item.modifiedDate         ?? item.modified_date,
          licenseCategory:      item.licenseCategory      ?? item.license_category,
          licenseSubcategory:   item.licenseSubcategory   ?? item.license_subcategory,
          mode:                 item.mode,
          feeType:              item.feeType              ?? item.fee_type,
          licenseCategoryName:  item.licenseCategoryName  ?? item.license_category_name,
          licenseSubcategoryName: item.licenseSubcategoryName ?? item.license_subcategory_name,
        }));
        this.buildDryDayGroups();
      },
      error: () => Swal.fire('Error', 'Failed to load fixed service fees.', 'error')
    });
  }

  // ── Dry Day grouping ────────────────────────────────────────────────────────
  private buildDryDayGroups(): void {
    // Include fees that: have a feeType (per_day/per_annum) OR code starts with DRY_DAY
    this.dryDayFees = this.fixedFees.filter(f =>
      f.feeType === 'per_day' ||
      f.feeType === 'per_annum' ||
      (f.feeCode ?? '').toUpperCase().startsWith('DRY_DAY')
    );

    const map = new Map<string, DryDayGroup>();
    for (const fee of this.dryDayFees) {
      const catName = fee.licenseCategoryName || '—';
      const subName = fee.licenseSubcategoryName || '—';
      const key = `${catName}|||${subName}`;
      if (!map.has(key)) {
        map.set(key, { categoryName: catName, subcategoryName: subName, fees: [] });
      }
      map.get(key)!.fees.push(fee);
    }
    this.dryDayGroups = Array.from(map.values());
  }

  get filteredFees(): FixedFee[] {
    const q = this.allFeeSearch.toLowerCase().trim();
    // Exclude all dry day fees (those with feeType set OR code starting with DRY_DAY)
    const nonDryDay = this.fixedFees.filter(f =>
      !f.feeType && !(f.feeCode ?? '').toUpperCase().startsWith('DRY_DAY')
    );
    if (!q) return nonDryDay;
    return nonDryDay.filter(f =>
      (f.feeCode ?? '').toLowerCase().includes(q) ||
      (f.feeDesc ?? '').toLowerCase().includes(q) ||
      (f.licenseCategoryName ?? '').toLowerCase().includes(q) ||
      (f.licenseSubcategoryName ?? '').toLowerCase().includes(q)
    );
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────
  onAdd(): void {
    this.dialog.open(ManageComponent, { width: '500px', data: null })
      .afterClosed().subscribe(r => { if (r) this.loadFixedFees(); });
  }

  onEdit(fee: FixedFee): void {
    this.dialog.open(ManageComponent, { width: '500px', data: fee })
      .afterClosed().subscribe(r => { if (r) this.loadFixedFees(); });
  }

  onDelete(fee: FixedFee): void {
    Swal.fire({
      title: 'Delete Config?',
      text: `Delete "${fee.feeDesc}" (${fee.feeCode})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.masterService.deleteFixedFee(fee.feeCode).subscribe({
        next: () => { Swal.fire('Deleted!', 'Configuration deleted.', 'success'); this.loadFixedFees(); },
        error: () => Swal.fire('Error', 'Failed to delete configuration.', 'error')
      });
    });
  }
}
