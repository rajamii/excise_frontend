import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MaterialModule } from '../../../../shared/material.module';
import { MatTableDataSource } from '@angular/material/table';
import { ApplicationStage } from '../../../../core/models/dashboard.model';
import Swal from 'sweetalert2';
import { BaseDependency } from '../../../../base/dependency/base.dependendency';
import { LicenseApplicationService } from '../../../../core/services/license-application.service';
import { MatDialog } from '@angular/material/dialog';
import { BaseComponent } from '../../../../base/base.components';
import { SiteEnquiryFormComponent } from './site-enquiry-form/site-enquiry-form.component';
import { ApplicationMovementComponent } from './application-movement/application-movement.component';

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

  // Mapping for displaying current stage
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
        ${photoUrl ? `<p><strong>Photo:</strong><br><img src="${photoUrl}" alt="Photo" style="max-width: 100%; height: auto;" /></p>` : ''}
    `;

    Swal.fire({
      title: `Application Id: ${application.id}`,
      html: details,
      showCancelButton: true,
      confirmButtonText: 'Approve',
      cancelButtonText: 'Reject',
      showCloseButton: true,
      width: 500,
    }).then(result => {
      if (result.isConfirmed) {
        this.onApprove(application); // Handle application approval
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        this.onReject(application); // Handle application rejection
      }
    });
  }

  // Method to handle application approval
  onApprove(application: ApplicationStage): void {
    this.approveStep1_review(application); // Start approval process
  }

  // Step 1: Review remarks for acceptance
  approveStep1_review(application: ApplicationStage): void {
    Swal.fire({
      title: 'Step 1: Review Remarks',
      input: 'textarea',
      inputLabel: 'Write your review remarks',
      inputPlaceholder: 'Enter remarks here...',
      inputAttributes: {
        'aria-label': 'Review remarks',
      },
      showDenyButton: true,
      showCancelButton: false,
      confirmButtonText: 'Next',
      denyButtonText: 'Back',
      showCloseButton: true,
      inputValue: '', // Optional: to prefill on revisit
      inputValidator: (value) => {
        if (!value) {
          return 'Remarks are required to proceed.';
        }
        return null;
      }
    }).then(result => {
      if (result.isConfirmed) {
        const remarks = result.value || ''; // Get remarks
        const currentRole = localStorage.getItem('role'); // Get current user role
        if (currentRole === 'level_1') {
          this.approveStep3_confirm(application, remarks, currentRole); // Forward to next role
        } else {
          this.approveStep3_confirm(application, remarks); // Skip forward step
        }
      } else if (result.isDenied) {
        this.onView(application); // Go back to view dialog
      }
    });
  }

/*   // Step 2: Forward application to another role
  approveStep2_forward(application: ApplicationStage, remarks: string): void {
    Swal.fire({
      title: 'Step 2: Forward To',
      input: 'select',
      inputOptions: {
        commissioner: 'Commissioner',
        joint_commissioner: 'Joint Commissioner'
      },
      inputPlaceholder: 'Select role to forward to',
      showDenyButton: true,
      showCancelButton: false,
      confirmButtonText: 'Next',
      denyButtonText: 'Back',
      showCloseButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'You must select a role to proceed.';
        }
        return null;
      }
    }).then(result => {
      if (result.isConfirmed) {
        const forwardTo = result.value; // Get selected role
        this.approveStep3_confirm(application, remarks, forwardTo); // Proceed to confirmation
      } else if (result.isDenied) {
        this.approveStep1_review(application); // Go back to review step
      }
    });
  }
 */
  // Step 3: Confirm application approval
  approveStep3_confirm(application: any, remarks: string, currentRole?: string): void {  
    let action: string;
    if (currentRole === 'level_1') {
      action = 'forward';
    }
    else{
      action = 'approve';
    }
    Swal.fire({
      title: 'Step 3: Confirm Approval',
      html: `
        <p><strong>Remarks:</strong> ${remarks}</p>
      `,
      icon: 'question',
      showDenyButton: true,
      showCancelButton: false,
      confirmButtonText: 'Confirm',
      denyButtonText: 'Back',
      showCloseButton: true,
    }).then(result => {
      if (result.isConfirmed) {
        // Call API to approve application
        this.licenseApplicationService.advanceApplication(application.id, action, remarks).subscribe({
          next: () => {
            Swal.fire('Approved!', 'The application was approved successfully.', 'success')
            .then(() => {
              location.reload(); // Refresh the page after showing success
            });
          },
          error: (error) => {
            Swal.fire('Error', error.error?.detail || 'Failed to approve application.', 'error')
          }
        });
      } else if (result.isDenied) {
/*         if (action === 'commissioner' || forwardTo === 'joint_commissioner') {
          // Go back to Step 2
          this.approveStep2_forward(application, remarks);
        } else { */
          // Go back to Step 1
          this.approveStep1_review(application);
//        }
      }
    });
  }
  
  // Method to handle application rejection
  onReject(application: ApplicationStage): void {
    this.rejectStep1_review(application); // Start rejection process
  }
  
  // Step 1: Review remarks for rejection
  rejectStep1_review(application: ApplicationStage): void {
    Swal.fire({
      title: 'Step 1: Rejection Remarks',
      input: 'textarea',
      inputLabel: 'Write reason for rejection',
      inputPlaceholder: 'Enter remarks here...',
      inputAttributes: {
        'aria-label': 'Rejection remarks',
      },
      showDenyButton: true,
      showCancelButton: false,
      confirmButtonText: 'Next',
      denyButtonText: 'Back',
      showCloseButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'Remarks are required to proceed.';
        }
        return null;
      }
    }).then(result => {
      if (result.isConfirmed) {
        const remarks = result.value; // Guaranteed non-empty now
        this.rejectStep2_confirm(application, remarks); // Proceed to confirmation
      } else if (result.isDenied) {
        this.onView(application); // Go back to view dialog
      }
    });
  }
  
  // Step 2: Confirm application rejection
  rejectStep2_confirm(application: ApplicationStage, remarks: string): void {
    Swal.fire({
      title: 'Step 2: Confirm Rejection',
      html: `
        <p><strong>Application ID:</strong> ${application.id}</p>
        <p><strong>Remarks:</strong> ${remarks}</p>
      `,
      icon: 'warning',
      showDenyButton: true,
      showCancelButton: false,
      confirmButtonText: 'Confirm Reject',  
      denyButtonText: 'Back',
      showCloseButton: true,
    }).then(result => {
      if (result.isConfirmed) {
        // Call API to reject application
        this.licenseApplicationService.advanceApplication(application.id, 'reject', remarks).subscribe({
          next: () => {
            Swal.fire('Rejected!', 'The application was rejected successfully.', 'success')
            .then(() => {
              location.reload(); // Refresh the page after showing success
            });
          },
          error: (error) => {
            Swal.fire('Error', error.error?.detail || 'Failed to reject application.', 'error');
          }
        });
      } else if (result.isDenied) {
        this.rejectStep1_review(application); // Go back to review step
      }
    });
  }

  siteEnquiryForm(application: ApplicationStage): void {
    this.dialog.open(SiteEnquiryFormComponent, {
      width: '70%',        
      maxWidth: '100%',
      maxHeight: '100%',
      data: {
        applicationId: application.id
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