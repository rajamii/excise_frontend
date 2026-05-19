import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../../shared/material.module';
import { MasterService } from '../../../../../../core/services/master.service';
import { AdminService } from '../../../../admin.service';
import { EnaBulkSpiritType } from '../../../../../../core/models/ena-bulk-spirit.model';
import { ManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-ena-bulk-spirit-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss',
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = ['bulkSpiritKindType', 'strength', 'priceBl', 'licenseId', 'actions'];
  rows: EnaBulkSpiritType[] = [];

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadRows();
  }

  loadRows(): void {
    this.masterService.getEnaBulkSpiritTypes().subscribe({
      next: (response: any) => {
        const data = Array.isArray(response) ? response : response?.data || [];
        this.rows = (data || []).map((item: any) => ({
          spritId: item?.spritId ?? item?.sprit_id,
          bulkSpiritKindType: String(item?.bulkSpiritKindType ?? item?.bulk_spirit_kind_type ?? '').trim(),
          strength: String(item?.strength ?? '').trim(),
          priceBl: Number(item?.priceBl ?? item?.price_bl ?? 0),
          licenseId: String(item?.licenseId ?? item?.license_id ?? '').trim() || null,
          createdAt: item?.createdAt ?? item?.created_at,
          updatedAt: item?.updatedAt ?? item?.updated_at,
        }));
      },
      error: () => Swal.fire('Error', 'Failed to load ENA bulk spirit types.', 'error'),
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, { width: '650px' });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadRows();
    });
  }

  onEdit(row: EnaBulkSpiritType): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '650px',
      data: { ...row },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadRows();
    });
  }

  onDelete(row: EnaBulkSpiritType): void {
    if (!row?.spritId) {
      Swal.fire('Error', 'Invalid bulk spirit record.', 'error');
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: `Delete bulk spirit type "${row.bulkSpiritKindType}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.adminService.deleteEnaBulkSpiritType(row.spritId as number).subscribe({
        next: () => {
          Swal.fire('Deleted!', 'Bulk spirit type deleted successfully.', 'success');
          this.loadRows();
        },
        error: () => Swal.fire('Error', 'Failed to delete bulk spirit type.', 'error'),
      });
    });
  }
}

