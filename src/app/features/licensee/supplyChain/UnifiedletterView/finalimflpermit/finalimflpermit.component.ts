import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MaterialModule } from '../../../../../shared/material.module';
import { DistributorPermitService } from '../../../../../core/services/distributor-permit.service';

@Component({
  selector: 'app-finalimflpermit',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule],
  templateUrl: './finalimflpermit.component.html',
  styleUrl: './finalimflpermit.component.scss'
})
export class FinalimflpermitComponent implements OnInit {
  permitData: any = null;
  currentDate = new Date();
  selectedColor: string = 'white';

  readonly copyTypes = ['ORIGINAL', 'DUPLICATE', 'TRIPLICATE', 'QUADRUPLICATE'];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private permitService: DistributorPermitService
  ) { }

  ngOnInit(): void {
    this.loadPermitData();
  }

  goBack(): void {
    this.location.back();
  }

  onColorChange(): void {
    console.log('Color changed to:', this.selectedColor);
  }

  loadPermitData(): void {
    const dataStr = localStorage.getItem('finalImflPermitData');
    if (dataStr) {
      try {
        this.permitData = JSON.parse(dataStr);
      } catch {
        this.permitData = null;
      }
    }

    const ref = this.route.snapshot.queryParams['ref'] || this.route.snapshot.queryParams['id'];
    if (ref && (!this.permitData || (this.permitData.reference_no !== ref && this.permitData.referenceNo !== ref))) {
      this.permitService.getApplication(ref).subscribe({
        next: (res: any) => {
          if (res) {
            this.permitData = res;
          }
        },
        error: (err: any) => console.error('Failed to load IMFL permit data by ref:', err)
      });
    }
  }

  getLineItems(): any[] {
    if (!this.permitData) return [];
    if (Array.isArray(this.permitData.line_items) && this.permitData.line_items.length > 0) {
      return this.permitData.line_items;
    }
    if (Array.isArray(this.permitData.lineItems) && this.permitData.lineItems.length > 0) {
      return this.permitData.lineItems;
    }
    return [];
  }

  getItemCases(item: any): number {
    if (!item) return 0;
    const cases = Number(item.cases ?? item.no_of_cases ?? item.quantity_cases ?? item.case_quantity ?? item.total_cases ?? 0);
    return isNaN(cases) ? 0 : cases;
  }

  getItemBulkLitres(item: any): number {
    if (!item) return 0;
    const directBL = item.bulk_litres ?? item.bulkLitres ?? item.bulk_liter ?? item.bulkLiter ?? item.total_bl ?? item.total_bulk_litres;
    if (directBL !== undefined && directBL !== null && directBL !== '' && !isNaN(Number(directBL))) {
      return Number(directBL);
    }
    const cases = this.getItemCases(item);
    const sizeMl = Number(item.size_ml || item.sizeMl || item.size || 750);
    const bottlesPerCase = Number(item.bottles_per_case || item.bottlesPerCase || item.case_size || (sizeMl === 750 ? 12 : sizeMl === 375 ? 24 : sizeMl === 180 ? 48 : 12));
    const calculatedBL = (cases * bottlesPerCase * (isNaN(sizeMl) ? 750 : sizeMl)) / 1000;
    return isNaN(calculatedBL) ? (cases * 9) : calculatedBL;
  }

  getTotalCases(): number {
    return this.getLineItems().reduce((sum, item) => sum + this.getItemCases(item), 0);
  }

  getTotalBulkLitres(): number {
    return this.getLineItems().reduce((sum, item) => sum + this.getItemBulkLitres(item), 0);
  }

  getValidityDate(): string {
    const dateStr = this.permitData?.submitted_at || this.permitData?.created_at;
    const base = dateStr ? new Date(dateStr) : new Date();
    base.setDate(base.getDate() + 60);
    return base.toLocaleDateString('en-GB');
  }

  printPermit(): void {
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) return;

    const permitContainer = document.querySelector('.permit-container');
    if (!permitContainer) return;

    const clonedContainer = permitContainer.cloneNode(true) as HTMLElement;
    const images = clonedContainer.querySelectorAll('img');
    images.forEach(img => {
      const src = img.getAttribute('src');
      if (src && !src.startsWith('http') && !src.startsWith('data:')) {
        img.setAttribute('src', `${window.location.origin}/${src.replace(/^\//, '')}`);
      }
    });

    const permitContent = clonedContainer.innerHTML;

    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <base href="${window.location.origin}/">
        <title>Pass for Import of Duty-Paid Imported Foreign Liquor - ${this.permitData?.reference_no || this.permitData?.referenceNo || ''}</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
        <style>
          @page { size: A4 portrait; margin: 6mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          html, body { font-family: 'Times New Roman', Times, serif; background: white; margin: 0; padding: 0; color: #000; font-size: 13px; line-height: 1.5; }
          .permit-container { margin: 0; padding: 0; background: transparent; }
          .permit-container.yellow-bg .permit-page { background-color: #ffffc2 !important; }
          .permit-page {
            width: 100%;
            max-width: 198mm;
            min-height: calc(297mm - 12mm);
            height: calc(297mm - 12mm);
            margin: 0 auto;
            background-color: #ffffff;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='330' height='160' viewBox='0 0 330 160'%3E%3Ctext x='6' y='72' font-family='Arial, sans-serif' font-size='34' font-weight='700' letter-spacing='2' fill='%2316583A' fill-opacity='0.055'%3ESIKKIM EXCISE%3C/text%3E%3Ctext x='6' y='142' font-family='Arial, sans-serif' font-size='34' font-weight='700' letter-spacing='2' fill='%2316583A' fill-opacity='0.055'%3ESIKKIM EXCISE%3C/text%3E%3C/svg%3E") !important;
            background-repeat: repeat !important;
            background-position: top center !important;
            background-size: 330px 160px !important;
            padding: 20px 24px 16px 24px;
            border: 2px solid #1e3a8a !important;
            border-radius: 4px;
            page-break-after: always;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .permit-page:last-child { page-break-after: auto; }
          .permit-content { height: 100%; display: flex; flex-direction: column; justify-content: space-between; flex: 1; }
          .permit-body-content { flex: 1 0 auto; }
          .bill-type { position: absolute; top: 12px; right: 18px; font-weight: 800; font-size: 13px; letter-spacing: 1px; color: #111; text-transform: uppercase; }
          .permit-logo-img { height: 55px !important; width: auto !important; object-fit: contain !important; display: inline-block !important; }
          .dept-title { font-size: 20px; font-weight: 800; letter-spacing: 1.5px; color: #1e3a8a; text-transform: uppercase; margin: 0; text-align: center; }
          .state-title { font-size: 14px; font-weight: 700; letter-spacing: 0.8px; color: #1e3a8a; text-transform: uppercase; text-align: center; margin-top: 2px; }
          .pass-title-box { border-top: 2px solid #1e3a8a; border-bottom: 2px solid #1e3a8a; padding: 6px 0; margin: 10px 0; text-align: center; }
          .pass-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #1e3a8a; }
          .info-row { display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; font-weight: bold; margin-bottom: 10px; }
          .auth-paragraph { font-size: 12.5px; line-height: 1.6; text-align: justify; margin-bottom: 12px; }
          .table-heading { font-size: 12.5px; font-weight: bold; text-decoration: underline; text-align: center; margin-bottom: 6px; }
          .liquor-table { width: 100% !important; border-collapse: collapse !important; font-size: 11.5px !important; margin-bottom: 12px !important; }
          .liquor-table th, .liquor-table td { border: 1.2px solid #000 !important; padding: 5px 8px !important; }
          .liquor-table th { background-color: #f1f5f9 !important; font-weight: 700 !important; text-align: center !important; }
          .liquor-table tfoot td { background-color: #f8fafc !important; font-weight: 700 !important; }
          .signature-block { margin-top: 10px; margin-bottom: 10px; }
          .signature-image { max-height: 44px !important; width: auto !important; object-fit: contain !important; display: block !important; margin: 0 auto 2px auto !important; }
          .conditions-section { border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 10.5px; margin-top: auto; }
          .conditions-title { font-weight: bold; text-transform: uppercase; text-decoration: underline; margin-bottom: 3px; }
          .conditions-list { padding-left: 16px; margin-bottom: 4px; line-height: 1.35; }
          .conditions-list li { margin-bottom: 2px; }
          .statutory-note { font-style: italic; color: #444; font-size: 9.5px; text-align: center; }
          .hash-text { font-size: 9px; font-family: monospace; color: #666; margin-bottom: 4px; }
        </style>
      </head>
      <body>
        <div class="permit-container ${this.selectedColor === 'yellow' ? 'yellow-bg' : ''}">
          ${permitContent}
        </div>
        <script>
          setTimeout(() => { window.print(); window.close(); }, 500);
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
  }
}
