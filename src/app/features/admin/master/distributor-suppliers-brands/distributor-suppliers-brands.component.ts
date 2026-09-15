import { Component, OnInit, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../shared/material.module';
import { ImflSupplierBrandService, IMFLSupplierItem, IMFLBrandItem, SupplierBrandStats } from '../../../../core/services/imfl-supplier-brand.service';

@Component({
  selector: 'app-distributor-suppliers-brands',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './distributor-suppliers-brands.component.html',
  styleUrl: './distributor-suppliers-brands.component.scss'
})
export class DistributorSuppliersBrandsComponent implements OnInit, AfterViewInit {
  @ViewChild('supplierPaginator') supplierPaginator!: MatPaginator;
  @ViewChild('brandPaginator') brandPaginator!: MatPaginator;

  // Data Sources
  suppliersDS = new MatTableDataSource<IMFLSupplierItem>([]);
  brandsDS = new MatTableDataSource<IMFLBrandItem>([]);

  // Raw lists
  suppliersList: IMFLSupplierItem[] = [];
  brandsList: IMFLBrandItem[] = [];

  // Stats
  stats: SupplierBrandStats = { totalSuppliers: 0, totalBrands: 0 };
  isLoading = false;

  // Search & Filters
  supplierSearch = '';
  brandSearch = '';
  selectedSupplierFilter: number | null = null;

  // Selected tab index
  activeTabIndex = 0;

  // Expanded suppliers map for nested table view
  expandedSuppliers: { [supplierId: number]: boolean } = {};

  // Columns
  supplierColumns: string[] = ['index', 'supplier_master_name', 'supplier_name', 'address', 'route_details', 'brands_count', 'actions'];
  brandColumns: string[] = ['index', 'brand_name', 'supplier_name', 'size_ml', 'pieces_per_case', 'edp_per_case', 'import_pass_fee_per_case', 'mrp_per_bottle', 'additional_ed_per_case', 'education_cess_per_case', 'actions'];

  readonly pageSizeOptions = [10, 20, 50];

  // ── Unified Modal State (Supplier + Brands) ──
  showSupplierModal = false;
  isEditSupplierMode = false;
  supplierFormData: {
    id?: number;
    supplier_master_name: string;
    supplier_name: string;
    address: string;
    route_details: string;
    brands: Array<{
      id?: number;
      brand_name: string;
      size_ml: number;
      pieces_per_case: number;
      edp_per_case: number;
      import_pass_fee_per_case: number;
      mrp_per_bottle: number;
      additional_ed_per_case: number;
      education_cess_per_case: number;
    }>;
  } = this.getEmptySupplierForm();

  // ── Single Brand Modal State ──
  showBrandModal = false;
  isEditBrandMode = false;
  brandFormData: {
    id?: number;
    supplier?: number;
    brand_name: string;
    size_ml: number;
    pieces_per_case: number;
    edp_per_case: number;
    import_pass_fee_per_case: number;
    mrp_per_bottle: number;
    additional_ed_per_case: number;
    education_cess_per_case: number;
  } = this.getEmptyBrandForm();

  constructor(
    private service: ImflSupplierBrandService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAllData();
  }

  ngAfterViewInit(): void {
    this.suppliersDS.paginator = this.supplierPaginator;
    this.brandsDS.paginator = this.brandPaginator;
  }

  getEmptySupplierForm() {
    return {
      supplier_master_name: '',
      supplier_name: '',
      address: '',
      route_details: '',
      brands: [
        {
          brand_name: '',
          size_ml: 750,
          pieces_per_case: 12,
          edp_per_case: 0,
          import_pass_fee_per_case: 0,
          mrp_per_bottle: 0,
          additional_ed_per_case: 0,
          education_cess_per_case: 0,
        }
      ]
    };
  }

  getEmptyBrandForm() {
    return {
      supplier: undefined,
      brand_name: '',
      size_ml: 750,
      pieces_per_case: 12,
      edp_per_case: 0,
      import_pass_fee_per_case: 0,
      mrp_per_bottle: 0,
      additional_ed_per_case: 0,
      education_cess_per_case: 0,
    };
  }

  loadAllData(): void {
    this.isLoading = true;
    this.loadStats();
    this.loadSuppliers();
    this.loadBrands();
  }

  loadStats(): void {
    this.service.getSummaryStats().subscribe({
      next: (res) => {
        this.stats = res;
      },
      error: () => {}
    });
  }

  loadSuppliers(): void {
    this.service.getSuppliers(this.supplierSearch).subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : (data?.results || data?.data || []);
        this.suppliersList = list;
        this.suppliersDS.data = list;
        if (this.supplierPaginator) {
          this.suppliersDS.paginator = this.supplierPaginator;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Failed to load suppliers:', err);
      }
    });
  }

  loadBrands(): void {
    this.service.getBrands(this.selectedSupplierFilter || undefined, this.brandSearch).subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : (data?.results || data?.data || []);
        this.brandsList = list;
        this.brandsDS.data = list;
        if (this.brandPaginator) {
          this.brandsDS.paginator = this.brandPaginator;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load brands:', err);
      }
    });
  }

  onSupplierSearch(): void {
    this.loadSuppliers();
  }

  onBrandSearch(): void {
    this.loadBrands();
  }

  toggleSupplierExpand(supplierId?: number): void {
    if (!supplierId) return;
    this.expandedSuppliers[supplierId] = !this.expandedSuppliers[supplierId];
  }

  isSupplierExpanded(supplierId?: number): boolean {
    return !!(supplierId && this.expandedSuppliers[supplierId]);
  }

  // ── Unified Supplier & Brands Modal Handlers ──
  openAddSupplierModal(): void {
    this.isEditSupplierMode = false;
    this.supplierFormData = this.getEmptySupplierForm();
    this.showSupplierModal = true;
  }

  openEditSupplierModal(supplier: IMFLSupplierItem): void {
    this.isEditSupplierMode = true;
    const brandsCopy = (supplier.brands || []).map((b) => ({
      id: b.id,
      brand_name: b.brand_name || b.brandName || '',
      size_ml: Number(b.size_ml ?? b.sizeMl ?? 750),
      pieces_per_case: Number(b.pieces_per_case ?? b.piecesPerCase ?? 12),
      edp_per_case: Number(b.edp_per_case ?? b.edpPerCase ?? 0),
      import_pass_fee_per_case: Number(b.import_pass_fee_per_case ?? b.importPassFeePerCase ?? 0),
      mrp_per_bottle: Number(b.mrp_per_bottle ?? b.mrpPerBottle ?? 0),
      additional_ed_per_case: Number(b.additional_ed_per_case ?? b.additionalEdPerCase ?? 0),
      education_cess_per_case: Number(b.education_cess_per_case ?? b.educationCessPerCase ?? 0),
    }));

    this.supplierFormData = {
      id: supplier.id,
      supplier_master_name: supplier.supplier_master_name || supplier.supplierMasterName || '',
      supplier_name: supplier.supplier_name || supplier.supplierName || '',
      address: supplier.address || '',
      route_details: supplier.route_details || supplier.routeDetails || '',
      brands: brandsCopy.length > 0 ? brandsCopy : [
        {
          brand_name: '',
          size_ml: 750,
          pieces_per_case: 12,
          edp_per_case: 0,
          import_pass_fee_per_case: 0,
          mrp_per_bottle: 0,
          additional_ed_per_case: 0,
          education_cess_per_case: 0,
        }
      ]
    };
    this.showSupplierModal = true;
  }

  closeSupplierModal(): void {
    this.showSupplierModal = false;
  }

  addBrandRow(): void {
    this.supplierFormData.brands.push({
      brand_name: '',
      size_ml: 750,
      pieces_per_case: 12,
      edp_per_case: 0,
      import_pass_fee_per_case: 0,
      mrp_per_bottle: 0,
      additional_ed_per_case: 0,
      education_cess_per_case: 0,
    });
  }

  removeBrandRow(index: number): void {
    if (this.supplierFormData.brands.length > 1) {
      this.supplierFormData.brands.splice(index, 1);
    } else {
      Swal.fire({
        icon: 'info',
        title: 'At least one brand row required',
        text: 'You can clear fields if needed, but at least 1 brand row is maintained.'
      });
    }
  }

  saveSupplierWithBrands(): void {
    if (!this.supplierFormData.supplier_name.trim() || !this.supplierFormData.supplier_master_name.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Required Fields Missing',
        text: 'Please enter Supplier Master Name and Supplier Trade Name.'
      });
      return;
    }

    // Filter out brand rows where brand_name is empty
    const validBrands = this.supplierFormData.brands.filter(b => b.brand_name && b.brand_name.trim().length > 0);

    const payload: any = {
      supplier_master_name: this.supplierFormData.supplier_master_name.trim(),
      supplier_name: this.supplierFormData.supplier_name.trim(),
      address: this.supplierFormData.address.trim(),
      route_details: this.supplierFormData.route_details.trim(),
      brands: validBrands.map(b => ({
        ...(b.id ? { id: b.id } : {}),
        brand_name: b.brand_name.trim(),
        size_ml: Number(b.size_ml || 0),
        pieces_per_case: Number(b.pieces_per_case || 1),
        edp_per_case: Number(b.edp_per_case || 0),
        import_pass_fee_per_case: Number(b.import_pass_fee_per_case || 0),
        mrp_per_bottle: Number(b.mrp_per_bottle || 0),
        additional_ed_per_case: Number(b.additional_ed_per_case || 0),
        education_cess_per_case: Number(b.education_cess_per_case || 0),
      }))
    };

    if (this.isEditSupplierMode && this.supplierFormData.id) {
      this.service.updateSupplier(this.supplierFormData.id, payload).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Updated Successfully',
            text: 'Supplier and associated brands have been updated.',
            timer: 2000,
            showConfirmButton: false
          });
          this.closeSupplierModal();
          this.loadAllData();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Update Failed',
            text: err?.error?.detail || 'An error occurred while saving.'
          });
        }
      });
    } else {
      this.service.createSupplier(payload).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Created Successfully',
            text: 'New Supplier and associated brands created.',
            timer: 2000,
            showConfirmButton: false
          });
          this.closeSupplierModal();
          this.loadAllData();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Creation Failed',
            text: err?.error?.detail || 'An error occurred while creating supplier.'
          });
        }
      });
    }
  }

  deleteSupplier(supplier: IMFLSupplierItem): void {
    if (!supplier.id) return;
    Swal.fire({
      title: 'Delete Supplier?',
      text: `Are you sure you want to delete "${supplier.supplier_name || supplier.supplierName}"? All associated brands will also be deleted.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed && supplier.id) {
        this.service.deleteSupplier(supplier.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Deleted!',
              text: 'Supplier and brands deleted successfully.',
              timer: 1800,
              showConfirmButton: false
            });
            this.loadAllData();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Delete Failed',
              text: err?.error?.detail || 'Failed to delete supplier.'
            });
          }
        });
      }
    });
  }

  // ── Single Brand Modal Handlers ──
  openAddBrandModal(supplierId?: number): void {
    this.isEditBrandMode = false;
    this.brandFormData = this.getEmptyBrandForm();
    if (supplierId) {
      this.brandFormData.supplier = supplierId;
    } else if (this.suppliersList.length > 0) {
      this.brandFormData.supplier = this.suppliersList[0].id;
    }
    this.showBrandModal = true;
  }

  openEditBrandModal(brand: IMFLBrandItem): void {
    this.isEditBrandMode = true;
    this.brandFormData = {
      id: brand.id,
      supplier: brand.supplier || brand.supplier_id || brand.supplierId,
      brand_name: brand.brand_name || brand.brandName || '',
      size_ml: Number(brand.size_ml ?? brand.sizeMl ?? 750),
      pieces_per_case: Number(brand.pieces_per_case ?? brand.piecesPerCase ?? 12),
      edp_per_case: Number(brand.edp_per_case ?? brand.edpPerCase ?? 0),
      import_pass_fee_per_case: Number(brand.import_pass_fee_per_case ?? brand.importPassFeePerCase ?? 0),
      mrp_per_bottle: Number(brand.mrp_per_bottle ?? brand.mrpPerBottle ?? 0),
      additional_ed_per_case: Number(brand.additional_ed_per_case ?? brand.additionalEdPerCase ?? 0),
      education_cess_per_case: Number(brand.education_cess_per_case ?? brand.educationCessPerCase ?? 0),
    };
    this.showBrandModal = true;
  }

  closeBrandModal(): void {
    this.showBrandModal = false;
  }

  saveSingleBrand(): void {
    if (!this.brandFormData.supplier) {
      Swal.fire({ icon: 'warning', title: 'Supplier Missing', text: 'Please select a supplier.' });
      return;
    }
    if (!this.brandFormData.brand_name.trim()) {
      Swal.fire({ icon: 'warning', title: 'Brand Name Missing', text: 'Please enter a brand name.' });
      return;
    }

    const payload: any = {
      supplier: this.brandFormData.supplier,
      brand_name: this.brandFormData.brand_name.trim(),
      size_ml: Number(this.brandFormData.size_ml || 0),
      pieces_per_case: Number(this.brandFormData.pieces_per_case || 1),
      edp_per_case: Number(this.brandFormData.edp_per_case || 0),
      import_pass_fee_per_case: Number(this.brandFormData.import_pass_fee_per_case || 0),
      mrp_per_bottle: Number(this.brandFormData.mrp_per_bottle || 0),
      additional_ed_per_case: Number(this.brandFormData.additional_ed_per_case || 0),
      education_cess_per_case: Number(this.brandFormData.education_cess_per_case || 0),
    };

    if (this.isEditBrandMode && this.brandFormData.id) {
      this.service.updateBrand(this.brandFormData.id, payload).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Brand Updated',
            text: 'Brand details updated successfully.',
            timer: 1800,
            showConfirmButton: false
          });
          this.closeBrandModal();
          this.loadAllData();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Update Failed',
            text: err?.error?.detail || 'Failed to update brand.'
          });
        }
      });
    } else {
      this.service.createBrand(payload).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Brand Added',
            text: 'New brand added successfully.',
            timer: 1800,
            showConfirmButton: false
          });
          this.closeBrandModal();
          this.loadAllData();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Creation Failed',
            text: err?.error?.detail || 'Failed to create brand.'
          });
        }
      });
    }
  }

  deleteBrand(brand: IMFLBrandItem): void {
    if (!brand.id) return;
    Swal.fire({
      title: 'Delete Brand?',
      text: `Are you sure you want to delete "${brand.brand_name || brand.brandName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed && brand.id) {
        this.service.deleteBrand(brand.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Brand Deleted',
              text: 'Brand deleted successfully.',
              timer: 1800,
              showConfirmButton: false
            });
            this.loadAllData();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Delete Failed',
              text: err?.error?.detail || 'Failed to delete brand.'
            });
          }
        });
      }
    });
  }
}
