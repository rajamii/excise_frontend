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
    'createdAt'
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
