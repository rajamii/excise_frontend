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

interface RegisterRecord {
  billNo: string;
  date: string;
  distributor: string;
  depotAddress: string;
  vehicleNumber: string;
  products: Product[];
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
      ]
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
      ]
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
      ]
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
}


