import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HologramDataService } from '../../services/hologram-data.service';

interface HologramRequest {
  totalHolograms: number;
  hologramType: 'LOCAL' | 'EXPORT' | 'DEFENCE';
  usageDate: string;
}

@Component({
  selector: 'app-hologramrequestlevel1',
  imports: [CommonModule, FormsModule],
  templateUrl: './hologramrequestlevel1.component.html',
  styleUrl: './hologramrequestlevel1.component.scss'
})
export class Hologramrequestlevel1Component implements OnInit {

  requestData: HologramRequest = {
    totalHolograms: 0,
    hologramType: 'LOCAL',
    usageDate: ''
  };

  isSubmitting: boolean = false;
  showSuccessModal: boolean = false;
  generatedRefNumber: string = '';

  private hologramService = inject(HologramDataService);

  constructor(private router: Router) { }

  ngOnInit(): void {
    // No initialization needed for simplified form
    // Trigger rebuild
  }



  onSubmit(): void {
    if (this.isValidForm()) {
      this.isSubmitting = true;

      const payload: any = {
        quantity: this.requestData.totalHolograms,
        usage_date: this.requestData.usageDate,
        hologram_type: this.requestData.hologramType, // Send explicit type
      };

      this.hologramService.createRequest(payload).subscribe({
        next: (res) => {
          this.generatedRefNumber = res.refNo || this.generateReferenceNumber(); // Fallback if backend doesn't return refNo
          this.isSubmitting = false;
          this.showSuccessModal = true;
          console.log('✅ Request submitted successfully:', res);
        },
        error: (err) => {
          console.error('Error submitting request', err);
          this.isSubmitting = false;
          alert('Failed to submit request. Please try again.');
        }
      });
    }
  }

  // ... (keeping isValidForm and generateReferenceNumber as helpers if needed, though ref no comes from backend)

  private isValidForm(): boolean {
    return !!(
      this.requestData.totalHolograms > 0 &&
      this.requestData.hologramType &&
      this.requestData.usageDate
    );
  }

  private generateReferenceNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    return `HRQ/${year}${month}${day}/${random}`;
  }

  private saveRequest(): void {
    // Deprecated - logic moved to onSubmit API call
  }

  downloadApplication(): void {
    const applicationContent = this.generateApplicationTemplate();
    this.downloadFile(applicationContent, `Hologram_Request_${this.generatedRefNumber.replace(/\//g, '_')}.txt`);
  }

  private generateApplicationTemplate(): string {
    const currentDate = new Date().toLocaleDateString('en-IN');

    return `
HOLOGRAM REQUEST APPLICATION
============================

Reference Number: ${this.generatedRefNumber}
Application Date: ${currentDate}

APPLICANT DETAILS:
------------------
Company Name: Sikkim Distilleries Ltd
License Number: SDL/2024/001
Address: Industrial Area, Rangpo, East Sikkim - 737132
Contact: +91-3592-252001
Email: info@sikkimdistilleries.com

REQUEST DETAILS:
----------------
Hologram Type: ${this.requestData.hologramType}
Total Number of Holograms Required: ${this.requestData.totalHolograms.toLocaleString('en-IN')}
Date to Use Hologram in Factory: ${new Date(this.requestData.usageDate).toLocaleDateString('en-IN')}

DECLARATION:
------------
I hereby declare that the information provided above is true and correct to the best of my knowledge. 
I understand that any false information may lead to rejection of this application and/or legal action.

The holograms requested will be used for production purposes as per the requirements of the distillery.
Any misuse or unauthorized use of holograms will be reported immediately to the concerned authorities.

I agree to comply with all rules and regulations set forth by the Excise Department, Government of Sikkim, 
regarding the use and handling of security holograms.


Signature: _____________________
Name: [Authorized Signatory]
Designation: [Managing Director/Authorized Representative]
Date: ${currentDate}


FOR OFFICE USE ONLY:
--------------------
Application Received Date: ___________
Received By: ___________
Processing Fee: ₹___________
Approval Status: ___________
Approved By: ___________
Date of Approval: ___________
Hologram Dispatch Date: ___________

Remarks: ________________________________
________________________________________
________________________________________

Signature of Approving Authority: ___________
Name: ___________
Designation: ___________
Date: ___________

============================
End of Application
============================
`;
  }

  private downloadFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  resetForm(): void {
    this.requestData = {
      totalHolograms: 0,
      hologramType: 'LOCAL',
      usageDate: ''
    };
  }

  closeModal(): void {
    this.showSuccessModal = false;
    // Navigate back to supply chain dashboard (hologram-request tab)
    this.router.navigate(['/dashboard'], { queryParams: { section: 'hologram-request' } });
  }

  goBack(): void {
    this.router.navigate(['/dashboard'], { queryParams: { section: 'hologram-request' } });
  }
}
