import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
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
  imports: [MaterialModule, CommonModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {

  // ── License Location Fee ─────────────────────────────────────────────────
  licenseFeeColumns: string[] = ['category', 'subcategory', 'location', 'fee', 'security', 'renewal', 'lateFee', 'status', 'actions'];
  licenseFees: LicenseFee[] = [];

  // ── Locations ────────────────────────────────────────────────────────────
  locationColumns: string[] = ['locationCode', 'locationDescription', 'district', 'status', 'actions'];
  locations: MasterLocation[] = [];

  constructor(
    private masterService: MasterService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadLicenseFees();
    this.loadLocations();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LICENSE LOCATION FEE
  // ══════════════════════════════════════════════════════════════════════════

  loadLicenseFees(): void {
    this.masterService.getLicenseFees().subscribe({
      next: (data: any) => (this.licenseFees = data),
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
      next: (data: any) => (this.locations = data),
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
