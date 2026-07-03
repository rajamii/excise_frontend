import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { Block } from '../../../../../core/models/block.model';
import { MasterService } from '../../../../../core/services/master.service';
import { AdminService } from '../../../admin.service';
import { ManageComponent } from '../manage/manage.component';
import { LocationSubcategory } from '../../../../../core/models/location-subcategory.model';

@Component({
  selector: 'app-block-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = ['blockName', 'subcategory', 'actions'];
  blockDataSource: Block[] = [];

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadBlocks();
  }

  loadBlocks(): void {
    this.masterService.getBlocks().subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : [];
        this.blockDataSource = [...list].sort(
          (a, b) => a.blockName.localeCompare(b.blockName)
        );
      },
      error: () => Swal.fire('Error', 'Failed to load blocks.', 'error')
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, { width: '500px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadBlocks();
    });
  }

  onEdit(block: Block): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
      data: { ...block }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadBlocks();
    });
  }

  onDelete(block: Block): void {
    if (block?.id === undefined) {
      Swal.fire('Error', 'Invalid block record.', 'error');
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: `Delete block "${block.blockName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.adminService.deleteBlock(block.id as number).subscribe({
        next: () => {
          Swal.fire('Deleted!', 'Block deleted successfully.', 'success');
          this.loadBlocks();
        },
        error: () => Swal.fire('Error', 'Failed to delete block.', 'error')
      });
    });
  }
}
