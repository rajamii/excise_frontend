import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { LicenseFee } from '../../../../../core/models/license-fee.model';
import { MasterLocation } from '../../../../../core/models/master-location.model';
import { MasterService } from '../../../../../core/services/master.service';
import { ManageLicenseFeeComponent } from '../manage-license-fee/manage-license-fee.component';
import { ManageComponent as ManageLocationComponent } from '../../location/manage/manage.component';

@Component({
  selector: 'app-additional-charge-list',
  standalone: true,
  imports: [MaterialModule, CommonModule, FormsModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit, AfterViewInit {
  @ViewChild('feePaginator') feePaginator!: MatPaginator;
  @ViewChild('locationPaginator') locationPaginator!: MatPaginator;

  // ── License Location Fee ─────────────────────────────────────────────────
  licenseFeeColumns: string[] = ['category', 'subcategory', 'location', 'fee', 'security', 'renewal', 'lateFee', 'status', 'actions'];
  licenseFees: LicenseFee[] = [];
  licenseFeesDS = new MatTableDataSource<LicenseFee>([]);
  feeSearch = '';

  // ── Locations ────────────────────────────────────────────────────────────
  locationColumns: string[] = ['locationCode', 'locationDescription', 'district', 'status', 'actions'];
  locations: MasterLocation[] = [];
  locationsDS = new MatTableDataSource<MasterLocation>([]);
  locationSearch = '';

  constructor(
    private masterService: MasterService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.setupFilters();
    this.loadLicenseFees();
    this.loadLocations();
  }

  ngAfterViewInit(): void {
    this.licenseFeesDS.paginator = this.feePaginator;
    this.locationsDS.paginator = this.locationPaginator;
  }

  private setupFilters(): void {
    this.locationsDS.filterPredicate = (item: MasterLocation, filter: string) => {
      const term = filter.trim().toLowerCase();
      const code = String(item.locationCode || '').toLowerCase();
      const desc = String(item.locationDescription || '').toLowerCase();
      const dist = String(item.district || '').toLowerCase();
      const status = item.isActive ? 'active' : 'inactive';
      return code.includes(term) || desc.includes(term) || dist.includes(term) || status.includes(term);
    };

    this.licenseFeesDS.filterPredicate = (item: LicenseFee, filter: string) => {
      const term = filter.trim().toLowerCase();
      const cat = String(item.licenseCategoryName || item.licenseCategory || '').toLowerCase();
      const sub = String(item.licenseSubcategoryName || item.licenseSubcategory || '').toLowerCase();
      const loc = String(this.getLocationDisplay(item)).toLowerCase();
      const fee = String(item.licenseFee ?? '').toLowerCase();
      const sec = String(item.securityAmount ?? '').toLowerCase();
      const ren = String(item.renewalAmount ?? '').toLowerCase();
      const late = String(item.lateFee ?? '').toLowerCase();
      const status = item.isActive ? 'active' : 'inactive';
      return (
        cat.includes(term) ||
        sub.includes(term) ||
        loc.includes(term) ||
        fee.includes(term) ||
        sec.includes(term) ||
        ren.includes(term) ||
        late.includes(term) ||
        status.includes(term)
      );
    };
  }

  getLocationDisplay(item: any): string {
    const desc = item?.locationDescription ?? item?.location_description;
    if (!desc || desc === 'null' || desc === 'None' || desc === 'undefined') {
      return 'All Locations';
    }
    return desc;
  }

  onLocationSearch(): void {
    this.locationsDS.filter = this.locationSearch.trim().toLowerCase();
    if (this.locationsDS.paginator) {
      this.locationsDS.paginator.firstPage();
    }
  }

  clearLocationSearch(): void {
    this.locationSearch = '';
    this.onLocationSearch();
  }

  onFeeSearch(): void {
    this.licenseFeesDS.filter = this.feeSearch.trim().toLowerCase();
    if (this.licenseFeesDS.paginator) {
      this.licenseFeesDS.paginator.firstPage();
    }
  }

  clearFeeSearch(): void {
    this.feeSearch = '';
    this.onFeeSearch();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LICENSE LOCATION FEE
  // ══════════════════════════════════════════════════════════════════════════

  loadLicenseFees(): void {
    this.masterService.getLicenseFees().subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : (data?.results || []);
        this.licenseFees = list;
        this.licenseFeesDS.data = list;
        if (this.feePaginator) {
          this.licenseFeesDS.paginator = this.feePaginator;
        }
      },
      error: () => Swal.fire('Error', 'Failed to load license fees.', 'error')
    });
  }

  onAddLicenseFee(): void {
    this.dialog.open(ManageLicenseFeeComponent, { width: '650px' })
      .afterClosed().subscribe(r => { if (r) this.loadLicenseFees(); });
  }

  onEditLicenseFee(fee: LicenseFee): void {
    this.dialog.open(ManageLicenseFeeComponent, { width: '650px', data: fee })
      .afterClosed().subscribe(r => { if (r) this.loadLicenseFees(); });
  }

  onDeleteLicenseFee(fee: LicenseFee): void {
    Swal.fire({ title: 'Deactivate?', text: 'Deactivate this fee configuration?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Deactivate' })
      .then(r => {
        if (!r.isConfirmed) return;
        this.masterService.deleteLicenseFee(fee.id).subscribe({
          next: () => { Swal.fire('Done', 'Fee deactivated.', 'success'); this.loadLicenseFees(); },
          error: () => Swal.fire('Error', 'Failed to deactivate.', 'error')
        });
      });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LOCATIONS
  // ══════════════════════════════════════════════════════════════════════════

  loadLocations(): void {
    this.masterService.getLocations().subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : (data?.results || []);
        this.locations = list;
        this.locationsDS.data = list;
        if (this.locationPaginator) {
          this.locationsDS.paginator = this.locationPaginator;
        }
      },
      error: () => Swal.fire('Error', 'Failed to load locations.', 'error')
    });
  }

  onAddLocation(): void {
    this.dialog.open(ManageLocationComponent, { width: '500px' })
      .afterClosed().subscribe(r => { if (r) this.loadLocations(); });
  }

  onEditLocation(loc: MasterLocation): void {
    this.dialog.open(ManageLocationComponent, { width: '500px', data: loc })
      .afterClosed().subscribe(r => { if (r) this.loadLocations(); });
  }

  onDeleteLocation(loc: MasterLocation): void {
    Swal.fire({ title: 'Deactivate?', text: `Deactivate "${loc.locationDescription}"?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Deactivate' })
      .then(r => {
        if (!r.isConfirmed) return;
        this.masterService.deleteLocation(loc.id!).subscribe({
          next: () => { Swal.fire('Done', 'Location deactivated.', 'success'); this.loadLocations(); },
          error: () => Swal.fire('Error', 'Failed to deactivate.', 'error')
        });
      });
  }
}
