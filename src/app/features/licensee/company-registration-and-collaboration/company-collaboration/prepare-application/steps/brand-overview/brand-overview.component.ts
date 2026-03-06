import { Component, EventEmitter, Output, OnInit, DoCheck } from '@angular/core';
import { MaterialModule } from '../../../../../../../shared/material.module';
import {
  COMPANY_COLLAB_STORAGE_KEYS,
  CompanyCollaborationBrand,
  CompanyCollaborationFeeStructure
} from '../../../../../../../core/models/company-collaboration.model';
import { CompanyCollaborationService } from '../../../../../../../core/services/company-collaboration.service';

@Component({
  selector: 'app-brand-overview',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './brand-overview.component.html',
  styleUrl: './brand-overview.component.scss'
})
export class BrandOverviewComponent implements OnInit, DoCheck {
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  selectedBrands: CompanyCollaborationBrand[] = [];
  displayedColumns: string[] = ['serialNo', 'brandCode', 'brandName', 'type', 'strength', 'sizes', 'action'];

  // Fee structure - typically loaded from service/API
  feeStructure: CompanyCollaborationFeeStructure = {
    applicationFee: 1000,
    collaborationFee: 5000,
    securityDeposit: 10000
  };

  private lastBrandCount = 0;
  constructor(private companyCollaborationService: CompanyCollaborationService) {}

  ngOnInit() {
    this.loadSelectedBrands();
  }

  ngDoCheck() {
    // Check if brands have changed in session storage
    const savedBrands = sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrands);
    if (savedBrands) {
      const brands = JSON.parse(savedBrands);
      if (brands.length !== this.lastBrandCount) {
        this.loadSelectedBrands();
        this.lastBrandCount = brands.length;
      }
    }
  }

  private loadSelectedBrands() {
    const savedBrands = sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrands);
    if (savedBrands) {
      try {
        this.selectedBrands = JSON.parse(savedBrands);
        this.lastBrandCount = this.selectedBrands.length;
      } catch (error) {
        console.error('Error loading selected brands:', error);
        this.selectedBrands = [];
        this.lastBrandCount = 0;
      }
    } else {
      this.selectedBrands = this.companyCollaborationService.getSelectedBrands();
      this.lastBrandCount = 0;
    }
  }

  removeBrand(brandId: number) {
    this.selectedBrands = this.selectedBrands.filter(brand => brand.id !== brandId);
    
    // Update session storage
    sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrands, JSON.stringify(this.selectedBrands));
    
    // Also update the selected brand IDs
    const selectedIds = this.selectedBrands.map(brand => brand.id);
    sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrandIds, JSON.stringify(selectedIds));
    this.companyCollaborationService.setSelectedBrands(this.selectedBrands);
    
    this.lastBrandCount = this.selectedBrands.length;
  }

  getTotalAmount(): number {
    return this.feeStructure.applicationFee + this.feeStructure.collaborationFee + this.feeStructure.securityDeposit;
  }

  getBottlerDetails(): any {
    const saved = sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.bottlerDetails);
    return saved ? JSON.parse(saved) : {};
  }

  getCompanyDetails(): any {
    const saved = sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.companyDetails);
    return saved ? JSON.parse(saved) : {};
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-GB');
  }

  goBack() {
    this.back.emit();
  }

  proceedToNext() {
    if (this.selectedBrands.length > 0) {
      // Save fee structure to session storage for next step
      sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure, JSON.stringify(this.feeStructure));
      
      // Save overview summary
      const overviewSummary = {
        totalBrands: this.selectedBrands.length,
        totalAmount: this.getTotalAmount(),
        applicationDate: this.getCurrentDate(),
        selectedBrands: this.selectedBrands
      };
      sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.overviewSummary, JSON.stringify(overviewSummary));
      
      this.next.emit();
    }
  }
}
