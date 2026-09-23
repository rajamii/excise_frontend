import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../../shared/material.module';
import { MasterService } from '../../../../../../core/services/master.service';
import { AdminService } from '../../../../admin.service';
import { ActiveLicense } from '../../../../../../core/models/active-license.model';
import { EnaDistilleryDetail } from '../../../../../../core/models/ena-distillery.model';
import { ManageComponent } from '../manage/manage.component';

export interface LicenseOption {
  id: string;
  name: string;
}

@Component({
  selector: 'app-ena-distillery-details-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss',
})
export class ListComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = ['distilleryName', 'distilleryAddress', 'distilleryState', 'viaRoute', 'licenseeId', 'actions'];
  dataSource = new MatTableDataSource<EnaDistilleryDetail>([]);
  rows: EnaDistilleryDetail[] = [];

  searchTerm = '';
  selectedLicenseId = 'ALL';
  selectedState = 'ALL';

  licenseOptions: LicenseOption[] = [];
  stateOptions: string[] = [];

  private licenseNameMap = new Map<string, string>();

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.setupFilter();
    this.loadLicenseNames();
    this.loadRows();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  private setupFilter(): void {
    this.dataSource.filterPredicate = (item: EnaDistilleryDetail, filter: string) => {
      const search = this.searchTerm.trim().toLowerCase();
      const matchesSearch =
        !search ||
        (item.distilleryName || '').toLowerCase().includes(search) ||
        (item.distilleryAddress || '').toLowerCase().includes(search) ||
        (item.distilleryState || '').toLowerCase().includes(search) ||
        (item.viaRoute || '').toLowerCase().includes(search) ||
        (item.licenseeId || '').toLowerCase().includes(search) ||
        (this.getLicenseName(item.licenseeId) || '').toLowerCase().includes(search);

      let matchesLicense = true;
      if (this.selectedLicenseId === 'UNASSIGNED') {
        matchesLicense = !item.licenseeId || item.licenseeId.trim() === '';
      } else if (this.selectedLicenseId !== 'ALL') {
        matchesLicense = String(item.licenseeId || '').trim().toLowerCase() === this.selectedLicenseId.trim().toLowerCase();
      }

      let matchesState = true;
      if (this.selectedState !== 'ALL') {
        matchesState = (item.distilleryState || '').trim().toLowerCase() === this.selectedState.trim().toLowerCase();
      }

      return matchesSearch && matchesLicense && matchesState;
    };
  }

  applyFilter(): void {
    this.dataSource.filter = `${this.searchTerm.trim().toLowerCase()}_${this.selectedLicenseId}_${this.selectedState}_${Date.now()}`;
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedLicenseId = 'ALL';
    this.selectedState = 'ALL';
    this.applyFilter();
  }

  private loadLicenseNames(): void {
    this.adminService.getActiveLicenses().subscribe({
      next: (licenses: ActiveLicense[]) => {
        this.licenseNameMap.clear();
        const rows = Array.isArray(licenses) ? licenses : [];
        const opts: LicenseOption[] = [];

        rows.forEach((l) => {
          const id = String(l.id || l.licenseeId || '').trim();
          const name = String(l.establishmentName || id).trim();
          if (id) {
            this.licenseNameMap.set(id, name);
          }
          const lid = String(l.licenseeId || '').trim();
          if (lid && lid !== id) {
            this.licenseNameMap.set(lid, name);
          }

          if (id && !opts.some((o) => o.id.toLowerCase() === id.toLowerCase())) {
            opts.push({ id, name: `${name} (${id})` });
          }
        });

        opts.sort((a, b) => a.name.localeCompare(b.name));
        this.licenseOptions = opts;
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

        // Sort so the most recently added or updated records appear at the top
        this.rows.sort((a, b) => {
          const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          if (timeA !== timeB) {
            return timeB - timeA;
          }
          return (Number(b.id) || 0) - (Number(a.id) || 0);
        });

        this.dataSource.data = this.rows;

        // Extract unique states for dropdown
        const states = Array.from(
          new Set(
            this.rows
              .map((r) => (r.distilleryState || '').trim())
              .filter((s) => !!s)
          )
        ).sort((a, b) => a.localeCompare(b));
        this.stateOptions = states;

        this.applyFilter();
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
