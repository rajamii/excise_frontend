import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../../shared/material.module';
import { MasterService } from '../../../../../../core/services/master.service';
import { AdminService } from '../../../../admin.service';
import { EnaBulkSpiritType } from '../../../../../../core/models/ena-bulk-spirit.model';
import { ManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-ena-bulk-spirit-details-dialog',
  standalone: true,
  imports: [MaterialModule],
  template: `
    <div class="dialog-wrapper">
      <h2 mat-dialog-title>
        <mat-icon class="title-icon">water_drop</mat-icon>
        Bulk Spirits: {{ data.licenseName }}
      </h2>

      <div mat-dialog-content class="dialog-content-inner">
        <div class="table-container">
          <table class="details-table">
            <thead>
              <tr>
                <th>Bulk Spirit Type</th>
                <th>Strength</th>
                <th>Price / BL</th>
                <th style="text-align: right; padding-right: 28px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of data.spirits">
                <td class="spirit-name">{{ row.bulkSpiritKindType }}</td>
                <td class="spirit-strength">{{ row.strength }}</td>
                <td>
                  <span class="spirit-price">₹{{ row.priceBl }}</span>
                </td>
                <td>
                  <div class="action-btn-group">
                    <button mat-icon-button class="btn-action-edit" (click)="onEdit(row)" matTooltip="Edit">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button class="btn-action-delete" (click)="onDelete(row)" matTooltip="Delete">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div mat-dialog-actions class="dialog-actions">
        <button class="btn-close" (click)="onClose()">Close</button>
      </div>
    </div>
  `,
  styleUrl: './details-dialog.component.scss'
})
export class DetailsDialogComponent implements OnInit {
  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<DetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { licenseName: string, licenseId: string | null, spirits: EnaBulkSpiritType[] }
  ) {}

  ngOnInit(): void {
    if (!this.data.spirits) {
      this.data.spirits = [];
    }
  }

  onClose(): void {
    this.dialogRef.close(true);
  }

  loadSpirits(): void {
    this.masterService.getEnaBulkSpiritTypes().subscribe({
      next: (response: any) => {
        const data = Array.isArray(response) ? response : response?.data || [];
        const flatRows: EnaBulkSpiritType[] = (data || []).map((item: any) => ({
          spritId: item?.spritId ?? item?.sprit_id,
          bulkSpiritKindType: String(item?.bulkSpiritKindType ?? item?.bulk_spirit_kind_type ?? '').trim(),
          strength: String(item?.strength ?? '').trim(),
          priceBl: Number(item?.priceBl ?? item?.price_bl ?? 0),
          licenseId: String(item?.licenseId ?? item?.license_id ?? '').trim() || null,
        }));
        this.data.spirits = flatRows.filter((r: EnaBulkSpiritType) => r.licenseId === this.data.licenseId);
        if (this.data.spirits.length === 0) {
          this.dialogRef.close(true);
        }
      }
    });
  }

  onEdit(row: EnaBulkSpiritType): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '650px',
      data: { ...row },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadSpirits();
      }
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
          this.loadSpirits();
        },
        error: () => Swal.fire('Error', 'Failed to delete bulk spirit type.', 'error'),
      });
    });
  }
}
