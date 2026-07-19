import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { CompanyCollaborationService } from '../../../../../core/services/company-collaboration.service';
import { ManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-company-detail-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = ['code', 'name', 'email', 'mobile', 'origin', 'type', 'actions'];
  dataSource: any[] = [];

  constructor(
    private companyCollabService: CompanyCollaborationService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadCompanyDetails();
  }

  loadCompanyDetails(): void {
    this.companyCollabService.getCompanyDetailsList().subscribe({
      next: (data: any[]) => {
        this.dataSource = Array.isArray(data) ? data : [];
      },
      error: () => Swal.fire('Error', 'Failed to load company details.', 'error')
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, { width: '600px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadCompanyDetails();
    });
  }

  onEdit(element: any): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '600px',
      data: { ...element }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadCompanyDetails();
    });
  }

  onDelete(element: any): void {
    if (!element?.brandOwnerCode) {
      Swal.fire('Error', 'Invalid company details record.', 'error');
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: `Delete company "${element.brandOwnerName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.companyCollabService.deleteCompanyDetail(element.brandOwnerCode).subscribe({
        next: () => {
          Swal.fire('Deleted!', 'Company details deleted successfully.', 'success');
          this.loadCompanyDetails();
        },
        error: () => Swal.fire('Error', 'Failed to delete company details.', 'error')
      });
    });
  }
}
