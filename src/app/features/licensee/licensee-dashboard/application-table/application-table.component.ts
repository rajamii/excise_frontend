import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MaterialModule } from '../../../../shared/material.module';
import { MatTableDataSource } from '@angular/material/table';
import { ApplicationStage } from '../../../../core/models/dashboard.model';
import Swal from 'sweetalert2';
import { BaseDependency } from '../../../../base/dependency/base.dependendency';
import { LicenseApplicationService } from '../../../../core/services/license-application.service';
import { MatDialog } from '@angular/material/dialog';
import { BaseComponent } from '../../../../base/base.components';
import { ApplyLicenseComponent } from '../../apply-license/apply-license.component';
import { ApplicationMovementComponent } from '../application-movement/application-movement.component';

@Component({
  selector: 'app-application-table',
  imports: [MaterialModule],
  templateUrl: './application-table.component.html',
  styleUrl: './application-table.component.scss'
})
export class ApplicationTableComponent extends BaseComponent{
  @Input() title!: string;
  @Input() displayedColumns!: string[];
  @Input() dataSource!: MatTableDataSource<ApplicationStage>;
  @Input() tableType!: string;  // For conditional rendering of action buttons

  @Output() view = new EventEmitter<any>();
  @Output() print = new EventEmitter<any>();
  @Output() payment = new EventEmitter<any>();
  @Output() movement = new EventEmitter<any>();

  constructor(
    public baseDependancy: BaseDependency,
    protected licenseApplicationService: LicenseApplicationService,
    private dialog: MatDialog
  ) { 
    super(baseDependancy); // Calling the parent class constructor
  }

  stageDisplayMapping: { [key: string]: string } = {
    level_1: 'Under Review by Level 1',
    level_2: 'Under Review by Level 2',
    approved: 'Application Approved',
    rejected_by_level_1: 'Rejected by Level 1',
    rejected_by_level_2: 'Rejected by Level 2',
  };

  // Mapping for displaying roles
  roleDisplayMapping: { [key: string]: string } = {
    level_1: 'Level 1',
    level_2: 'Level 2',
    licensee: 'Licensee',
  };

  // Method to view application details
  onView(application: any): void {
    const photoUrl = application.photo 
      ? `http://127.0.0.1:8000/${application.photo}` 
      : null;

    const details = `
      <div style="text-align: left; max-height: 400px; overflow-y: auto; font-size: 14px;">
        <p><strong>Establishment Name:</strong> ${application.establishmentName || 'N/A'}</p>
        <p><strong>License:</strong> ${application.license || 'N/A'}</p>
        <p><strong>License No:</strong> ${application.licenseNo || 'N/A'}</p>
        <p><strong>License Type:</strong> ${application.licenseType || 'N/A'}</p>
        <p><strong>License Nature:</strong> ${application.licenseNature || 'N/A'}</p>
        <p><strong>License Category:</strong> ${application.licenseCategory || 'N/A'}</p>
        <p><strong>Functioning Status:</strong> ${application.functioningStatus || 'N/A'}</p>
        <p><strong>Location Category:</strong> ${application.locationCategory || 'N/A'}</p>
        <p><strong>Location Name:</strong> ${application.locationName || 'N/A'}</p>
        <p><strong>Excise District:</strong> ${application.exciseDistrict || 'N/A'}</p>
        <p><strong>Excise Sub-Division:</strong> ${application.exciseSubDivision || 'N/A'}</p>
        <p><strong>Site Sub-Division:</strong> ${application.siteSubDivision || 'N/A'}</p>
        <p><strong>Police Station:</strong> ${application.policeStation || 'N/A'}</p>
        <p><strong>Ward Name:</strong> ${application.wardName || 'N/A'}</p>
        <p><strong>Road Name:</strong> ${application.roadName || 'N/A'}</p>
        <p><strong>Pin Code:</strong> ${application.pinCode || 'N/A'}</p>
        <p><strong>Mode of Operation:</strong> ${application.modeofOperation || 'N/A'}</p>
        <p><strong>Status:</strong> ${application.status || 'N/A'}</p>
        <p><strong>Gender:</strong> ${application.gender || 'N/A'}</p>
        <p><strong>Father/Husband Name:</strong> ${application.fatherHusbandName || 'N/A'}</p>
        <p><strong>Nationality:</strong> ${application.nationality || 'N/A'}</p>
        <p><strong>Email ID:</strong> ${application.emailId || 'N/A'}</p>
        <p><strong>Mobile Number:</strong> ${application.mobileNumber || 'N/A'}</p>
        <p><strong>Member Name:</strong> ${application.memberName || 'N/A'}</p>
        <p><strong>Member Email ID:</strong> ${application.memberEmailId || 'N/A'}</p>
        <p><strong>Member Mobile Number:</strong> ${application.memberMobileNumber || 'N/A'}</p>
        <p><strong>PAN:</strong> ${application.pan || 'N/A'}</p>
        <p><strong>Company Name:</strong> ${application.companyName || 'N/A'}</p>
        <p><strong>Company Email:</strong> ${application.companyEmailId || 'N/A'}</p>
        <p><strong>Company CIN:</strong> ${application.companyCin || 'N/A'}</p>
        <p><strong>Company PAN:</strong> ${application.companyPan || 'N/A'}</p>
        <p><strong>Company Phone:</strong> ${application.companyPhoneNumber || 'N/A'}</p>
        <p><strong>Business Address:</strong> ${application.businessAddress || 'N/A'}</p>
        <p><strong>Company Address:</strong> ${application.companyAddress || 'N/A'}</p>
        <p><strong>Incorporation Date:</strong> ${application.incorporationDate || 'N/A'}</p>
        <p><strong>Initial Grant Date:</strong> ${application.initialGrantDate || 'N/A'}</p>
        <p><strong>Valid Up To:</strong> ${application.validUpTo || 'N/A'}</p>
        <p><strong>Latitude:</strong> ${application.latitude || 'N/A'}</p>
        <p><strong>Longitude:</strong> ${application.longitude || 'N/A'}</p>
        <p><strong>Current Stage:</strong> ${application.current_stage || 'N/A'}</p>
        <p><strong>Approved:</strong> ${application.is_approved ? 'Yes' : 'No'}</p>
        ${photoUrl ? `<p><strong>Photo:</strong><br><img src="${photoUrl}" alt="Applicant Photo" style="max-width: 100%; height: auto; border: 1px solid #ccc; margin-bottom: 10px;" /></p>` : ''}    </div> 
    `;

    Swal.fire({
      title: `Application Id: ${application.id}`,
      html: details,
      showCancelButton: true,
      confirmButtonText: 'Edit',
      cancelButtonText: 'Delete',
      showCloseButton: true,
      width: 500,
    }).then(result => {
      if (result.isConfirmed) {
        this.onEdit(application); // Handle application updation
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        this.onDelete(application); // Handle application deletion 
      }
    });
  }

  // Method to handle application updation
  onEdit(application: ApplicationStage): void {
    this.dialog.open(ApplyLicenseComponent, {
      width: '1000px',
      data: { applicationData: application }
    });
  }
  
  onDelete(application: ApplicationStage): void {
    Swal.fire({
      title: 'Are you sure you want to delete this application?',
      text: 'The application will be permanently deleted.',
      icon: 'warning',
      showDenyButton: true,
      showCancelButton: false,
      confirmButtonText: 'Delete',
      denyButtonText: 'Cancel',
      showCloseButton: true,
    }).then(result => {
      if (result.isConfirmed) {
        this.licenseApplicationService.deleteApplication(application.id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'The application has been deleted successfully.', 'success')
            .then(() => {
              location.reload(); // Refresh the page after showing success
            });
          },
          error: (error) => {
            Swal.fire('Error', error.error?.detail || 'Failed to delete the application.', 'error');
          }
        });
      } 
    });
  }

  onPrint(application: ApplicationStage): void {
    Swal.fire({
      title: '<span style="font-size: 23px;">Print License</span>',
      html: `
        <div style="margin-top: 10px; color: red; font-size: 16px;">
          The printing of license is limited to 5 nos, if lost a duplicate copy can be printed only after payment of Rs. 500/- per copy.
        </div>
        <div style="margin-top: 20px; font-size: 16px;">
          No. of times license printed by licensee : <!-- {application.print_count ?? 0}-->
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Print License',
      cancelButtonText: 'Close',
      confirmButtonColor: '#007bff', // Bootstrap primary blue
      cancelButtonColor: '#6c757d',   // Bootstrap secondary gray
      focusConfirm: false,
      showCloseButton: true,
      customClass: {
        popup: 'swal2-print-dialog'
      }
    }).then(result => {
      if (result.isConfirmed) {
        // Call your print logic here
        this.licenseApplicationService.printLicense(application.id).subscribe({
          next: () => {
            Swal.fire('Printed!', 'License printed successfully.', 'success');
          },
          error: () => {
            Swal.fire('Error', 'Failed to print the license.', 'error');
          }
        });
      }
    });
  }

  viewMovement(application: ApplicationStage): void {
    this.dialog.open(ApplicationMovementComponent, {
      width: '70vw',        
      maxWidth: '100%',
      height: 'auto',
      data: {
        movementDataSource: new MatTableDataSource([application])
      }
    });
  }
}