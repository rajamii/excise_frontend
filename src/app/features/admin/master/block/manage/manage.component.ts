import { Component, Inject, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Block } from '../../../../../core/models/block.model';
import { MasterService } from '../../../../../core/services/master.service';
import { AdminService } from '../../../admin.service';
import { LocationSubcategory } from '../../../../../core/models/location-subcategory.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-manage-block',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent implements OnInit {
  block: Block = {
    blockName: '',
    subcategory: 0,
    isActive: true
  };
  isEditMode = false;
  locationSubcategories: LocationSubcategory[] = [];

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Block | null
  ) {}

  ngOnInit(): void {
    this.loadLocationSubcategories();

    if (this.data) {
      const name = this.data.blockName || this.data.gpuName || (this.data as any).block_name || (this.data as any).gpu_name || '';
      this.block = {
        ...this.data,
        blockName: name,
        gpuName: name
      };
      this.isEditMode = true;
    }
  }

  loadLocationSubcategories(): void {
    this.masterService.getLocationSubcategories().subscribe({
      next: (data: any) => this.locationSubcategories = data,
      error: () => Swal.fire('Error', 'Failed to load location subcategories.', 'error')
    });
  }

  onSave(): void {
    const name = String(this.block.blockName || this.block.gpuName || '').trim();
    if (!name || !this.block.subcategory) {
      Swal.fire('Warning', 'All fields are required', 'warning');
      return;
    }

    Swal.fire({
      title: this.isEditMode ? 'Update Block?' : 'Add Block?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save'
    }).then(result => {
      if (!result.isConfirmed) return;

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

      const request = this.isEditMode
        ? this.adminService.updateBlock(this.block.id!, payload)
        : this.adminService.addBlock(payload);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Block updated!' : 'Block added!', 'success');
          this.dialogRef.close(true);
        },
        error: (err: any) => {
          const errorMsg = err?.error?.gpuName?.[0] || err?.error?.gpu_name?.[0] || err?.error?.blockName?.[0] || err?.error?.block_name?.[0] || err?.error?.detail || 'Failed to save block.';
          Swal.fire('Error', errorMsg, 'error');
        }
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
