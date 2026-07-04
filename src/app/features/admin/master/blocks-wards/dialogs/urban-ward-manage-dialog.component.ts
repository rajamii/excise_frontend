import { Component, Inject, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Ward } from '../../../../../core/models/ward.model';
import { MasterLocation } from '../../../../../core/models/master-location.model';
import { MasterService } from '../../../../../core/services/master.service';
import { AdminService } from '../../../admin.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-urban-ward-manage-dialog',
  standalone: true,
  imports: [MaterialModule],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title class="dialog-title urban">
        <mat-icon>location_on</mat-icon>
        {{ isEditMode ? 'Edit' : 'Add' }} Urban Ward
      </h2>

      <mat-dialog-content>
        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Ward Name</mat-label>
          <input matInput [(ngModel)]="ward.wardName" placeholder="Enter ward name" required />
          <mat-icon matPrefix>label</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Ward Number</mat-label>
          <input type="number" matInput [(ngModel)]="ward.wardNumber" placeholder="Enter ward number" required />
          <mat-icon matPrefix>pin</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Location</mat-label>
          <mat-select [(ngModel)]="ward.locationCode" required>
            <mat-option *ngFor="let loc of locations" [value]="loc.locationCode">
              {{ loc.locationDescription }}
            </mat-option>
          </mat-select>
          <mat-icon matPrefix>place</mat-icon>
        </mat-form-field>

        <mat-checkbox [(ngModel)]="ward.isActive" color="primary">Active</mat-checkbox>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button (click)="onCancel()">Cancel</button>
        <button mat-flat-button color="primary" (click)="onSave()">
          {{ isEditMode ? 'Update' : 'Save' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container { padding: 8px; min-width: 400px; }
    .dialog-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 1.1rem; margin-bottom: 12px;
    }
    .dialog-title.urban { color: #1d4ed8; }
    .w-100 { width: 100%; margin-bottom: 12px; display: block; }
    mat-dialog-content { display: flex; flex-direction: column; gap: 4px; padding-top: 8px; }
    mat-dialog-actions { padding: 16px 0 0; gap: 8px; }
  `]
})
export class UrbanWardManageDialogComponent implements OnInit {
  ward: Ward = { id: 0, wardName: '', wardNumber: 0, locationCode: 0, isActive: true };
  isEditMode = false;
  locations: MasterLocation[] = [];

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    public dialogRef: MatDialogRef<UrbanWardManageDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Ward | null
  ) {}

  ngOnInit(): void {
    this.masterService.getLocations().subscribe({
      next: (d: any) => this.locations = d,
      error: () => Swal.fire('Error', 'Failed to load locations.', 'error')
    });
    if (this.data) { this.ward = { ...this.data }; this.isEditMode = true; }
  }

  onSave(): void {
    if (!this.ward.wardName || !this.ward.wardNumber || !this.ward.locationCode) {
      Swal.fire('Warning', 'All fields are required.', 'warning'); return;
    }
    const req = this.isEditMode
      ? this.adminService.updateWard(this.ward.id!, this.ward)
      : this.adminService.addWard(this.ward);
    req.subscribe({
      next: () => { Swal.fire('Success', `Urban ward ${this.isEditMode ? 'updated' : 'added'}!`, 'success'); this.dialogRef.close(true); },
      error: () => Swal.fire('Error', 'Failed to save urban ward.', 'error')
    });
  }

  onCancel(): void { this.dialogRef.close(); }
}
