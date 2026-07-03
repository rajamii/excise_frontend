import { Component, Inject, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { RuralWard } from '../../../../../core/models/rural-ward.model';
import { MasterService } from '../../../../../core/services/master.service';
import { AdminService } from '../../../admin.service';
import { Block } from '../../../../../core/models/block.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-manage-rural-ward',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent implements OnInit {
  ward: RuralWard = {
    wardName: '',
    wardNumber: 0,
    block: 0,
    isActive: true
  };
  isEditMode = false;
  blocks: Block[] = [];

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RuralWard | null
  ) {}

  ngOnInit(): void {
    this.loadBlocks();

    if (this.data) {
      this.ward = { ...this.data };
      this.isEditMode = true;
    }
  }

  loadBlocks(): void {
    this.masterService.getBlocks().subscribe({
      next: (data: any) => this.blocks = data,
      error: () => Swal.fire('Error', 'Failed to load blocks.', 'error')
    });
  }

  onSave(): void {
    if (!this.ward.wardName || !this.ward.wardNumber || !this.ward.block) {
      Swal.fire('Warning', 'All fields are required', 'warning');
      return;
    }

    Swal.fire({
      title: this.isEditMode ? 'Update Rural Ward?' : 'Add Rural Ward?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save'
    }).then(result => {
      if (!result.isConfirmed) return;

      const request = this.isEditMode
        ? this.adminService.updateRuralWard(this.ward.id!, this.ward)
        : this.adminService.addRuralWard(this.ward);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Rural Ward updated!' : 'Rural Ward added!', 'success');
          this.dialogRef.close(true);
        },
        error: () => {
          Swal.fire('Error', 'Failed to save rural ward.', 'error');
        }
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
