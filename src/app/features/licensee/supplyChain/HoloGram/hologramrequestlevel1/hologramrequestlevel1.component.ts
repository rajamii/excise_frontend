import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface HologramRequest {
  usageDate: string;
  brandName: string;
  bottleSize: string;
  totalHolograms: number;
  remarks: string;
}

interface Brand {
  value: string;
  label: string;
}

@Component({
  selector: 'app-hologramrequestlevel1',
  imports: [CommonModule, FormsModule],
  templateUrl: './hologramrequestlevel1.component.html',
  styleUrl: './hologramrequestlevel1.component.scss'
})
export class Hologramrequestlevel1Component implements OnInit {
  
  requestData: HologramRequest = {
    usageDate: '',
    brandName: '',
    bottleSize: '',
    totalHolograms: 0,
    remarks: ''
  };

  availableBrands: Brand[] = [
    { value: 'sikkim-supreme', label: 'Sikkim Supreme Whisky' },
    { value: 'himalayan-gold', label: 'Himalayan Gold Rum' },
    { value: 'royal-sikkim', label: 'Royal Sikkim Brandy' },
    { value: 'mountain-dew', label: 'Mountain Dew Vodka' },
    { value: 'gangtok-special', label: 'Gangtok Special Whisky' },
    { value: 'teesta-valley', label: 'Teesta Valley Rum' },
    { value: 'khangchendzonga', label: 'Khangchendzonga Premium' },
    { value: 'yuksom-heritage', label: 'Yuksom Heritage Whisky' }
  ];

  minDate: string = '';
  costPerHologram: number = 2.50; // Cost per hologram in rupees
  estimatedCost: number = 0;
  isSubmitting: boolean = false;
  showSuccessModal: boolean = false;
  generatedRefNumber: string = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Set minimum date to today
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
    
    // Set default usage date to tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.requestData.usageDate = tomorrow.toISOString().split('T')[0];
  }

  onBottleSizeChange(): void {
    // Recalculate cost when bottle size changes
    this.calculateEstimatedCost();
  }

  calculateEstimatedCost(): void {
    if (this.requestData.totalHolograms > 0) {
      this.estimatedCost = this.requestData.totalHolograms * this.costPerHologram;
    } else {
      this.estimatedCost = 0;
    }
  }

  onSubmit(): void {
    if (this.isValidForm()) {
      this.isSubmitting = true;
      
      // Generate reference number
      this.generatedRefNumber = this.generateReferenceNumber();
      
      // Simulate API call delay
      setTimeout(() => {
        this.saveRequest();
        this.isSubmitting = false;
        this.showSuccessModal = true;
      }, 2000);
    }
  }

  private isValidForm(): boolean {
    return !!(
      this.requestData.usageDate &&
      this.requestData.brandName &&
      this.requestData.bottleSize &&
      this.requestData.totalHolograms > 0
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
    const requestWithMetadata = {
      ...this.requestData,
      refNumber: this.generatedRefNumber,
      submissionDate: new Date().toISOString(),
      status: 'PENDING',
      estimatedCost: this.estimatedCost
    };

    // Save to localStorage (in real app, this would be an API call)
    const existingRequests = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
    existingRequests.push(requestWithMetadata);
    localStorage.setItem('hologramRequests', JSON.stringify(existingRequests));
  }

  downloadApplication(): void {
    const applicationContent = this.generateApplicationTemplate();
    this.downloadFile(applicationContent, `Hologram_Request_${this.generatedRefNumber.replace(/\//g, '_')}.txt`);
  }

  private generateApplicationTemplate(): string {
    const currentDate = new Date().toLocaleDateString('en-IN');
    const brandLabel = this.availableBrands.find(b => b.value === this.requestData.brandName)?.label || this.requestData.brandName;
    
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
Date to Use Hologram in Factory: ${new Date(this.requestData.usageDate).toLocaleDateString('en-IN')}
Brand Name: ${brandLabel}
Bottle Size: ${this.requestData.bottleSize}
Total Number of Holograms Required: ${this.requestData.totalHolograms.toLocaleString('en-IN')}
Estimated Cost: ₹${this.estimatedCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

${this.requestData.remarks ? `Additional Information:\n${this.requestData.remarks}\n` : ''}

DECLARATION:
------------
I hereby declare that the information provided above is true and correct to the best of my knowledge. 
I understand that any false information may lead to rejection of this application and/or legal action.

The holograms requested will be used solely for the production of the specified brand and bottle size 
mentioned in this application. Any misuse or unauthorized use of holograms will be reported immediately 
to the concerned authorities.

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
      usageDate: '',
      brandName: '',
      bottleSize: '',
      totalHolograms: 0,
      remarks: ''
    };
    this.estimatedCost = 0;
    
    // Reset to tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.requestData.usageDate = tomorrow.toISOString().split('T')[0];
  }

  closeModal(): void {
    this.showSuccessModal = false;
    // Navigate back to supply chain dashboard
    this.router.navigate(['/dev-supply-chain'], { queryParams: { tab: 'hologram' } });
  }

  goBack(): void {
    this.router.navigate(['/dev-supply-chain']);
  }
}
