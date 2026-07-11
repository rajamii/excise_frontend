import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { SpecialPermitService } from '../../../../../core/services/special-permit.service';
import { environment } from '../../../../../../environments/environment';

interface SpecialPermitLetterData {
  id: string;
  applicationId: string;
  applicantName: string;
  establishmentName: string;
  establishmentAddress: string;
  licenseId: string;
  licenseCategoryName: string;
  licenseSubCategoryName: string;
  districtName: string;
  modeOfOperation: string;
  paymentAmount: number;
  dryDayFeeType: string;
  permissionDuration: 'per_day' | 'per_annum';
  selectedDates: string[];
  financialYear: string;
  paymentTxnId: string;
  paymentTxnDate: string | Date;
  submittedOn: string | Date;
  approvedDate: string | Date;
}

@Component({
  selector: 'app-finalspecialpermit',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './finalspecialpermit.component.html',
  styleUrl: './finalspecialpermit.component.scss'
})
export class FinalspecialpermitComponent implements OnInit {
  permitData?: SpecialPermitLetterData;
  isBrowser = false;
  isLoading = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private specialPermitService: SpecialPermitService,
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      let id = this.route.snapshot.paramMap.get('id');
      if (!id) {
        id = this.route.snapshot.queryParamMap.get('id');
      }

      if (id) {
        this.loadSpecialPermitData(id);
      } else {
        this.errorMessage = 'Application ID not provided.';
      }
    }
  }

  private loadSpecialPermitData(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.specialPermitService.getSpecialPermitDetail(id).subscribe({
      next: (data) => {
        console.log('Special Permit data received:', data);
        if (data) {
          this.mapApiDataToPermit(data);
        } else {
          this.errorMessage = 'Special permit application not found.';
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading special permit data:', error);
        this.errorMessage = 'Failed to load special permit details. Please try again.';
        this.isLoading = false;
      }
    });
  }

  private mapApiDataToPermit(apiData: any): void {
    const selectedDates = Array.isArray(apiData.selectedDates) ? apiData.selectedDates :
                          (Array.isArray(apiData.selected_dates) ? apiData.selected_dates : []);
    
    this.permitData = {
      id: apiData.id || apiData.applicationId || apiData.application_id || '',
      applicationId: apiData.applicationId || apiData.application_id || apiData.id || '',
      applicantName: apiData.applicantName || apiData.applicant_name || '',
      establishmentName: apiData.establishmentName || apiData.establishment_name || '',
      establishmentAddress: apiData.establishmentAddress || apiData.establishment_address || apiData.districtName || apiData.district_name || 'Sikkim',
      licenseId: apiData.licenseId || apiData.license_id || '',
      licenseCategoryName: apiData.licenseCategoryName || apiData.license_category_name || '',
      licenseSubCategoryName: apiData.licenseSubCategoryName || apiData.license_sub_category_name || '',
      districtName: apiData.districtName || apiData.district_name || '',
      modeOfOperation: apiData.modeOfOperation || apiData.mode_of_operation || 'Self',
      paymentAmount: Number(apiData.paymentAmount ?? apiData.payment_amount ?? 0),
      dryDayFeeType: apiData.dryDayFeeType || apiData.dry_day_fee_type || '',
      permissionDuration: (apiData.permissionDuration || apiData.permission_duration) === 'per_day' ? 'per_day' : 'per_annum',
      selectedDates: selectedDates,
      financialYear: apiData.financialYear || apiData.financial_year || '',
      paymentTxnId: apiData.paymentTxnId || apiData.payment_txn_id || 'N/A',
      paymentTxnDate: (apiData.paymentTxnDate || apiData.payment_txn_date) ? new Date(apiData.paymentTxnDate || apiData.payment_txn_date) : new Date(),
      submittedOn: (apiData.createdAt || apiData.created_at) ? new Date(apiData.createdAt || apiData.created_at) : new Date(),
      approvedDate: (apiData.updatedAt || apiData.updated_at) ? new Date(apiData.updatedAt || apiData.updated_at) : new Date()
    };
  }

  getFormattedDates(): string {
    if (!this.permitData?.selectedDates || this.permitData.selectedDates.length === 0) {
      return '';
    }
    
    // Sort dates chronologically
    const sorted = [...this.permitData.selectedDates].sort();
    
    const formatted = sorted.map(d => {
      const parts = d.split('-');
      if (parts.length === 3) {
        // yyyy-mm-dd to dd.mm.yyyy
        return `${parts[2]}.${parts[1]}.${parts[0]}`;
      }
      return d;
    });

    if (formatted.length === 1) {
      return formatted[0];
    } else if (formatted.length === 2) {
      return `${formatted[0]} & ${formatted[1]}`;
    } else {
      return `${formatted.slice(0, -1).join(', ')} & ${formatted[formatted.length - 1]}`;
    }
  }

  getDryDayBaseFee(): number {
    if (!this.permitData) return 0;
    const amount = this.permitData.paymentAmount;
    const count = this.permitData.selectedDates.length;
    if (this.permitData.permissionDuration === 'per_day' && count > 0) {
      return amount / count;
    }
    return amount;
  }

  printPermit(): void {
    if (!this.isBrowser) return;

    const printContent = document.getElementById('specialPermitPrintSection');
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      alert('Please allow popups to print the permit.');
      return;
    }

    const title = this.permitData?.permissionDuration === 'per_day' 
      ? 'Special Permission Letter' 
      : 'Special Permission Certificate';
    const refNo = this.permitData?.applicationId || '';

    const clonedSection = printContent.cloneNode(true) as HTMLElement;

    // Convert relative image sources to absolute URLs using current origin
    let allContent = clonedSection.outerHTML;
    const assetBaseUrl = `${window.location.origin}/`;
    allContent = allContent.replace(
      /src="assets\//g,
      `src="${assetBaseUrl}assets/`
    );

    // Inject styles specifically for print window
    const styles = `
      <style>
        body {
          font-family: 'Times New Roman', serif;
          margin: 0;
          padding: 0;
          background: #fff;
          color: #000;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @page {
          size: A4;
          margin: 12mm 10mm;
        }
        * {
          box-sizing: border-box;
        }
        .final-letter-container {
          position: relative;
          padding: 35px 30px;
          box-sizing: border-box;
          max-width: 198mm;
          min-height: 260mm;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .final-certificate-container {
          position: relative;
          padding: 50px 40px;
          box-sizing: border-box;
          max-width: 198mm;
          min-height: 260mm;
          margin: 0 auto;
          border: 4px double #000;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        
        // Watermark CSS
        .print-watermark {
          display: flex !important;
          position: absolute;
          inset: 10px;
          flex-direction: column;
          justify-content: space-around;
          align-items: center;
          pointer-events: none;
          user-select: none;
          z-index: 0;
          overflow: hidden;
          transform: rotate(-25deg) scale(1.25);
        }
        .print-watermark span {
          display: block !important;
          font-family: Arial, sans-serif;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 2.5px;
          color: rgba(22, 88, 58, 0.055) !important;
          white-space: nowrap;
          line-height: 1.6;
          width: 100%;
          text-align: center;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .letter-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          font-weight: bold;
          margin-bottom: 35px;
          position: relative;
          z-index: 1;
        }
        .logos-container {
          display: flex;
          justify-content: space-between;
          width: 100%;
          margin-bottom: 15px;
        }
        .govt-logo {
          height: 80px;
          width: auto;
          object-fit: contain;
        }
        .dept-title {
          font-size: 23px;
          letter-spacing: 1px;
          margin: 3px 0;
        }
        .dept-subtitle {
          font-size: 18px;
          margin: 2px 0;
        }
        .dept-address {
          font-size: 13px;
          font-weight: normal;
          margin-top: 5px;
        }
        .divider-line {
          width: 100%;
          height: 1px;
          background-color: #000;
          margin-top: 5px;
          margin-bottom: 20px;
        }
        .letter-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          font-size: 16px;
          font-weight: bold;
          position: relative;
          z-index: 1;
        }
        .addressee-section {
          margin-bottom: 30px;
          line-height: 1.6;
          font-size: 16px;
          position: relative;
          z-index: 1;
        }
        .addressee-details {
          margin-left: 20px;
        }
        .subject-section {
          margin-bottom: 30px;
          position: relative;
          z-index: 1;
        }
        .subject-line {
          font-weight: bold;
          font-size: 16px;
          line-height: 1.6;
          text-align: justify;
        }
        .letter-body {
          margin-bottom: 50px;
          text-align: justify;
          line-height: 1.75;
          font-size: 16px;
          text-indent: 40px;
          position: relative;
          z-index: 1;
        }
        .bottom-signatures {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: auto;
          padding-top: 30px;
          position: relative;
          z-index: 1;
        }
        .seal-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: 12px;
        }
        .stamp-image {
          height: 85px;
          width: auto;
          opacity: 0.85;
        }
        .seal-label {
          font-weight: bold;
          text-transform: uppercase;
          margin-top: 3px;
        }
        .seal-label-sub {
          font-size: 10px;
          color: #555;
        }
        .signature-container {
          text-align: right;
          font-size: 15px;
          line-height: 1.5;
        }
        .signature-image {
          height: 48px;
          width: auto;
          margin-bottom: 5px;
        }
        .footer-address-bar {
          text-align: center;
          font-size: 12px;
          border-top: 1px solid #ccc;
          margin-top: 40px;
          padding-top: 10px;
          color: #555;
          position: relative;
          z-index: 1;
        }
        .certificate-title {
          font-size: 21px;
          font-weight: bold;
          text-align: center;
          text-decoration: underline;
          margin-bottom: 40px;
          text-transform: uppercase;
          position: relative;
          z-index: 1;
          letter-spacing: 0.5px;
        }
        .details-table {
          width: 90%;
          margin: 0 auto 35px auto;
          border-collapse: collapse;
          font-size: 16px;
          position: relative;
          z-index: 1;
        }
        .details-table td {
          padding: 10px 12px;
          vertical-align: top;
        }
        .details-table td.label-cell {
          font-weight: bold;
          width: 35%;
        }
        .details-table td.colon-cell {
          width: 3%;
          text-align: center;
        }
        .details-table td.value-cell {
          width: 62%;
        }
        .certificate-body {
          font-size: 16px;
          line-height: 1.75;
          text-align: justify;
          width: 90%;
          margin: 0 auto 45px auto;
          position: relative;
          z-index: 1;
        }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - ${refNo}</title>
          <meta charset="utf-8">
          ${styles}
        </head>
        <body>
          ${allContent}
        </body>
      </html>
    `);

    printWindow.document.close();

    // Wait for images to load
    const images = printWindow.document.getElementsByTagName('img');
    let loaded = 0;
    const checkPrint = () => {
      loaded++;
      if (loaded >= images.length) {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }, 300);
      }
    };

    if (images.length === 0) {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 500);
    } else {
      Array.from(images).forEach(img => {
        img.onload = checkPrint;
        img.onerror = checkPrint;
      });
    }
  }

  goBack(): void {
    const source = this.route.snapshot.queryParamMap.get('source');
    
    if (source === 'commissioner') {
      this.router.navigate(['/dashboard'], { queryParams: { section: 'special-permit' } });
    } else if (source === 'licensee') {
      this.router.navigate(['/dashboard'], { queryParams: { section: 'special-permit' } });
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  getBackButtonText(): string {
    const source = this.route.snapshot.queryParamMap.get('source');
    return source ? 'Back to Dashboard' : 'Go Back';
  }
}
