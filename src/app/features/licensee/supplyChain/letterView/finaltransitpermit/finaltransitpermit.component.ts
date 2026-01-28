import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../../../shared/material.module';
import { Router } from '@angular/router';

@Component({
  selector: 'app-finaltransitpermit',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './finaltransitpermit.component.html',
  styleUrl: './finaltransitpermit.component.scss'
})
export class FinaltransitpermitComponent implements OnInit {
  permitData: any = null;
  currentDate = new Date();

  constructor(private router: Router) { }

  ngOnInit() {
    this.loadPermitData();
  }

  loadPermitData() {
    const data = localStorage.getItem('finalTransitPermitData');
    if (data) {
      this.permitData = JSON.parse(data);
      console.log('Loaded permit data:', this.permitData);
    } else {
      console.error('No permit data found');
      // this.router.navigate(['/dev-oic-transit-permit']); // Optional: redirect back if no data
    }
  }

  printPermit() {
    window.print();
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
