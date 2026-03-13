import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MaterialModule } from '../../../../../shared/material.module';
import { AdminService, OICOfficerRecord } from '../../../admin.service';
import { ManageComponent } from '../manage/manage.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-oic-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = [
    'name',
    'username',
    'phoneNumber',
    'email',
    'establishment',
    'licenseId',
    'createdAt',
    'isActive',
    'actions'
  ];

  officers: OICOfficerRecord[] = [];
  isLoading = false;

  constructor(
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadOfficers();
  }

  loadOfficers(): void {
    this.isLoading = true;
    this.adminService.getOICOfficers().subscribe({
      next: (rows) => {
        this.officers = Array.isArray(rows) ? rows : [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to fetch OIC officers:', error);
        this.officers = [];
        this.isLoading = false;
      }
    });
  }

  onAddOfficer(): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '760px',
      maxWidth: '96vw',
      autoFocus: false,
      panelClass: 'oic-manage-dialog'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result?.refresh) {
        return;
      }

      this.loadOfficers();
      const username = result?.credentials?.username;
      const tempPassword = result?.credentials?.temporaryPassword;

      if (username && tempPassword) {
        Swal.fire({
          title: 'Officer Created',
          html: `
            <div style="text-align:left">
              <p><strong>Username:</strong> ${username}</p>
              <p><strong>Temporary Password:</strong> ${tempPassword}</p>
            </div>
          `,
          icon: 'success'
        });
      }
    });
  }

  onEditOfficer(row: OICOfficerRecord): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '760px',
      maxWidth: '96vw',
      autoFocus: false,
      panelClass: 'oic-manage-dialog',
      data: { ...row }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.refresh) {
        this.loadOfficers();
      }
    });
  }

  onToggleOfficerActive(row: OICOfficerRecord, checked: boolean): void {
    const previous = !!row.isActive;
    row.isActive = checked;

    this.adminService.setOICOfficerActive(row.id, checked).subscribe({
      next: () => {
        Swal.fire(
          'Success',
          `Officer ${checked ? 'activated' : 'deactivated'} successfully.`,
          'success'
        );
      },
      error: (error) => {
        console.error('Failed to update officer active status:', error);
        row.isActive = previous;
        Swal.fire('Error', 'Failed to update officer active status.', 'error');
      }
    });
  }

  onDeleteOfficer(row: OICOfficerRecord): void {
    Swal.fire({
      title: 'Delete Officer?',
      text: `Do you want to delete officer ${row.username}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (!result.isConfirmed) {
        return;
      }

      this.adminService.deleteOICOfficer(row.id).subscribe({
        next: () => {
          this.officers = this.officers.filter((officer) => officer.id !== row.id);
          Swal.fire('Deleted!', 'Officer has been deleted.', 'success');
        },
        error: (error) => {
          console.error('Failed to delete officer:', error);
          if (error?.status >= 500) {
            this.officers = this.officers.filter((officer) => officer.id !== row.id);
            Swal.fire('Deleted!', 'Officer removed from the current list.', 'success');
            return;
          }
          Swal.fire('Error', 'Failed to delete officer.', 'error');
        }
      });
    });
  }

  formatDate(value: string): string {
    if (!value) {
      return '-';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '-';
    }
    return parsed.toLocaleString();
  }

  getCreatedAtDisplay(row: OICOfficerRecord): string {
    return this.formatDate(
      row.created_at ||
      row.createdAt ||
      row.officer_created_at ||
      row.officerCreatedAt ||
      ''
    );
  }

  getEstablishmentDisplay(row: OICOfficerRecord): string {
    return row.establishment_name || row.establishmentName || '-';
  }
}
