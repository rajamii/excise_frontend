import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { CompanyCollaborationBrandOwner } from '../../../../../core/models/company-collaboration.model';
import { CompanyCollaborationService } from '../../../../../core/services/company-collaboration.service';
import { ManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-brand-owner-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = ['code', 'name', 'licensee_id', 'origin', 'type', 'actions'];
  dataSource: CompanyCollaborationBrandOwner[] = [];

  constructor(
    private companyCollabService: CompanyCollaborationService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadBrandOwners();
  }

  loadBrandOwners(): void {
    this.companyCollabService.getBrandOwners().subscribe({
      next: (data: CompanyCollaborationBrandOwner[]) => {
        this.dataSource = Array.isArray(data) ? data : [];
      },
      error: () => Swal.fire('Error', 'Failed to load brand owners.', 'error')
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, { width: '600px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadBrandOwners();
    });
  }

  onEdit(owner: CompanyCollaborationBrandOwner): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '600px',
      data: { ...owner }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadBrandOwners();
    });
  }

  onDelete(owner: CompanyCollaborationBrandOwner): void {
    if (!owner?.brand_owner_code) {
      Swal.fire('Error', 'Invalid brand owner record.', 'error');
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: `Delete brand owner "${owner.company_name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.companyCollabService.deleteBrandOwner(owner.brand_owner_code).subscribe({
        next: () => {
          Swal.fire('Deleted!', 'Brand owner deleted successfully.', 'success');
          this.loadBrandOwners();
        },
        error: () => Swal.fire('Error', 'Failed to delete brand owner.', 'error')
      });
    });
  }
}
