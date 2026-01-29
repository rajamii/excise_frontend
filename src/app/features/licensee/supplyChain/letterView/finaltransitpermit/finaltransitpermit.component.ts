import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../../../shared/material.module';
import { Router } from '@angular/router';
import { SupplyChainService } from '../../services/supplychain.service';

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

  constructor(
    private router: Router,
    private supplyChainService: SupplyChainService
  ) { }

  ngOnInit() {
    this.loadPermitData();
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
