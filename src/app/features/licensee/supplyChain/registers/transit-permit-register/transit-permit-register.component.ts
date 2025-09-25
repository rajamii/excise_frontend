import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-transit-permit-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transit-permit-register.component.html',
  styleUrls: ['./transit-permit-register.component.scss']
})
export class TransitPermitRegisterComponent {
  // Sample data mirroring Transit Permit fields
  records = [
    {
      billNo: 'TRP/2/EXCISE',
      date: '2025-09-22',
      distributor: 'M/s Karma Chopel Bhutia',
      depotAddress: 'gangtok',
      brand: 'Royal Stag',
      size: '750ml',
      cases: 20,
      educationCess: 15.5,
      exciseDuty: 125,
      additionalExcise: 45,
      vehicleNumber: 'SK 01 AB 1234'
    },
    {
      billNo: 'TRP/3/EXCISE',
      date: '2025-09-22',
      distributor: 'M/s Karma Chopel Bhutia',
      depotAddress: 'namchi',
      brand: 'Blenders Pride',
      size: '375ml',
      cases: 10,
      educationCess: 18,
      exciseDuty: 140,
      additionalExcise: 50,
      vehicleNumber: 'SK 02 CD 5678'
    },
    {
      billNo: 'TRP/4/EXCISE',
      date: '2025-09-23',
      distributor: 'M/s Karma Chopel Bhutia',
      depotAddress: 'gyalshing',
      brand: 'Imperial Blue',
      size: '180ml',
      cases: 35,
      educationCess: 14,
      exciseDuty: 110,
      additionalExcise: 40,
      vehicleNumber: 'SK 03 EF 9012'
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
      (f.brand ? r.brand === f.brand : true) &&
      (f.size ? r.size === f.size : true) &&
      (f.vehicleNumber ? r.vehicleNumber === f.vehicleNumber : true)
    );
  }

  clearFilters(): void {
    this.filters = { billNo: '', date: '', depotAddress: '', brand: '', size: '', vehicleNumber: '' };
    this.filtered = [...this.records];
  }
}


