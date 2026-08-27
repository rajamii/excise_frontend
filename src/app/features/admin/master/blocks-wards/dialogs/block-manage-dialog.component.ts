import { Component, Inject, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Block } from '../../../../../core/models/block.model';
import { LocationSubcategory } from '../../../../../core/models/location-subcategory.model';
import { MasterService } from '../../../../../core/services/master.service';
import { AdminService } from '../../../admin.service';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-block-manage-dialog',
  standalone: true,
  imports: [MaterialModule, CommonModule],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon>{{ isEditMode ? 'edit' : 'add_circle' }}</mat-icon>
        {{ isEditMode ? 'Edit' : 'Add' }} Block
      </h2>

      <mat-dialog-content>
        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Block Name</mat-label>
          <input matInput [(ngModel)]="block.blockName" placeholder="Enter block name" required />
          <mat-icon matPrefix>business</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Location Subcategory</mat-label>
          <mat-select [(ngModel)]="block.subcategory" required>
            <mat-option *ngIf="loadingSubcategories" disabled>
              <mat-spinner diameter="20" style="display:inline-block;margin-right:8px;"></mat-spinner>
              Loading...
            </mat-option>
            <mat-option *ngFor="let s of subcategories" [value]="s.id">
              {{ s.subcategoryName }}
            </mat-option>
            <mat-option *ngIf="!loadingSubcategories && subcategories.length === 0" disabled>
              No subcategories available
            </mat-option>
          </mat-select>
          <mat-icon matPrefix>category</mat-icon>
          <mat-hint *ngIf="subcategories.length > 0">{{ subcategories.length }} subcategories available</mat-hint>
        </mat-form-field>

        <mat-checkbox [(ngModel)]="block.isActive" color="primary">Active</mat-checkbox>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button (click)="onCancel()">Cancel</button>
        <button mat-flat-button color="primary" (click)="onSave()" [disabled]="loadingSubcategories">
          {{ isEditMode ? 'Update' : 'Save' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container { padding: 8px; min-width: 420px; }
    .dialog-title {
      display: flex; align-items: center; gap: 8px;
      color: #1C2B78; font-size: 1.1rem; margin-bottom: 12px;
    }
    .w-100 { width: 100%; margin-bottom: 12px; display: block; }
    mat-dialog-content { display: flex; flex-direction: column; gap: 4px; padding-top: 8px; max-height: 70vh; }
    mat-dialog-actions { padding: 16px 0 0; gap: 8px; }
  `]
})
export class BlockManageDialogComponent implements OnInit {
  block: Block = { blockName: '', subcategory: 0, isActive: true };
  isEditMode = false;
  subcategories: LocationSubcategory[] = [];
  loadingSubcategories = true;

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    public dialogRef: MatDialogRef<BlockManageDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Block | null
  ) {}

  ngOnInit(): void {
    if (this.data) {
      const name = this.data.blockName || this.data.gpuName || (this.data as any).block_name || (this.data as any).gpu_name || '';
      this.block = {
        ...this.data,
        blockName: name,
        gpuName: name
      };
      this.isEditMode = true;
    }

    this.masterService.getLocationSubcategories().subscribe({
      next: (d: any) => {
        this.subcategories = Array.isArray(d) ? d : [];
        this.loadingSubcategories = false;
      },
      error: () => {
        this.loadingSubcategories = false;
        Swal.fire('Error', 'Failed to load subcategories.', 'error');
      }
    });
  }

  onSave(): void {
    const name = String(this.block.blockName || this.block.gpuName || '').trim();
    if (!name || !this.block.subcategory) {
      Swal.fire('Warning', 'All fields are required.', 'warning');
      return;
    }
    const payload = {
      ...this.block,
      gpu_name: name,
      gpuName: name,
      block_name: name,
      blockName: name,
      subcategory: this.block.subcategory,
      isActive: this.block.isActive ?? true,
      is_active: this.block.isActive ?? true
    };
    const req = this.isEditMode
      ? this.adminService.updateBlock(this.block.id!, payload)
      : this.adminService.addBlock(payload);
    req.subscribe({
      next: () => {
        Swal.fire('Success', `Block ${this.isEditMode ? 'updated' : 'added'}!`, 'success');
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        const errorMsg = err?.error?.gpuName?.[0] || err?.error?.gpu_name?.[0] || err?.error?.blockName?.[0] || err?.error?.block_name?.[0] || err?.error?.detail || 'Failed to save block.';
        Swal.fire('Error', errorMsg, 'error');
      }
    });
  }

  onCancel(): void { this.dialogRef.close(); }
}
