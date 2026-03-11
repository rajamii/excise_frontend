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
  feeStructure: CompanyCollaborationFeeStructure | null = null;
  isLoadingFee = false;

  private lastBrandSignature = '';
  constructor(private companyCollaborationService: CompanyCollaborationService) {}

  ngOnInit() {
    this.loadSelectedBrands();
    this.refreshFeeStructure();
  }

  ngDoCheck() {
    const savedBrands = sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrands);
    const currentSignature = this.getStoredBrandSignature(savedBrands);
    if (currentSignature !== this.lastBrandSignature) {
      this.loadSelectedBrands();
      this.refreshFeeStructure();
    }
  }

  private loadSelectedBrands() {
    const savedBrands = sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrands);
    if (savedBrands) {
      try {
        this.selectedBrands = JSON.parse(savedBrands);
      } catch (error) {
        console.error('Error loading selected brands:', error);
        this.selectedBrands = [];
      }
    } else {
      this.selectedBrands = this.companyCollaborationService.getSelectedBrands();
    }

    this.lastBrandSignature = this.getBrandSignature(this.selectedBrands);
  }

  private refreshFeeStructure(): void {
    if (this.selectedBrands.length === 0) {
      this.feeStructure = null;
      sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure);
      return;
    }

    this.isLoadingFee = true;
    this.companyCollaborationService.getFeeStructure(
      this.selectedBrands.map((brand) => brand.id),
      this.selectedBrands
    ).subscribe({
      next: (feeStructure) => {
        this.feeStructure = feeStructure;
        sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure, JSON.stringify(feeStructure));
        this.isLoadingFee = false;
      },
      error: (error) => {
        console.error('Failed to load company collaboration fee structure:', error);
        this.feeStructure = null;
        sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure);
        this.isLoadingFee = false;
      }
    });
  }

  removeBrand(brandId: string | number) {
    this.selectedBrands = this.selectedBrands.filter((brand) => String(brand.id) !== String(brandId));

    sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrands, JSON.stringify(this.selectedBrands));

    const selectedIds = this.selectedBrands.map((brand) => brand.id);
    sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrandIds, JSON.stringify(selectedIds));
    this.companyCollaborationService.setSelectedBrands(this.selectedBrands);

    this.lastBrandSignature = this.getBrandSignature(this.selectedBrands);
    this.refreshFeeStructure();
  }

  getTotalAmount(): number {
    if (!this.feeStructure) {
      return 0;
    }

    return (
      Number(this.feeStructure.applicationFee || 0) +
      Number(this.feeStructure.collaborationFee || 0) +
      Number(this.feeStructure.securityDeposit || 0)
    );
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
    if (this.selectedBrands.length > 0 && this.feeStructure) {
      sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure, JSON.stringify(this.feeStructure));

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

  private getBrandSignature(brands: CompanyCollaborationBrand[]): string {
    return JSON.stringify(brands.map((brand) => String(brand.id)).sort());
  }

  private getStoredBrandSignature(storedBrands: string | null): string {
    if (!storedBrands) {
      return '';
    }

    try {
      const brands = JSON.parse(storedBrands) as CompanyCollaborationBrand[];
      return this.getBrandSignature(brands);
    } catch {
      return '';
    }
  }
}
