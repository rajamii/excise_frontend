import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../../../../../shared/material.module';
import { Router } from '@angular/router';
import { SupplyChainService } from '../../services/supplychain.service';

@Component({
  selector: 'app-finaltransitpermit',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule],
  templateUrl: './finaltransitpermit.component.html',
  styleUrl: './finaltransitpermit.component.scss'
})
export class FinaltransitpermitComponent implements OnInit {
  permitData: any = null;
  currentDate = new Date();
  selectedColor: string = 'white';

  constructor(
    private router: Router,
    private supplyChainService: SupplyChainService
  ) { }

  ngOnInit() {
    this.loadPermitData();
  }

  onColorChange() {
    console.log('Color changed to:', this.selectedColor);
  }

  loadPermitData() {
    const data = localStorage.getItem('finalTransitPermitData');
    if (data) {
      this.permitData = JSON.parse(data);
      console.log('Loaded permit data:', this.permitData);

      // Fetch dynamic ML conversion data to ensure 'Total Bottles' is correct
      this.supplyChainService.getBrandMlInCases().subscribe({
        next: (mlData: any[]) => {
          console.log('Fetched ML Data for View:', mlData);
          if (this.permitData && this.permitData.brands) {
            this.permitData.brands.forEach((brand: any) => {
              const size = brand.size_ml || brand.sizeMl;
              const mlConfig = mlData.find((m: any) => m.ml == size);

              if (mlConfig) {
                brand.bottles_per_case = mlConfig.pieces_in_case || mlConfig.piecesInCase;
                console.log(`Updated ${brand.brand} (${size}ml) to ${brand.bottles_per_case} bottles/case`);
              }
            });
          }
        },
        error: (err) => console.error('Failed to load ML data for permit view', err)
      });

    } else {
      console.error('No permit data found');
      // this.router.navigate(['/dev-oic-transit-permit']); // Optional: redirect back if no data
    }
  }

  printPermit() {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (printWindow) {
      // Get the permit content
      const permitContent = document.querySelector('.permit-container');
      
      if (permitContent) {
        // Create the print HTML
        const printHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Transit Permit</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: 'Times New Roman', serif;
                background: white;
                margin: 0;
                padding: 0;
              }
              
              .permit-container {
                margin: 0;
                padding: 0;
                background: transparent;
              }
              
              .permit-container.yellow-bg .permit-page {
                background: #ffff99 !important;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
              }
              
              .permit-container.yellow-bg .permit-content {
                background: #ffff99 !important;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
              }
              
              .permit-page {
                width: 100%;
                padding: 8mm;
                background: white;
                page-break-after: always;
                page-break-inside: avoid;
                height: 100vh;
                min-height: 100vh;
                max-height: 100vh;
                overflow: hidden;
                position: relative;
              }
              
              .permit-page:last-child {
                page-break-after: auto;
              }
              
              .permit-page::before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 0;
                pointer-events: none;
                opacity: 0.2;
                background-image: url("data:image/svg+xml,%3Csvg width='300' height='300' viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cstyle%3E .watermark %7B font-size: 24px; font-weight: bold; fill: %23000; font-family: Arial, sans-serif; opacity: 0.5; %7D %3C/style%3E%3Ctext x='0' y='50' class='watermark'%3ESIKKIM EXCISE SIKKIM EXCISE%3C/text%3E%3Ctext x='0' y='100' class='watermark'%3ESIKKIM EXCISE SIKKIM EXCISE%3C/text%3E%3Ctext x='0' y='150' class='watermark'%3ESIKKIM EXCISE SIKKIM EXCISE%3C/text%3E%3Ctext x='0' y='200' class='watermark'%3ESIKKIM EXCISE SIKKIM EXCISE%3C/text%3E%3Ctext x='0' y='250' class='watermark'%3ESIKKIM EXCISE SIKKIM EXCISE%3C/text%3E%3C/svg%3E");
                background-repeat: repeat;
                background-size: 300px 300px;
              }
              
              .permit-content {
                position: relative;
                z-index: 1;
                color: #000;
                background: white;
                height: 100%;
                display: flex;
                flex-direction: column;
              }
              
              .bill-type {
                position: absolute;
                top: -5px;
                right: 10px;
                font-weight: bold;
                font-size: 18px;
                color: #d32f2f;
                background: rgba(255, 255, 255, 0.95);
                padding: 8px 15px;
                border: 2px solid #d32f2f;
                border-radius: 5px;
                z-index: 3;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              
              .header {
                text-align: center;
                margin-bottom: 20px;
                margin-top: 60px;
                border-bottom: 2px double #000;
                padding-bottom: 15px;
                flex-shrink: 0;
              }
              
              .header h1 {
                font-size: 22px;
                font-weight: bold;
                margin: 4px 0;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              
              .header h2 {
                font-size: 16px;
                font-weight: bold;
                margin: 4px 0;
              }
              
              .header h3 {
                font-size: 14px;
                font-weight: normal;
                margin: 4px 0;
                font-style: italic;
              }
              
              .form-number {
                position: absolute;
                top: 40px;
                right: 40px;
                font-weight: bold;
                font-size: 14px;
              }
              
              .permit-info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 20px;
                flex-shrink: 0;
              }
              
              .info-item {
                display: flex;
                margin-bottom: 8px;
              }
              
              .info-item label {
                font-weight: bold;
                width: 140px;
                flex-shrink: 0;
                font-size: 14px;
              }
              
              .info-item span {
                border-bottom: 1px dotted #999;
                flex-grow: 1;
                padding-left: 5px;
                font-size: 14px;
              }
              
              .liquor-table-container {
                margin-bottom: 20px;
                flex-shrink: 0;
              }
              
              .liquor-table-container h3 {
                font-size: 16px;
                margin-bottom: 10px;
              }
              
              table {
                width: 100%;
                border-collapse: collapse;
              }
              
              th, td {
                border: 1px solid #000;
                padding: 4px;
                text-align: left;
                font-size: 12px;
              }
              
              th {
                background-color: #f0f0f0;
                font-weight: bold;
                text-align: center;
              }
              
              .text-right {
                text-align: right;
              }
              
              .text-center {
                text-align: center;
              }
              
              tfoot {
                font-weight: bold;
                background-color: #f9f9f9;
              }
              
              .amount-words {
                margin: 15px 0;
                font-weight: bold;
                font-style: italic;
                font-size: 14px;
                border: 1px solid #000;
                padding: 8px;
                text-align: center;
                flex-shrink: 0;
              }
              
              .terms-section {
                margin-top: 15px;
                font-size: 12px;
                position: relative;
                flex-grow: 1;
              }
              
              .terms-header {
                margin-bottom: 5px;
                padding-right: 150px;
                line-height: 1.3;
              }
              
              .date-header-right {
                position: absolute;
                top: 0;
                right: 0;
                font-weight: bold;
                font-size: 16px;
              }
              
              .date-header-right span {
                font-family: 'Courier New', monospace;
                border-bottom: 1px dotted #333;
                padding: 0 5px;
              }
              
              .terms-list {
                padding-left: 20px;
                margin: 8px 0;
              }
              
              .terms-list li {
                margin-bottom: 4px;
                line-height: 1.2;
                padding-left: 5px;
              }
              
              .validity-line, .vehicle-line {
                font-weight: bold;
                margin-top: 12px;
              }
              
              .handwritten {
                font-family: 'Brush Script MT', 'Cursive', sans-serif;
                font-size: 1.1em;
                color: #000080;
                padding: 0 8px;
                transform: rotate(-1deg);
                display: inline-block;
              }
              
              .place-line {
                margin-top: 15px;
                font-weight: bold;
              }
              
              .tick-mark {
                font-size: 20px;
                color: #000080;
                position: absolute;
              }
              
              .date-bottom {
                margin-top: 8px;
                font-weight: bold;
              }
              
              .footer-signatures {
                margin-top: 20px;
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                position: relative;
                flex-shrink: 0;
              }
              
              .seal-section {
                width: 120px;
              }
              
              .signature-section {
                text-align: center;
                width: 250px;
                position: relative;
                right: 20px;
              }
              
              .signature-line {
                border-top: 1px solid #000;
                margin-bottom: 5px;
                width: 100%;
                height: 30px;
                margin-top: 0;
              }
              
              .designation {
                font-weight: bold;
                font-size: 14px;
              }
              
              .dept, .gov, .role-label {
                font-size: 12px;
              }
              
              .role-label {
                margin-top: 4px;
                font-style: italic;
              }
              
              .footer-small-print {
                margin-top: 15px;
                font-size: 9px;
                color: #666;
                border-top: 1px solid #ddd;
                padding-top: 4px;
                flex-shrink: 0;
              }
              
              @page {
                size: A4;
                margin: 0;
              }
              
              @media print {
                body {
                  margin: 0 !important;
                  padding: 0 !important;
                }
              }
            </style>
          </head>
          <body>
            ${permitContent.outerHTML.replace(/class="permit-container"/, `class="permit-container${this.selectedColor === 'yellow' ? ' yellow-bg' : ''}"`)}
          </body>
          </html>
        `;
        
        // Write content to new window
        printWindow.document.write(printHTML);
        printWindow.document.close();
        
        // Wait for content to load then print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 500);
        };
      }
    }
  }

  goBack() {
    // Navigate back to the previous page (OIC dashboard)
    window.history.back();
  }

  // Calculate total cases from brands if not available directly
  getTotalCases(): number {
    if (!this.permitData?.brands) return 0;
    return this.permitData.brands.reduce((total: number, brand: any) => total + (brand.cases || 0), 0);
  }

  // Get total duty paid
  getTotalDuty(): number {
    return this.permitData?.total_amount || 0;
  }
}
