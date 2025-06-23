import { Component, Inject } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-print-application',
  imports: [MaterialModule],
  templateUrl: './print-application.component.html',
  styleUrl: './print-application.component.scss'
})
export class PrintApplicationComponent {
  application: any;

  constructor(
    public dialogRef: MatDialogRef<PrintApplicationComponent>,
    private licenseApplicationService: LicenseApplicationService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.application = data.application;
  }

  onPrint(): void {
    this.licenseApplicationService.printLicense(this.application.application_id).subscribe({
      next: (res) => { 
        // Update local print count
        this.application.print_count = res.print_count;

        // Print actual content
        this.triggerPrint();

        Swal.fire('Printed', 'License printed successfully.', 'success');
      },
      error: (err) => {
        Swal.fire('Error', err?.error?.error || 'Failed to print license.', 'error');
      }
    });
  }

  private getPrintStyles(): string {
    return `
    .license-header{text-align:center;
    margin-bottom:20px;font-family:'Times New Roman',Times,serif}.license-header 
    img{width:100px;margin-bottom:8px}.license-header h3,.license-header 
    p{margin:4px}.license-header .act{font-style:italic}table{width:100%;
    border-collapse:collapse}table .key{width:30%;font-weight:700}table 
    .colon{width:10%;text-align:center}table .value{width:60%}.license-details-container
    {margin-bottom:20px}.license-restrictions{margin-bottom:20px}.license-restrictions 
    h4{margin-bottom:8px}.license-restrictions table{width:100%;border-collapse:collapse}
    .license-restrictions th,.license-restrictions td{border:1px solid #000;
    text-align:left;padding:4px}.terms p{font-weight:700;margin-bottom:8px}
    .terms ol{margin:0;padding-left:27px}.terms ol li{margin-bottom:8px}
    `;
  }

  triggerPrint(): void {
    const printContents = document.getElementById('licenseToPrint')?.innerHTML;
    const printStyles = this.getPrintStyles();

    const popupWin = window.open('', '_blank', 'width=800,height=600');
    popupWin?.document.open();
    popupWin?.document.write(`
      <html>
        <head>
          <title>${this.application.application_id}</title>
          <style>
            ${printStyles}
          </style>
        </head>
          <script>
          // Update the URL bar and prevent "about:blank" from showing
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
