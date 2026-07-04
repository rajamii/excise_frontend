import { Component, Inject, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { RuralWard } from '../../../../../core/models/rural-ward.model';
import { Block } from '../../../../../core/models/block.model';
import { MasterService } from '../../../../../core/services/master.service';
import { AdminService } from '../../../admin.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-rural-ward-manage-dialog',
  standalone: true,
  imports: [MaterialModule],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title class="dialog-title rural">
        <mat-icon>nature_people</mat-icon>
        {{ isEditMode ? 'Edit' : 'Add' }} Rural Ward
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
          <mat-label>Block</mat-label>
          <mat-select [(ngModel)]="ward.block" required>
            <mat-option *ngFor="let blk of blocks" [value]="blk.id">
              {{ blk.blockName }}
            </mat-option>
          </mat-select>
          <mat-icon matPrefix>location_city</mat-icon>
        </mat-form-field>

        <mat-checkbox [(ngModel)]="ward.isActive" color="primary">Active</mat-checkbox>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button (click)="onCancel()">Cancel</button>
        <button mat-flat-button color="accent" (click)="onSave()">
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
    .dialog-title.rural { color: #065f46; }
    .w-100 { width: 100%; margin-bottom: 12px; display: block; }
    mat-dialog-content { display: flex; flex-direction: column; gap: 4px; padding-top: 8px; }
    mat-dialog-actions { padding: 16px 0 0; gap: 8px; }
  `]
})
export class RuralWardManageDialogComponent implements OnInit {
  ward: RuralWard = { wardName: '', wardNumber: 0, block: 0, isActive: true };
  isEditMode = false;
  blocks: Block[] = [];

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    public dialogRef: MatDialogRef<RuralWardManageDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RuralWard | null
  ) {}

  ngOnInit(): void {
    this.masterService.getBlocks().subscribe({
      next: (d: any) => this.blocks = d,
      error: () => Swal.fire('Error', 'Failed to load blocks.', 'error')
    });
    if (this.data) { this.ward = { ...this.data }; this.isEditMode = true; }
  }

  onSave(): void {
    if (!this.ward.wardName || !this.ward.wardNumber || !this.ward.block) {
      Swal.fire('Warning', 'All fields are required.', 'warning'); return;
    }
    const req = this.isEditMode
      ? this.adminService.updateRuralWard(this.ward.id!, this.ward)
      : this.adminService.addRuralWard(this.ward);
    req.subscribe({
      next: () => { Swal.fire('Success', `Rural ward ${this.isEditMode ? 'updated' : 'added'}!`, 'success'); this.dialogRef.close(true); },
      error: () => Swal.fire('Error', 'Failed to save rural ward.', 'error')
    });
  }

  onCancel(): void { this.dialogRef.close(); }
}
