import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { HologramSupplier } from '../../../../../core/models/hologram-supplier.model';
import { AdminService } from '../../../admin.service';
import { MasterService } from '../../../../../core/services/master.service';
import { ManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-hologram-supplier-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = ['companyName', 'post', 'address', 'state', 'isActive', 'actions'];
  suppliers: HologramSupplier[] = [];

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadSuppliers();
  }

  loadSuppliers(): void {
    this.masterService.getHologramSuppliers().subscribe({
      next: (data: any) => {
        // API returns a plain array
        this.suppliers = Array.isArray(data) ? data : [];
      },
      error: () => Swal.fire('Error', 'Failed to load hologram suppliers.', 'error')
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, { width: '550px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadSuppliers();
    });
  }

  onEdit(supplier: HologramSupplier): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '550px',
      data: { ...supplier }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadSuppliers();
    });
  }

  onDelete(supplier: HologramSupplier): void {
    if (supplier?.id === undefined) {
      Swal.fire('Error', 'Invalid supplier record.', 'error');
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: `Delete supplier "${supplier.companyName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.adminService.deleteHologramSupplier(supplier.id as number).subscribe({
        next: () => {
          Swal.fire('Deleted!', 'Hologram supplier deleted successfully.', 'success');
          this.loadSuppliers();
        },
        error: () => Swal.fire('Error', 'Failed to delete hologram supplier.', 'error')
      });
    });
  }
}
