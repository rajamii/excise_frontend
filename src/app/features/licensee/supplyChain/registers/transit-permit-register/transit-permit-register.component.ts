import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Product {
  brand: string;
  size: string;
  cases: number;
  educationCess: number;
  exciseDuty: number;
  additionalExcise: number;
}

interface PaymentDetails {
  status: 'Paid' | 'Pending' | 'Failed';
  totalAmount: number;
  walletDeduction: {
    exciseWallet: number;
    educationCessWallet: number;
  };
  amountUtilized: number;
  amountLeft: number;
  paymentDate?: string;
}

interface RegisterRecord {
  billNo: string;
  date: string;
  distributor: string;
  depotAddress: string;
  vehicleNumber: string;
  products: Product[];
  payment: PaymentDetails;
}

@Component({
  selector: 'app-transit-permit-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transit-permit-register.component.html',
  styleUrls: ['./transit-permit-register.component.scss']
})

export class TransitPermitRegisterComponent {
  // Sample data mirroring Transit Permit fields
  records: RegisterRecord[] = [
    {
      billNo: 'TRP/2/EXCISE',
      date: '2025-09-22',
      distributor: 'M/s Karma Chopel Bhutia',
      depotAddress: 'gangtok',
      vehicleNumber: 'SK 01 AB 1234',
      products: [
        {
          brand: 'Royal Stag',
          size: '750ml',
          cases: 20,
          educationCess: 15.5,
          exciseDuty: 125,
          additionalExcise: 45
        },
        {
          brand: 'Blenders Pride',
          size: '375ml',
          cases: 15,
          educationCess: 18,
          exciseDuty: 140,
          additionalExcise: 50
        }
      ],
      payment: {
        status: 'Paid',
        totalAmount: 5550,
        walletDeduction: {
          exciseWallet: 3975,
          educationCessWallet: 1575
        },
        amountUtilized: 5550,
        amountLeft: 0,
        paymentDate: '2025-09-22'
      }
    },
    {
      billNo: 'TRP/3/EXCISE',
      date: '2025-09-22',
      distributor: 'M/s Karma Chopel Bhutia',
      depotAddress: 'namchi',
      vehicleNumber: 'SK 02 CD 5678',
      products: [
        {
          brand: 'Imperial Blue',
          size: '180ml',
          cases: 35,
          educationCess: 14,
          exciseDuty: 110,
          additionalExcise: 40
        }
      ],
      payment: {
        status: 'Paid',
        totalAmount: 5740,
        walletDeduction: {
          exciseWallet: 3850,
          educationCessWallet: 1890
        },
        amountUtilized: 5740,
        amountLeft: 0,
        paymentDate: '2025-09-22'
      }
    },
    {
      billNo: 'TRP/4/EXCISE',
      date: '2025-09-23',
      distributor: 'M/s Karma Chopel Bhutia',
      depotAddress: 'gyalshing',
      vehicleNumber: 'SK 03 EF 9012',
      products: [
        {
          brand: 'Officers Choice',
          size: '750ml',
          cases: 25,
          educationCess: 12,
          exciseDuty: 95,
          additionalExcise: 35
        },
        {
          brand: 'Royal Stag',
          size: '180ml',
          cases: 30,
          educationCess: 15.5,
          exciseDuty: 125,
          additionalExcise: 45
        }
      ],
      payment: {
        status: 'Pending',
        totalAmount: 5500,
        walletDeduction: {
          exciseWallet: 0,
          educationCessWallet: 0
        },
        amountUtilized: 0,
        amountLeft: 5500
      }
    }
  ];

  filters = {
    billNo: '',
    date: '',
    depotAddress: '',
    brand: '',
    size: '',
    vehicleNumber: ''
  };

  filtered = [...this.records];

  applyFilters(): void {
    const f = this.filters;
    this.filtered = this.records.filter(r =>
      (f.billNo ? r.billNo.toLowerCase().includes(f.billNo.toLowerCase()) : true) &&
      (f.date ? r.date === f.date : true) &&
      (f.depotAddress ? r.depotAddress === f.depotAddress : true) &&
      (f.brand ? r.products.some(p => p.brand === f.brand) : true) &&
      (f.size ? r.products.some(p => p.size === f.size) : true) &&
      (f.vehicleNumber ? r.vehicleNumber === f.vehicleNumber : true)
    );
  }

  clearFilters(): void {
    this.filters = { billNo: '', date: '', depotAddress: '', brand: '', size: '', vehicleNumber: '' };
    this.filtered = [...this.records];
  }

  selectedRecord: RegisterRecord | null = null;

  viewDetails(record: RegisterRecord): void {
    this.selectedRecord = record;
    const modalEl = document.getElementById('detailsModal');
    if (modalEl) {
      const modal = new (window as any).bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  getTotalEducationCess(): number {
    if (!this.selectedRecord) return 0;
    return this.selectedRecord.products.reduce((total, product) => 
      total + (product.educationCess * product.cases), 0);
  }

  getTotalExciseDuty(): number {
    if (!this.selectedRecord) return 0;
    return this.selectedRecord.products.reduce((total, product) => 
      total + (product.exciseDuty * product.cases), 0);
  }

  getTotalAdditionalExcise(): number {
    if (!this.selectedRecord) return 0;
    return this.selectedRecord.products.reduce((total, product) => 
      total + (product.additionalExcise * product.cases), 0);
  }

  getTotalAmount(): number {
    return this.getTotalEducationCess() + this.getTotalExciseDuty() + this.getTotalAdditionalExcise();
  }

  getPaymentStatusClass(status: string): string {
    switch (status) {
      case 'Paid': return 'badge bg-success';
      case 'Pending': return 'badge bg-warning';
      case 'Failed': return 'badge bg-danger';
      default: return 'badge bg-secondary';
    }
  }

  // Print helpers
  printRegister(): void {
    const printContents = document.getElementById('registerPrintSection')?.innerHTML || '';
    const originalContents = document.body.innerHTML;
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => (el as HTMLElement).outerHTML)
      .join('');

    document.body.innerHTML = `<!doctype html><html><head>${styles}<style>@media print { .no-print { display: none !important; } .print-header { display: block !important; } #registerPrintSection { padding: 0 8mm; } } @media screen { .print-header { display: none; } }</style></head><body>${printContents}</body></html>`;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  }

  getPrintMonthLabel(): string {
    if (!this.filters.date) {
      return 'All';
    }
    const d = new Date(this.filters.date);
    const month = d.toLocaleString('en-US', { month: 'long' });
    return `${month} ${d.getFullYear()}`;
  }
}


