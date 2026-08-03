import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HologramDataService } from '../../services/hologram-data.service';
import { SupplyChainProfileService } from '../../../../../core/services/supply-chain-profile.service';
import { secureRandomInt } from '../../../../../core/utils/secure-random';

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
  minUsageDate = '';
  maxUsageDate = '';

  requestData: HologramRequest = {
    totalHolograms: 0,
    hologramType: 'LOCAL',
    usageDate: ''
  };

  isSubmitting: boolean = false;
  showSuccessModal: boolean = false;
  generatedRefNumber: string = '';
  establishmentName = 'N/A';

  private hologramService = inject(HologramDataService);
  private supplyChainProfileService = inject(SupplyChainProfileService);

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.initializeUsageDateWindow();
    this.loadEstablishmentName();
  }

  private initializeUsageDateWindow(): void {
    const today = new Date();
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(today.getDate() + 2);

    this.minUsageDate = this.toDateInputValue(today);
    this.maxUsageDate = this.toDateInputValue(dayAfterTomorrow);
  }

  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private isUsageDateAllowed(): boolean {
    const usageDate = String(this.requestData.usageDate || '').trim();
    if (!usageDate || !this.minUsageDate || !this.maxUsageDate) {
      return false;
    }
    return usageDate >= this.minUsageDate && usageDate <= this.maxUsageDate;
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
          this.generatedRefNumber = this.resolveReferenceNumber(res);
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
    if (!this.isUsageDateAllowed()) {
      alert(
        `Usage date must be between ${new Date(this.minUsageDate).toLocaleDateString('en-GB')} and ${new Date(this.maxUsageDate).toLocaleDateString('en-GB')}.`
      );
      return false;
    }

    return !!(
      this.requestData.totalHolograms > 0 &&
      this.requestData.hologramType &&
      this.requestData.usageDate
    );
  }

  private resolveReferenceNumber(response: any): string {
    const value = String(response?.refNo || response?.ref_no || '').trim();
    if (value) {
      return value.replace(/^NHP(?=\/)/i, 'HQR');
    }
    return this.generateReferenceNumber();
  }

  private getFinancialYear(referenceDate: Date = new Date()): string {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth() + 1;
    return month >= 4
      ? `${year}-${String(year + 1).slice(-2)}`
      : `${year - 1}-${String(year).slice(-2)}`;
  }

  private generateReferenceNumber(): string {
    const financialYear = this.getFinancialYear();
    const random = secureRandomInt(9999) + 1;
    return `HQR/1101/${financialYear}/${String(random).padStart(4, '0')}`;
  }

  private loadEstablishmentName(): void {
    this.supplyChainProfileService.getProfile().subscribe({
      next: (response) => {
        const profile = response?.data as any;
        const name = String(
          profile?.manufacturingUnitName ||
          profile?.manufacturing_unit_name ||
          ''
        ).trim();
        this.establishmentName = name || 'N/A';
      },
      error: () => {
        this.establishmentName = 'N/A';
      }
    });
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
Company Name: ${this.establishmentName}
License Number: N/A
Address: N/A
Contact: N/A
Email: N/A

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
    this.initializeUsageDateWindow();
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
