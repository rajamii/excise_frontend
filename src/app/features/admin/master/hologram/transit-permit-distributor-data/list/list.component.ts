import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../../shared/material.module';
import { TransitPermitDistributorData } from '../../../../../../core/models/transit-permit-distributor-data.model';
import { MasterService } from '../../../../../../core/services/master.service';
import { AdminService } from '../../../../admin.service';
import { ActiveLicense } from '../../../../../../core/models/active-license.model';
import { ManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-transit-permit-distributor-data-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss',
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = ['licenseId', 'distributorName', 'manufacturingUnit', 'depoAddress', 'actions'];
  rows: TransitPermitDistributorData[] = [];

  /** license_id → establishmentName */
  private licenseNameMap = new Map<string, string>();

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadLicenseNames();
    this.load();
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

  getLicenseName(licenseId?: string | null): string {
    if (!licenseId) return '—';
    return this.licenseNameMap.get(licenseId.trim()) || licenseId;
  }

  load(): void {
    this.masterService.getTransitPermitDistributorData().subscribe({
      next: (data: any) => {
        this.rows = Array.isArray(data) ? data : [];
      },
      error: () => Swal.fire('Error', 'Failed to load distributor data.', 'error'),
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, { width: '650px' });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.load();
    });
  }

  onEdit(row: TransitPermitDistributorData): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '650px',
      data: { ...row },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.load();
    });
  }

  onDelete(row: TransitPermitDistributorData): void {
    if (row?.id === undefined) {
      Swal.fire('Error', 'Invalid record.', 'error');
      return;
    }
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete distributor "${row.distributorName || ''}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.adminService.deleteTransitPermitDistributorData(row.id as number).subscribe({
        next: () => {
          Swal.fire('Deleted!', 'Distributor data deleted successfully.', 'success');
          this.load();
        },
        error: () => Swal.fire('Error', 'Failed to delete distributor data.', 'error'),
      });
    });
  }
}

