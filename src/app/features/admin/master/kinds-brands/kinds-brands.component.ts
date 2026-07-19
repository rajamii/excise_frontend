import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../shared/material.module';
import { CompanyCollaborationService } from '../../../../core/services/company-collaboration.service';
import { ManageDialogComponent } from './manage-dialog/manage-dialog.component';

@Component({
  selector: 'app-kinds-brands',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './kinds-brands.component.html',
  styleUrl: './kinds-brands.component.scss'
})
export class KindsBrandsComponent implements OnInit {
  // Data Sources
  categories: any[] = [];
  kinds: any[] = [];
  types: any[] = [];
  brands: any[] = [];

  // Table Columns
  categoryColumns: string[] = ['code', 'desc', 'abbr', 'actions'];
  kindColumns: string[] = ['cat', 'code', 'desc', 'abbr', 'actions'];
  typeColumns: string[] = ['cat', 'kind', 'code', 'desc', 'oldCode', 'actions'];
  brandColumns: string[] = ['code', 'desc', 'alias', 'cat', 'kind', 'type', 'ml', 'actions'];

  // Brand Search
  brandSearchQuery = '';

  constructor(
    private companyCollabService: CompanyCollaborationService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadKinds();
    this.loadTypes();
  }

  // ── Categories ─────────────────────────────────────────────────────────────
  loadCategories(): void {
    this.companyCollabService.getCategoriesCrudList().subscribe({
      next: (data) => this.categories = Array.isArray(data) ? data : [],
      error: () => Swal.fire('Error', 'Failed to load categories.', 'error')
    });
  }

  onAddCategory(): void {
    const dialogRef = this.dialog.open(ManageDialogComponent, {
      width: '500px',
      data: { type: 'category' }
    });
    dialogRef.afterClosed().subscribe(res => {
      if (res) this.loadCategories();
    });
  }

  onEditCategory(element: any): void {
    const dialogRef = this.dialog.open(ManageDialogComponent, {
      width: '500px',
      data: { type: 'category', element: { ...element } }
    });
    dialogRef.afterClosed().subscribe(res => {
      if (res) this.loadCategories();
    });
  }

  onDeleteCategory(element: any): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete Category "${element.liquorCategoryDesc || element.liquorCatDesc || ''}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete'
    }).then(result => {
      if (!result.isConfirmed) return;
      const code = element.liquorCatCode ?? element.liquorCategoryCode;
      this.companyCollabService.deleteCategoryCrud(code).subscribe({
        next: () => {
          Swal.fire('Deleted!', 'Category deleted successfully.', 'success');
          this.loadCategories();
        },
        error: () => Swal.fire('Error', 'Failed to delete category.', 'error')
      });
    });
  }

  // ── Kinds ──────────────────────────────────────────────────────────────────
  loadKinds(): void {
    this.companyCollabService.getKindsCrudList().subscribe({
      next: (data) => this.kinds = Array.isArray(data) ? data : [],
      error: () => Swal.fire('Error', 'Failed to load kinds.', 'error')
    });
  }

  onAddKind(): void {
    const dialogRef = this.dialog.open(ManageDialogComponent, {
      width: '550px',
      data: { type: 'kind', categories: this.categories }
    });
    dialogRef.afterClosed().subscribe(res => {
      if (res) this.loadKinds();
    });
  }

  onEditKind(element: any): void {
    const dialogRef = this.dialog.open(ManageDialogComponent, {
      width: '550px',
      data: { type: 'kind', element: { ...element }, categories: this.categories }
    });
    dialogRef.afterClosed().subscribe(res => {
      if (res) this.loadKinds();
    });
  }

  onDeleteKind(element: any): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete Kind "${element.liquorKindDesc}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.companyCollabService.deleteKindCrud(element.id).subscribe({
        next: () => {
          Swal.fire('Deleted!', 'Kind deleted successfully.', 'success');
          this.loadKinds();
        },
        error: () => Swal.fire('Error', 'Failed to delete kind.', 'error')
      });
    });
  }

  // ── Types ──────────────────────────────────────────────────────────────────
  loadTypes(): void {
    this.companyCollabService.getTypesCrudList().subscribe({
      next: (data) => this.types = Array.isArray(data) ? data : [],
      error: () => Swal.fire('Error', 'Failed to load types.', 'error')
    });
  }

  onAddType(): void {
    const dialogRef = this.dialog.open(ManageDialogComponent, {
      width: '550px',
      data: { type: 'type', categories: this.categories, kinds: this.kinds }
    });
    dialogRef.afterClosed().subscribe(res => {
      if (res) this.loadTypes();
    });
  }

  onEditType(element: any): void {
    const dialogRef = this.dialog.open(ManageDialogComponent, {
      width: '550px',
      data: { type: 'type', element: { ...element }, categories: this.categories, kinds: this.kinds }
    });
    dialogRef.afterClosed().subscribe(res => {
      if (res) this.loadTypes();
    });
  }

  onDeleteType(element: any): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete Type "${element.liquorTypeDesc}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.companyCollabService.deleteTypeCrud(element.id).subscribe({
        next: () => {
          Swal.fire('Deleted!', 'Type deleted successfully.', 'success');
          this.loadTypes();
        },
        error: () => Swal.fire('Error', 'Failed to delete type.', 'error')
      });
    });
  }

  // ── Super Brands ───────────────────────────────────────────────────────────
  onSearchBrands(): void {
    if (!this.brandSearchQuery.trim()) {
      this.brands = [];
      return;
    }
    this.companyCollabService.getBrandsCrudList(this.brandSearchQuery).subscribe({
      next: (data) => {
        this.brands = Array.isArray(data) ? data.map(b => ({ ...b, packSizes: [], sizesLoading: true })) : [];
        if (this.brands.length === 0) {
          Swal.fire('No Brands Found', 'No brands matched your search criteria.', 'info');
        } else {
          // Load pack sizes for each brand
          this.brands.forEach((brand, idx) => {
            this.companyCollabService.getBrandPackSizes(brand.liquorBrandCode).subscribe({
              next: (sizes) => {
                this.brands[idx] = { ...this.brands[idx], packSizes: Array.isArray(sizes) ? sizes : [], sizesLoading: false };
                this.brands = [...this.brands]; // Trigger change detection
              },
              error: () => {
                this.brands[idx] = { ...this.brands[idx], packSizes: [], sizesLoading: false };
              }
            });
          });
        }
      },
      error: () => Swal.fire('Error', 'Failed to search brands.', 'error')
    });
  }

  onManageSizes(brand: any): void {
    const dialogRef = this.dialog.open(ManageDialogComponent, {
      width: '560px',
      data: {
        type: 'brand',
        element: { ...brand },
        categories: this.categories,
        kinds: this.kinds,
        types: this.types,
        sizesOnly: true  // signal to dialog to focus on sizes section
      }
    });
    dialogRef.afterClosed().subscribe(res => {
      if (res) this.onSearchBrands();
    });
  }

  onAddBrand(): void {
    const dialogRef = this.dialog.open(ManageDialogComponent, {
      width: '600px',
      data: { type: 'brand', categories: this.categories, kinds: this.kinds, types: this.types }
    });
    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        if (this.brandSearchQuery.trim()) this.onSearchBrands();
      }
    });
  }

  onEditBrand(element: any): void {
    const dialogRef = this.dialog.open(ManageDialogComponent, {
      width: '600px',
      data: { type: 'brand', element: { ...element }, categories: this.categories, kinds: this.kinds, types: this.types }
    });
    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        if (this.brandSearchQuery.trim()) this.onSearchBrands();
      }
    });
  }

  onDeleteBrand(element: any): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete Brand "${element.liquorBrandDesc}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.companyCollabService.deleteBrandCrud(element.id).subscribe({
        next: () => {
          Swal.fire('Deleted!', 'Brand deleted successfully.', 'success');
          if (this.brandSearchQuery.trim()) this.onSearchBrands();
        },
        error: () => Swal.fire('Error', 'Failed to delete brand.', 'error')
      });
    });
  }
}
