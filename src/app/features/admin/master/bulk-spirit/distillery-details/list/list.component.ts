import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../../shared/material.module';
import { MasterService } from '../../../../../../core/services/master.service';
import { AdminService } from '../../../../admin.service';
import { ActiveLicense } from '../../../../../../core/models/active-license.model';
import { EnaDistilleryDetail } from '../../../../../../core/models/ena-distillery.model';
import { ManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-ena-distillery-details-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss',
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = ['distilleryName', 'distilleryState', 'viaRoute', 'licenseeId', 'actions'];
  rows: EnaDistilleryDetail[] = [];

  private licenseNameMap = new Map<string, string>();

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadLicenseNames();
    this.loadRows();
  }

  private loadLicenseNames(): void {
    this.adminService.getActiveLicenses().subscribe({
      next: (licenses: ActiveLicense[]) => {
        this.licenseNameMap.clear();
        (Array.isArray(licenses) ? licenses : []).forEach(l => {
          const id = String(l.id || l.licenseeId || '').trim();
          if (id) this.licenseNameMap.set(id, l.establishmentName || id);
          const lid = String(l.licenseeId || '').trim();
          if (lid && lid !== id) this.licenseNameMap.set(lid, l.establishmentName || lid);
        });
      },
      error: () => {},
    });
  }

  getLicenseName(licenseeId?: string | null): string {
    if (!licenseeId) return '-';
    return this.licenseNameMap.get(licenseeId.trim()) || licenseeId;
  }

  loadRows(): void {
    this.masterService.getEnaDistilleries().subscribe({
      next: (response: any) => {
        const data = Array.isArray(response) ? response : response?.data || [];
        this.rows = (data || []).map((item: any) => ({
          id: item?.id,
          distilleryName: String(item?.distilleryName ?? item?.distillery_name ?? '').trim(),
          distilleryAddress: String(item?.distilleryAddress ?? item?.distillery_address ?? '').trim(),
          distilleryState: String(item?.distilleryState ?? item?.distillery_state ?? item?.state ?? '').trim(),
          viaRoute: String(item?.viaRoute ?? item?.via_route ?? '').trim(),
          licenseeId: String(item?.licenseeId ?? item?.licensee_id ?? '').trim() || null,
          createdAt: item?.createdAt ?? item?.created_at,
          updatedAt: item?.updatedAt ?? item?.updated_at,
        }));
      },
      error: () => Swal.fire('Error', 'Failed to load ENA distillery details.', 'error'),
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, { width: '700px' });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadRows();
    });
  }

  onEdit(row: EnaDistilleryDetail): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '700px',
      data: { ...row },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadRows();
    });
  }

  onDelete(row: EnaDistilleryDetail): void {
    if (!row?.id) {
      Swal.fire('Error', 'Invalid distillery record.', 'error');
      return;
    }
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete "${row.distilleryName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.adminService.deleteEnaDistilleryDetail(row.id as number).subscribe({
        next: () => {
          Swal.fire('Deleted!', 'Record deleted successfully.', 'success');
          this.loadRows();
        },
        error: () => Swal.fire('Error', 'Failed to delete distillery.', 'error'),
      });
    });
  }
}

