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

  getTotalCases(): number {
    return this.getLineItems().reduce((sum, item) => sum + Number(item.cases || 0), 0);
  }

  getTotalBulkLitres(): number {
    return this.getLineItems().reduce((sum, item) => sum + Number(item.bulk_litres || item.bulkLitres || (item.cases * 9) || 0), 0);
  }

  getValidityDate(): string {
    const dateStr = this.permitData?.submitted_at || this.permitData?.created_at;
    const base = dateStr ? new Date(dateStr) : new Date();
    base.setDate(base.getDate() + 60);
    return base.toLocaleDateString('en-GB');
  }

  getPermitHash(): string {
    const ref = String(this.permitData?.referenceNo || this.permitData?.reference_no || 'IMFLREQ');
    return (ref + '33ecfbeb91bd24d127a40ee77dcboe5320df025fe109d63deb1c027d08abd4a6').slice(0, 48);
  }

  printPermit(): void {
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) return;

    const permitContent = document.querySelector('.permit-container')?.innerHTML;
    if (!permitContent) return;

    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pass for Import of Duty-Paid Imported Foreign Liquor - ${this.permitData?.reference_no || this.permitData?.referenceNo || ''}</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; background: white; margin: 0; padding: 0; color: #000; }
          .permit-container { margin: 0; padding: 0; background: transparent; }
          .permit-container.yellow-bg .permit-page { background: #ffff99 !important; }
          .permit-page {
            max-width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: white;
            padding: 35px;
            page-break-after: always;
            position: relative;
          }
          .bill-type { position: absolute; top: 15px; right: 25px; font-weight: bold; font-size: 14px; letter-spacing: 1px; }
          @media print {
            @page { size: A4; margin: 0; }
            body { padding: 0; }
            .permit-page { margin: 0; box-shadow: none; border: none; }
          }
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
