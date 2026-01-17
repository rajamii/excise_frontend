import { Component, Inject } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import Swal from 'sweetalert2';
import { LicenseApplication } from '../../../../../core/models/license-application.model';

@Component({
  selector: 'app-print-application',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './print-application.component.html',
  styleUrl: './print-application.component.scss'
})
export class PrintApplicationComponent {
  application: LicenseApplication;

  constructor(
    public dialogRef: MatDialogRef<PrintApplicationComponent>,
    private licenseApplicationService: LicenseApplicationService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    // Extract the application object passed to the dialog
    this.application = data.application;
  }

  onPrint(): void {
    // ✅ FIXED: Use application_id instead of applicationId
    this.licenseApplicationService.printLicense(this.application.application_id!).subscribe({
      next: (res: any) => {
        // ✅ FIXED: Use print_count instead of printCount
        this.application.print_count = res.print_count;

        // Trigger the actual browser print dialog with license layout
        this.triggerPrint();

        Swal.fire('Printed', 'License printed successfully.', 'success');
      },
      error: (err: any) => {
        // Show error message using SweetAlert if the print API call fails
        Swal.fire('Error', err?.error?.error || 'Failed to print license.', 'error');
      }
    });
  }

  onPay(): void {
    Swal.fire('Payment');
  }

  // Returns CSS styles as a string to be applied during print
  private getPrintStyles(): string {
    return `
      .license-header {
        text-align: center;
        margin-bottom: 20px;
        font-family: 'Times New Roman', Times, serif;
      }
      .license-header img {
        width: 100px;
        margin-bottom: 8px;
      }
      .license-header h3,
      .license-header p {
        margin: 4px;
      }
      .license-header .act {
        font-style: italic;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      table .key {
        width: 30%;
        font-weight: 700;
      }
      table .colon {
        width: 10%;
        text-align: center;
      }
      table .value {
        width: 60%;
      }
      .license-details-container {
        margin-bottom: 20px;
      }
      .license-restrictions {
        margin-bottom: 20px;
      }
      .license-restrictions h4 {
        margin-bottom: 8px;
      }
      .license-restrictions table {
        width: 100%;
        border-collapse: collapse;
      }
      .license-restrictions th,
      .license-restrictions td {
        border: 1px solid #000;
        text-align: left;
        padding: 4px;
      }
      .terms p {
        font-weight: 700;
        margin-bottom: 8px;
      }
      .terms ol {
        margin: 0;
        padding-left: 27px;
      }
      .terms ol li {
        margin-bottom: 8px;
      }
    `;
  }

  triggerPrint(): void {
    const printContents = document.getElementById('licenseToPrint')?.innerHTML;
    const printStyles = this.getPrintStyles();

    // ✅ FIXED: Use application_id instead of applicationId
    // Open a new popup window to render license HTML for printing
    const popupWin = window.open('', '_blank', 'width=800,height=600');
    popupWin?.document.open();
    popupWin?.document.write(`
      <html>
        <head>
          <title>${this.application.application_id}</title>
          <style>${printStyles}</style>
        </head>
        <script>
          // Replace default about:blank URL in the new tab with a custom one
          window.history.replaceState({}, 'License Print', '/license/print/${this.application.application_id}');
        </script>
        <body onload="window.print(); window.close();">
          ${printContents}
        </body>
      </html>
    `);
    popupWin?.document.close();
  }
}