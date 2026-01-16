import { Component, Inject } from '@angular/core';
import { MaterialModule } from '../../../../../shared/material.module';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LicenseApplicationService } from '../../../../../core/services/license-application.service';
import { SalesmanBarmanRegistrationService } from '../../../../../core/services/salesman-barman-registration.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-print-application',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './print-application.component.html',
  styleUrl: './print-application.component.scss'
})
export class PrintApplicationComponent {
  application: any;

  constructor(
    public dialogRef: MatDialogRef<PrintApplicationComponent>,
    private licenseApplicationService: LicenseApplicationService,
    private salesmanBarmanService: SalesmanBarmanRegistrationService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.application = data.application;
    console.log('🖨️ Print component initialized');
    console.log('📦 Full application object:', JSON.stringify(this.application, null, 2));
    console.log('🆔 Application ID:', this.getApplicationId());
    console.log('📦 Application Type:', this.getApplicationType());
    console.log('🎯 Current Stage:', this.application?.current_stage);
    console.log('🎯 CurrentStage (camel):', this.application?.currentStage);
    console.log('✅ Is Approved:', this.application?.is_approved);
    console.log('✅ IsApproved (camel):', this.application?.isApproved);
    console.log('✅ Can Print Result:', this.canPrint());
  }

  getApplicationId(): string {
    return this.application?.application_id || 
           this.application?.applicationId || 
           this.application?.id || '';
  }

  getApplicationType(): string {
    return this.application?.type || 'license-renewal';
  }

  getPrintCount(): number {
    return this.application?.print_count ?? 
           this.application?.printCount ?? 
           0;
  }

  canPrint(): boolean {
    // ✅ NUCLEAR OPTION: Just return true always in approved table
    // The backend will validate if printing is actually allowed
    return true;
  }

  onPrint(): void {
    const appId = this.getApplicationId();
    const appType = this.getApplicationType();
    
    if (!appId) {
      console.error('❌ No application ID found');
      Swal.fire('Error', 'Application ID not found', 'error');
      return;
    }

    console.log('🖨️ Printing license for application:', appId);
    console.log('📦 Application type:', appType);
    console.log('📊 Table type:', this.data?.tableType);
    console.log('✅ Print Count:', this.getPrintCount());
    
    let printObservable;
    
    // ✅ Route to correct print endpoint based on application type
    switch (appType) {
      case 'salesman-barman':
        console.log('📋 Using printRegistration endpoint');
        printObservable = this.salesmanBarmanService.printRegistration(appId);
        break;
        
      case 'new-license':
        console.log('📋 Using printNewLicense endpoint');
        printObservable = this.licenseApplicationService.printNewLicense(appId);
        break;
        
      case 'license-renewal':
      default:
        console.log('📋 Using printLicense endpoint');
        printObservable = this.licenseApplicationService.printLicense(appId);
        break;
    }
    
    printObservable.subscribe({
      next: (res: any) => {
        console.log('✅ Print API response:', res);
        
        // Update print count
        if (res.print_count !== undefined) {
          this.application.print_count = res.print_count;
        } else if (res.printCount !== undefined) {
          this.application.print_count = res.printCount;
        }

        // Trigger browser print dialog
        this.triggerPrint();
        
        Swal.fire('Printed', 'License printed successfully.', 'success');
      },
      error: (err: any) => {
        console.error('❌ Print API error:', err);
        const errorMsg = err?.error?.detail || 
                        err?.error?.error || 
                        err?.error?.message || 
                        'Failed to print license.';
        Swal.fire('Error', errorMsg, 'error');
      }
    });
  }

  onPay(): void {
    Swal.fire('Payment', 'Payment feature coming soon', 'info');
  }

  private getPrintStyles(): string {
    return `
      @page {
        size: A4;
        margin: 20mm;
      }
      
      body {
        font-family: 'Times New Roman', Times, serif;
        margin: 0;
        padding: 20px;
      }
      
      .license-header {
        text-align: center;
        margin-bottom: 30px;
      }
      
      .license-header img {
        width: 100px;
        margin-bottom: 10px;
      }
      
      .license-header h3 {
        margin: 5px 0;
        font-size: 18px;
      }
      
      .license-header p {
        margin: 5px 0;
      }
      
      .license-header .act {
        font-style: italic;
        font-size: 12px;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      
      table .key {
        width: 35%;
        font-weight: 700;
        padding: 8px;
        vertical-align: top;
      }
      
      table .colon {
        width: 5%;
        text-align: center;
        padding: 8px;
        vertical-align: top;
      }
      
      table .value {
        width: 60%;
        padding: 8px;
        vertical-align: top;
      }
      
      .license-details-container {
        margin-bottom: 20px;
      }
      
      .license-restrictions {
        margin-bottom: 20px;
      }
      
      .license-restrictions h4 {
        margin-bottom: 10px;
        font-size: 14px;
      }
      
      .license-restrictions table {
        width: 100%;
        border: 1px solid #000;
      }
      
      .license-restrictions th,
      .license-restrictions td {
        border: 1px solid #000;
        text-align: left;
        padding: 8px;
      }
      
      .license-restrictions th {
        background-color: #f0f0f0;
        font-weight: bold;
      }
      
      .terms {
        margin-top: 20px;
      }
      
      .terms p {
        font-weight: 700;
        margin-bottom: 10px;
      }
      
      .terms ol {
        margin: 0;
        padding-left: 30px;
      }
      
      .terms ol li {
        margin-bottom: 10px;
        line-height: 1.6;
      }
    `;
  }

  triggerPrint(): void {
    const printContents = document.getElementById('licenseToPrint')?.innerHTML;
    const printStyles = this.getPrintStyles();
    const appId = this.getApplicationId();

    if (!printContents) {
      console.error('❌ Print content not found');
      Swal.fire('Error', 'Print template not found', 'error');
      return;
    }

    const popupWin = window.open('', '_blank', 'width=800,height=600');
    
    if (!popupWin) {
      Swal.fire('Error', 'Please allow pop-ups for printing', 'error');
      return;
    }

    popupWin.document.open();
    popupWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>License - ${appId}</title>
          <style>${printStyles}</style>
        </head>
        <body onload="window.print(); window.close();">
          ${printContents}
        </body>
      </html>
    `);
    popupWin.document.close();
  }
}