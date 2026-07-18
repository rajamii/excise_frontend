import { Component, DoCheck, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../../../../../shared/material.module';
import { CompanyCollaborationService } from '../../../../../../../core/services/company-collaboration.service';
import {
  COMPANY_COLLAB_STORAGE_KEYS,
  CompanyCollaborationBrand,
  CompanyCollaborationFeeStructure
} from '../../../../../../../core/models/company-collaboration.model';

@Component({
  selector: 'app-brand-confirmation',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './brand-confirmation.component.html',
  styleUrl: './brand-confirmation.component.scss'
})
export class BrandConfirmationComponent implements OnInit, DoCheck {
  @Output() readonly next = new EventEmitter<void>();
  @Output() readonly back = new EventEmitter<void>();

  selectedBrands: CompanyCollaborationBrand[] = [];
  feeStructure: CompanyCollaborationFeeStructure | null = null;
  isLoadingFee = false;

  private lastDataCheck = '';

  constructor(private collaborationService: CompanyCollaborationService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngDoCheck(): void {
    const currentData = JSON.stringify({
      brands: sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrands),
      fees: sessionStorage.getItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure)
    });

    if (currentData !== this.lastDataCheck) {
      this.loadData();
      this.lastDataCheck = currentData;
    }
  }

  private loadData(): void {
    this.selectedBrands = this.getStorageData<CompanyCollaborationBrand[]>(COMPANY_COLLAB_STORAGE_KEYS.selectedBrands, []);
    this.feeStructure = this.getStorageData<CompanyCollaborationFeeStructure | null>(COMPANY_COLLAB_STORAGE_KEYS.feeStructure, null);
  }

  private getStorageData<T>(key: string, fallback: T): T {
    const stored = sessionStorage.getItem(key);
    if (!stored) return fallback;
    try {
      return JSON.parse(stored) as T;
    } catch {
      return fallback;
    }
  }

  removeBrand(brandId: string | number): void {
    this.selectedBrands = this.selectedBrands.filter((b) => String(b.id) !== String(brandId));
    this.saveAndUpdate();
  }

  removeBrandSize(brandId: string | number, sizeLabel: string): void {
    this.selectedBrands = this.selectedBrands.map((b) => {
      if (String(b.id) === String(brandId)) {
        if (b.selected_sizes) {
          b.selected_sizes = b.selected_sizes.filter((s: string) => s !== sizeLabel);
        }
      }
      return b;
    }).filter((b) => b.selected_sizes && b.selected_sizes.length > 0);
    this.saveAndUpdate();
  }

  private saveAndUpdate(): void {
    const selectedBrandIds = this.selectedBrands.map((b) => String(b.id));
    sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrands, JSON.stringify(this.selectedBrands));
    sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.selectedBrandIds, JSON.stringify(selectedBrandIds));
    this.collaborationService.setSelectedBrands(this.selectedBrands);
    this.refreshFeeStructure();
  }

  private refreshFeeStructure(): void {
    if (this.selectedBrands.length === 0) {
      this.feeStructure = null;
      sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure);
      sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.overviewSummary);
      return;
    }

    this.isLoadingFee = true;
    this.collaborationService.getFeeStructure().subscribe({
      next: (fee: CompanyCollaborationFeeStructure) => {
        this.feeStructure = fee;
        sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure, JSON.stringify(fee));
        
        sessionStorage.setItem(COMPANY_COLLAB_STORAGE_KEYS.overviewSummary, JSON.stringify({
          totalBrands:     this.selectedBrands.length,
          totalAmount:     this.getTotalAmount(),
          applicationDate: new Date().toLocaleDateString('en-GB'),
          selectedBrands:  this.selectedBrands
        }));
        this.isLoadingFee = false;
      },
      error: (err: any) => {
        console.error('Failed to load fee structure:', err);
        this.feeStructure = null;
        sessionStorage.removeItem(COMPANY_COLLAB_STORAGE_KEYS.feeStructure);
        this.isLoadingFee = false;
      }
    });
  }

  getTotalAmount(): number {
    if (!this.feeStructure) return 0;
    return Number(this.feeStructure.applicationFee || 0)
         + Number(this.feeStructure.collaborationFee || 0)
         + Number(this.feeStructure.securityDeposit || 0);
  }

  goBack(): void {
    this.back.emit();
  }

  proceed(): void {
    if (this.selectedBrands.length === 0) return;
    this.next.emit();
  }
}
