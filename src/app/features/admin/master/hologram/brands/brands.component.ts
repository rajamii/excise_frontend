import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { BrandWarehouse, BrandWarehouseService } from '../../../../licensee/supplyChain/services/brand-warehouse.service';
import { MasterService } from '../../../../../core/services/master.service';
import { AdminService } from '../../../admin.service';
import { ActiveLicense } from '../../../../../core/models/active-license.model';
import { StockManageComponent } from './stock-manage/stock-manage.component';
import { PriceManageComponent } from './price-manage/price-manage.component';

type MasterBrandRow = { id: number; brandName: string };
type LiquorCategoryRow = { id: number; sizeMl: number };

@Component({
  selector: 'app-hologram-brands',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './brands.component.html',
  styleUrl: './brands.component.scss',
})
export class BrandsComponent implements OnInit {
  stockColumns: string[] = ['licenseId', 'brandName', 'liquorType', 'sizeMl', 'currentStock', 'actions'];
  priceColumns: string[] = [
    'licenseId', 'brandName', 'liquorType', 'sizeMl',
    'exFactory', 'exciseDuty', 'eduCess', 'addlDuty', 'addl125', 'mrp', 'actions',
  ];

  allRows: BrandWarehouse[] = [];
  brands: MasterBrandRow[] = [];
  sizes: LiquorCategoryRow[] = [];

  currentPage = 0;
  pageSize = 10;

  /** license_id → establishmentName */
  private licenseNameMap = new Map<string, string>();

  // ── Search filter ──────────────────────────────────────────────────────────
  searchField: 'license_id' | 'brand_name' | 'brand_type' | 'capacity_size' = 'license_id';
  searchQuery = '';

  readonly searchFieldOptions: { value: 'license_id' | 'brand_name' | 'brand_type' | 'capacity_size'; label: string }[] = [
    { value: 'license_id',    label: 'License'   },
    { value: 'brand_name',    label: 'Brand'     },
    { value: 'brand_type',    label: 'Liquor Type' },
    { value: 'capacity_size', label: 'Size (ml)' },
  ];

  get rows(): BrandWarehouse[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.allRows;
    return this.allRows.filter(r => {
      // For license search, match against both the ID and the resolved name
      if (this.searchField === 'license_id') {
        const id = String(r.license_id ?? '').toLowerCase();
        const name = this.getLicenseName(r.license_id).toLowerCase();
        return id.includes(q) || name.includes(q);
      }
      const val = String((r as any)[this.searchField] ?? '').toLowerCase();
      return val.includes(q);
    });
  }

  get pagedRows(): BrandWarehouse[] {
    const startIndex = this.currentPage * this.pageSize;
    return this.rows.slice(startIndex, startIndex + this.pageSize);
  }

  getLicenseName(licenseId?: string | null): string {
    if (!licenseId) return '—';
    return this.licenseNameMap.get(licenseId.trim()) || licenseId;
  }

  getSearchFieldLabel(): string {
    return this.searchFieldOptions.find(o => o.value === this.searchField)?.label ?? '';
  }

  onSearchChange(): void {
    this.currentPage = 0;
  }

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  constructor(
    private brandWarehouseService: BrandWarehouseService,
    private masterService: MasterService,
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  private loadAll(): void {
    this.loadLicenseNames();
    this.loadRows();
    this.loadMasters();
  }

  private loadLicenseNames(): void {
    this.adminService.getActiveLicenses().subscribe({
      next: (licenses: ActiveLicense[]) => {
        this.licenseNameMap.clear();
        (Array.isArray(licenses) ? licenses : []).forEach(l => {
          const id = String(l.id || l.licenseeId || '').trim();
          if (id) this.licenseNameMap.set(id, l.establishmentName || id);
          // Also map licenseeId alias if different from id
          const lid = String(l.licenseeId || '').trim();
          if (lid && lid !== id) this.licenseNameMap.set(lid, l.establishmentName || lid);
        });
      },
      error: () => {},
    });
  }

  loadRows(): void {
    this.brandWarehouseService.getBrandWarehouses().subscribe({
      next: (data) => {
        this.allRows = Array.isArray(data) ? data : [];
        const maxPage = Math.max(0, Math.ceil(this.rows.length / this.pageSize) - 1);
        if (this.currentPage > maxPage) {
          this.currentPage = maxPage;
        }
      },
      error: () => Swal.fire('Error', 'Failed to load brands.', 'error'),
    });
  }

  private loadMasters(): void {
    this.masterService.getMasterBrands().subscribe({
      next: (resp: any) => {
        const data = resp?.data || resp?.results || [];
        this.brands = Array.isArray(data)
          ? data.map((x: any) => ({ id: Number(x.id), brandName: String(x.brandName ?? x.brand_name ?? '').trim() }))
               .filter((x: any) => x.id && x.brandName)
          : [];
      },
      error: () => (this.brands = []),
    });

    this.masterService.getLiquorCategories(false).subscribe({
      next: (resp: any) => {
        const data = resp?.data || resp?.results || [];
        this.sizes = Array.isArray(data)
          ? data.map((x: any) => ({ id: Number(x.id), sizeMl: Number(x.sizeMl ?? x.size_ml ?? 0) }))
               .filter((x: any) => x.sizeMl > 0)
          : [];
      },
      error: () => (this.sizes = []),
    });
  }

  onAddStock(): void {
    const dialogRef = this.dialog.open(StockManageComponent, {
      width: '720px',
      data: { brands: this.brands, sizes: this.sizes },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) { this.loadRows(); this.loadMasters(); }
    });
  }

  onEditStock(row: BrandWarehouse): void {
    const dialogRef = this.dialog.open(StockManageComponent, {
      width: '720px',
      data: { row: { ...row }, brands: this.brands, sizes: this.sizes },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) { this.loadRows(); this.loadMasters(); }
    });
  }

  onDelete(row: BrandWarehouse): void {
    if (row?.id === undefined) { Swal.fire('Error', 'Invalid row.', 'error'); return; }
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete "${row.brand_name || ''}" (${row.capacity_size} ml)?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.brandWarehouseService.deleteBrandWarehouse(row.id as number).subscribe({
        next: () => { Swal.fire('Deleted!', 'Row deleted successfully.', 'success'); this.loadRows(); },
        error: () => Swal.fire('Error', 'Failed to delete row.', 'error'),
      });
    });
  }

  onEditPrices(row: BrandWarehouse): void {
    const dialogRef = this.dialog.open(PriceManageComponent, {
      width: '760px',
      data: { row: { ...row } },
    });
    dialogRef.afterClosed().subscribe((result) => { if (result) this.loadRows(); });
  }
}
