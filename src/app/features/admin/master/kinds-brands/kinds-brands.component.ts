import { Component, OnInit, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../shared/material.module';
import { FormsModule } from '@angular/forms';
import { CompanyCollaborationService } from '../../../../core/services/company-collaboration.service';
import { ManageDialogComponent } from './manage-dialog/manage-dialog.component';
import { LiquorCategory, LiquorKind, LiquorType } from '../../../../core/models/company-collaboration.model';

@Component({
  selector: 'app-kinds-brands',
  standalone: true,
  imports: [MaterialModule, FormsModule],
  templateUrl: './kinds-brands.component.html',
  styleUrl: './kinds-brands.component.scss'
})
export class KindsBrandsComponent implements OnInit, AfterViewInit {

  // ── Paginators ──────────────────────────────────────────────────────────────
  @ViewChild('catPaginator')  catPaginator!:  MatPaginator;
  @ViewChild('kindPaginator') kindPaginator!: MatPaginator;
  @ViewChild('typePaginator') typePaginator!: MatPaginator;
  @ViewChild('botPaginator')  botPaginator!:  MatPaginator;

  // ── Data Sources ────────────────────────────────────────────────────────────
  categoriesDS    = new MatTableDataSource<any>([]);
  kindsDS         = new MatTableDataSource<any>([]);
  typesDS         = new MatTableDataSource<any>([]);
  brandOwnerTypesDS = new MatTableDataSource<any>([]);
  brands: any[]   = [];  // brands are searched on demand — plain array is fine

  // Kept as plain arrays for dialogs / dropdowns
  categories: any[] = [];
  kinds:      any[] = [];
  types:      any[] = [];
  brandOwnerTypes: any[] = [];

  readonly pageSizeOptions = [10, 15, 20];

  // ── Table Columns ───────────────────────────────────────────────────────────
  categoryColumns:      string[] = ['code', 'desc', 'abbr', 'actions'];
  kindColumns:          string[] = ['cat', 'code', 'desc', 'abbr', 'actions'];
  typeColumns:          string[] = ['cat', 'kind', 'code', 'desc', 'oldCode', 'actions'];
  brandColumns:         string[] = ['code', 'desc', 'alias', 'cat', 'kind', 'type', 'ml', 'actions'];
  brandOwnerTypeColumns: string[] = ['typeCode', 'typeDesc', 'actions'];

  // ── Brand Search ────────────────────────────────────────────────────────────
  brandSearchQuery = '';

  // ── Super Brands cascading dropdowns ────────────────────────────────────────
  allKinds: LiquorKind[] = [];
  allTypes: LiquorType[] = [];
  filteredKinds: LiquorKind[] = [];
  filteredTypes: LiquorType[] = [];
  selectedCatCode: number | null = null;
  selectedKindId:  number | null = null;
  selectedTypeId:  number | null = null;

  constructor(
    private companyCollabService: CompanyCollaborationService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadKinds();
    this.loadTypes();
    this.loadMasterDropdowns();
    this.loadBrandOwnerTypes();
  }

  ngAfterViewInit(): void {
    // mat-tab hides inactive tab content — paginators inside inactive tabs
    // are not rendered until that tab is first activated. Use setTimeout to
    // defer wiring so the first (active) tab paginator is available, and
    // wire the rest lazily via onTabChange().
    setTimeout(() => {
      if (this.catPaginator)  this.categoriesDS.paginator    = this.catPaginator;
      if (this.kindPaginator) this.kindsDS.paginator         = this.kindPaginator;
      if (this.typePaginator) this.typesDS.paginator         = this.typePaginator;
      if (this.botPaginator)  this.brandOwnerTypesDS.paginator = this.botPaginator;
      this.cdr.detectChanges();
    });
  }

  /** Called by (selectedTabChange) on the mat-tab-group to wire any paginator
   *  that wasn't available at ngAfterViewInit because its tab was inactive. */
  onTabChange(): void {
    setTimeout(() => {
      if (this.catPaginator  && !this.categoriesDS.paginator)      this.categoriesDS.paginator      = this.catPaginator;
      if (this.kindPaginator && !this.kindsDS.paginator)           this.kindsDS.paginator           = this.kindPaginator;
      if (this.typePaginator && !this.typesDS.paginator)           this.typesDS.paginator           = this.typePaginator;
      if (this.botPaginator  && !this.brandOwnerTypesDS.paginator) this.brandOwnerTypesDS.paginator = this.botPaginator;
      this.cdr.detectChanges();
    });
  }

  // ── Master dropdowns for Super Brands ──────────────────────────────────────
  private loadMasterDropdowns(): void {
    forkJoin({
      kinds: this.companyCollabService.getLiquorKinds(),
      types: this.companyCollabService.getLiquorTypes()
    }).subscribe({
      next: ({ kinds, types }) => {
        this.allKinds = kinds.map((k: any) => ({
          id:             k.id,
          liquorCatCode:  k.liquorCat      ?? k.liquor_cat,
          liquorKindCode: k.liquorKindCode ?? k.liquor_kind_code,
          liquorKindDesc: k.liquorKindDesc ?? k.liquor_kind_desc,
          liquorKindAbbr: k.liquorKindAbbr ?? k.liquor_kind_abbr
        }));
        this.allTypes = types.map((t: any) => ({
          id:             t.id,
          liquorCatCode:  t.liquorCat      ?? t.liquor_cat,
          liquorKindId:   t.liquorKind     ?? t.liquor_kind,
          liquorTypeCode: t.liquorTypeCode ?? t.liquor_type_code,
          liquorTypeDesc: t.liquorTypeDesc ?? t.liquor_type_desc
        }));
        this.filteredKinds = [...this.allKinds];
        this.filteredTypes = [...this.allTypes];
      },
      error: (err) => console.error('Failed to load master dropdowns:', err)
    });
  }

  onBrandCatChange(): void {
    this.selectedKindId = null;
    this.selectedTypeId = null;
    this.filteredKinds = this.selectedCatCode
      ? this.allKinds.filter(k => k.liquorCatCode === this.selectedCatCode)
      : [...this.allKinds];
    this.filteredTypes = this.selectedCatCode
      ? this.allTypes.filter(t => t.liquorCatCode === this.selectedCatCode)
      : [...this.allTypes];
    this.brands = [];
  }

  onBrandKindChange(): void {
    this.selectedTypeId = null;
    this.filteredTypes = this.allTypes.filter(t => {
      const catOk  = !this.selectedCatCode || t.liquorCatCode === this.selectedCatCode;
      const kindOk = !this.selectedKindId  || t.liquorKindId  === this.selectedKindId;
      return catOk && kindOk;
    });
    this.brands = [];
  }

  onBrandTypeChange(): void { this.brands = []; }

  resetBrandFilters(): void {
    this.selectedCatCode  = null;
    this.selectedKindId   = null;
    this.selectedTypeId   = null;
    this.brandSearchQuery = '';
    this.brands           = [];
    this.filteredKinds    = [...this.allKinds];
    this.filteredTypes    = [...this.allTypes];
  }

  // ── Brand Owner Types ───────────────────────────────────────────────────────
  loadBrandOwnerTypes(): void {
    this.companyCollabService.getBrandOwnerTypes().subscribe({
      next: (data) => {
        this.brandOwnerTypes = Array.isArray(data) ? data : [];
        this.brandOwnerTypesDS.data = this.brandOwnerTypes;
      },
      error: () => Swal.fire('Error', 'Failed to load brand owner types.', 'error')
    });
  }

  onAddBrandOwnerType(): void {
    this.dialog.open(ManageDialogComponent, { width: '480px', data: { type: 'brandOwnerType' } })
      .afterClosed().subscribe(res => { if (res) this.loadBrandOwnerTypes(); });
  }

  onEditBrandOwnerType(element: any): void {
    const code = element.brandOwnerTypeCode ?? element.brand_owner_type_code;
    const desc = element.brandOwnerTypeDesc ?? element.brand_owner_type_desc;
    this.dialog.open(ManageDialogComponent, {
      width: '480px',
      data: { type: 'brandOwnerType', element: { brandOwnerTypeCode: code, brandOwnerTypeDesc: desc } }
    }).afterClosed().subscribe(res => { if (res) this.loadBrandOwnerTypes(); });
  }

  onDeleteBrandOwnerType(element: any): void {
    const code = element.brandOwnerTypeCode ?? element.brand_owner_type_code;
    const desc = element.brandOwnerTypeDesc ?? element.brand_owner_type_desc;
    Swal.fire({ title: 'Are you sure?', text: `Delete "${desc}"?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete' })
      .then(r => {
        if (!r.isConfirmed) return;
        this.companyCollabService.deleteBrandOwnerType(code).subscribe({
          next: () => { Swal.fire('Deleted!', '', 'success'); this.loadBrandOwnerTypes(); },
          error: () => Swal.fire('Error', 'Failed to delete.', 'error')
        });
      });
  }

  // ── Categories ──────────────────────────────────────────────────────────────
  loadCategories(): void {
    this.companyCollabService.getCategoriesCrudList().subscribe({
      next: (data) => {
        this.categories = Array.isArray(data) ? data : [];
        this.categoriesDS.data = this.categories;
      },
      error: () => Swal.fire('Error', 'Failed to load categories.', 'error')
    });
  }

  onAddCategory(): void {
    this.dialog.open(ManageDialogComponent, { width: '500px', data: { type: 'category' } })
      .afterClosed().subscribe(res => { if (res) this.loadCategories(); });
  }

  onEditCategory(element: any): void {
    this.dialog.open(ManageDialogComponent, { width: '500px', data: { type: 'category', element: { ...element } } })
      .afterClosed().subscribe(res => { if (res) this.loadCategories(); });
  }

  onDeleteCategory(element: any): void {
    Swal.fire({ title: 'Are you sure?', text: `Delete Category "${element.liquorCatDesc || ''}"?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete' })
      .then(r => {
        if (!r.isConfirmed) return;
        this.companyCollabService.deleteCategoryCrud(element.liquorCatCode ?? element.liquorCategoryCode).subscribe({
          next: () => { Swal.fire('Deleted!', 'Category deleted.', 'success'); this.loadCategories(); },
          error: () => Swal.fire('Error', 'Failed to delete category.', 'error')
        });
      });
  }

  // ── Kinds ───────────────────────────────────────────────────────────────────
  loadKinds(): void {
    this.companyCollabService.getKindsCrudList().subscribe({
      next: (data) => {
        this.kinds = Array.isArray(data) ? data : [];
        this.kindsDS.data = this.kinds;
      },
      error: () => Swal.fire('Error', 'Failed to load kinds.', 'error')
    });
  }

  onAddKind(): void {
    this.dialog.open(ManageDialogComponent, { width: '550px', data: { type: 'kind', categories: this.categories } })
      .afterClosed().subscribe(res => { if (res) this.loadKinds(); });
  }

  onEditKind(element: any): void {
    this.dialog.open(ManageDialogComponent, { width: '550px', data: { type: 'kind', element: { ...element }, categories: this.categories } })
      .afterClosed().subscribe(res => { if (res) this.loadKinds(); });
  }

  onDeleteKind(element: any): void {
    Swal.fire({ title: 'Are you sure?', text: `Delete Kind "${element.liquorKindDesc}"?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete' })
      .then(r => {
        if (!r.isConfirmed) return;
        this.companyCollabService.deleteKindCrud(element.id).subscribe({
          next: () => { Swal.fire('Deleted!', 'Kind deleted.', 'success'); this.loadKinds(); },
          error: () => Swal.fire('Error', 'Failed to delete kind.', 'error')
        });
      });
  }

  // ── Types ───────────────────────────────────────────────────────────────────
  loadTypes(): void {
    this.companyCollabService.getTypesCrudList().subscribe({
      next: (data) => {
        this.types = Array.isArray(data) ? data : [];
        this.typesDS.data = this.types;
      },
      error: () => Swal.fire('Error', 'Failed to load types.', 'error')
    });
  }

  onAddType(): void {
    this.dialog.open(ManageDialogComponent, { width: '550px', data: { type: 'type', categories: this.categories, kinds: this.kinds } })
      .afterClosed().subscribe(res => { if (res) this.loadTypes(); });
  }

  onEditType(element: any): void {
    this.dialog.open(ManageDialogComponent, { width: '550px', data: { type: 'type', element: { ...element }, categories: this.categories, kinds: this.kinds } })
      .afterClosed().subscribe(res => { if (res) this.loadTypes(); });
  }

  onDeleteType(element: any): void {
    Swal.fire({ title: 'Are you sure?', text: `Delete Type "${element.liquorTypeDesc}"?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete' })
      .then(r => {
        if (!r.isConfirmed) return;
        this.companyCollabService.deleteTypeCrud(element.id).subscribe({
          next: () => { Swal.fire('Deleted!', 'Type deleted.', 'success'); this.loadTypes(); },
          error: () => Swal.fire('Error', 'Failed to delete type.', 'error')
        });
      });
  }

  // ── Super Brands ────────────────────────────────────────────────────────────
  onSearchBrands(): void {
    if (!this.brandSearchQuery.trim() && !this.selectedCatCode && !this.selectedKindId && !this.selectedTypeId) {
      this.brands = [];
      return;
    }
    this.companyCollabService.getBrandsCrudList(
      this.brandSearchQuery, this.selectedCatCode, this.selectedKindId, this.selectedTypeId
    ).subscribe({
      next: (data) => {
        this.brands = Array.isArray(data) ? data.map(b => ({ ...b, packSizes: [], sizesLoading: true })) : [];
        if (this.brands.length === 0) {
          Swal.fire('No Brands Found', 'No brands matched your search criteria.', 'info');
        } else {
          this.brands.forEach((brand, idx) => {
            this.companyCollabService.getBrandPackSizes(brand.liquorBrandCode).subscribe({
              next: (sizes) => {
                this.brands[idx] = { ...this.brands[idx], packSizes: Array.isArray(sizes) ? sizes : [], sizesLoading: false };
                this.brands = [...this.brands];
              },
              error: () => { this.brands[idx] = { ...this.brands[idx], packSizes: [], sizesLoading: false }; }
            });
          });
        }
      },
      error: () => Swal.fire('Error', 'Failed to search brands.', 'error')
    });
  }

  onManageSizes(brand: any): void {
    this.dialog.open(ManageDialogComponent, {
      width: '560px',
      data: { type: 'brand', element: { ...brand }, categories: this.categories, kinds: this.kinds, types: this.types, sizesOnly: true }
    }).afterClosed().subscribe(res => { if (res) this.onSearchBrands(); });
  }

  onAddBrand(): void {
    this.dialog.open(ManageDialogComponent, {
      width: '600px',
      data: { type: 'brand', categories: this.categories, kinds: this.kinds, types: this.types }
    }).afterClosed().subscribe(res => { if (res && this.brandSearchQuery.trim()) this.onSearchBrands(); });
  }

  onEditBrand(element: any): void {
    this.dialog.open(ManageDialogComponent, {
      width: '600px',
      data: { type: 'brand', element: { ...element }, categories: this.categories, kinds: this.kinds, types: this.types }
    }).afterClosed().subscribe(res => { if (res && this.brandSearchQuery.trim()) this.onSearchBrands(); });
  }

  onDeleteBrand(element: any): void {
    Swal.fire({ title: 'Are you sure?', text: `Delete Brand "${element.liquorBrandDesc}"?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete' })
      .then(r => {
        if (!r.isConfirmed) return;
        this.companyCollabService.deleteBrandCrud(element.id).subscribe({
          next: () => { Swal.fire('Deleted!', 'Brand deleted.', 'success'); if (this.brandSearchQuery.trim()) this.onSearchBrands(); },
          error: () => Swal.fire('Error', 'Failed to delete brand.', 'error')
        });
      });
  }
}
