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
      this.block = { ...this.data };
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
    if (!this.block.blockName || !this.block.subcategory) {
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

      const request = this.isEditMode
        ? this.adminService.updateBlock(this.block.id!, this.block)
        : this.adminService.addBlock(this.block);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Block updated!' : 'Block added!', 'success');
          this.dialogRef.close(true);
        },
        error: () => {
          Swal.fire('Error', 'Failed to save block.', 'error');
        }
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
