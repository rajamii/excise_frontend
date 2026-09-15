import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
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
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss',
})
export class ListComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = ['licenseId', 'distributorName', 'depoAddress', 'actions'];
  dataSource = new MatTableDataSource<TransitPermitDistributorData>([]);
  rows: TransitPermitDistributorData[] = [];
  searchTerm = '';

  /** license_id → establishmentName */
  private licenseNameMap = new Map<string, string>();

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.setupFilter();
    this.loadLicenseNames();
    this.load();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  private setupFilter(): void {
    this.dataSource.filterPredicate = (item: TransitPermitDistributorData, filter: string) => {
      const term = filter.trim().toLowerCase();
      const licId = (item.licenseId || '').toLowerCase();
      const estName = (this.getLicenseName(item.licenseId) || '').toLowerCase();
      const distName = (item.distributorName || '').toLowerCase();
      const depo = (item.depoAddress || '').toLowerCase();
      const mfg = (item.manufacturingUnit || '').toLowerCase();

      return (
        licId.includes(term) ||
        estName.includes(term) ||
        distName.includes(term) ||
        depo.includes(term) ||
        mfg.includes(term)
      );
    };
  }

  onSearchChange(): void {
    this.dataSource.filter = this.searchTerm.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.onSearchChange();
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
        const list = Array.isArray(data) ? data : (data?.results || []);
        this.rows = list.map((item: any) => ({
          ...item,
          licenseId: item.licenseId ?? item.license_id ?? null,
          distributorName: item.distributorName ?? item.distributor_name ?? '',
          depoAddress: item.depoAddress ?? item.depo_address ?? '',
          manufacturingUnit: item.manufacturingUnit ?? item.manufacturing_unit ?? ''
        }));
        this.dataSource.data = this.rows;
        if (this.paginator) {
          this.dataSource.paginator = this.paginator;
        }
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
