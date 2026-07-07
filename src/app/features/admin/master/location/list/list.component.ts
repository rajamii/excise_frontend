import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { MasterLocation } from '../../../../../core/models/master-location.model';
import { LocationCategory } from '../../../../../core/models/location-category.model';
import { LocationSubcategory } from '../../../../../core/models/location-subcategory.model';
import { MasterService } from '../../../../../core/services/master.service';
import { ManageComponent } from '../manage/manage.component';
import { ManageLocationCategoryComponent } from '../manage-location-category/manage-location-category.component';
import { ManageLocationSubcategoryComponent } from '../manage-location-subcategory/manage-location-subcategory.component';

@Component({
  selector: 'app-location-list',
  standalone: true,
  imports: [MaterialModule, CommonModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  // Tab 1: Locations
  displayedColumns: string[] = ['locationCode', 'locationDescription', 'district', 'status', 'actions'];
  locations: MasterLocation[] = [];

  // Tab 2: Categories
  categoryColumns: string[] = ['categoryName', 'description', 'type', 'status', 'actions'];
  locationCategories: LocationCategory[] = [];

  // Tab 3: Subcategories
  subcategoryColumns: string[] = ['subcategoryName', 'categoryName', 'description', 'status', 'actions'];
  locationSubcategories: LocationSubcategory[] = [];

  constructor(
    private masterService: MasterService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadLocations();
    this.loadLocationCategories();
    this.loadLocationSubcategories();
  }

  // ========================== Tab 1: Locations CRUD ==========================
  loadLocations(): void {
    this.masterService.getLocations().subscribe({
      next: (data: any) => (this.locations = data),
      error: () => Swal.fire('Error', 'Failed to load locations.', 'error')
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadLocations();
    });
  }

  onEdit(loc: MasterLocation): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '500px',
      data: loc
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadLocations();
    });
  }

  onDelete(loc: MasterLocation): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Deactivate location "${loc.locationDescription}" (${loc.locationCode})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Deactivate',
    }).then(result => {
      if (result.isConfirmed) {
        this.masterService.deleteLocation(loc.id!).subscribe({
          next: () => {
            Swal.fire('Deactivated!', 'Location deactivated.', 'success');
            this.loadLocations();
          },
          error: () => Swal.fire('Error', 'Failed to deactivate location.', 'error')
        });
      }
    });
  }

  // ========================== Tab 2: Location Categories CRUD ==========================
  loadLocationCategories(): void {
    this.masterService.getLocationCategories().subscribe({
      next: (data: any) => {
        this.locationCategories = data.map((item: any) => ({
          id: item.id,
          categoryName: item.categoryName || item.category_name,
          description: item.description,
          isActive: item.isActive !== undefined ? item.isActive : item.is_active,
          isRural: item.isRural !== undefined ? item.isRural : item.is_rural,
          operationDate: item.operationDate || item.operation_date,
          createdBy: item.createdBy || item.created_by,
          status: item.status
        }));
      },
      error: () => Swal.fire('Error', 'Failed to load location categories.', 'error')
    });
  }

  onAddCategory(): void {
    const dialogRef = this.dialog.open(ManageLocationCategoryComponent, {
      width: '500px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadLocationCategories();
    });
  }

  onEditCategory(category: LocationCategory): void {
    const dialogRef = this.dialog.open(ManageLocationCategoryComponent, {
      width: '500px',
      data: category
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadLocationCategories();
    });
  }

  onDeleteCategory(category: LocationCategory): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Deactivate category "${category.categoryName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Deactivate',
    }).then(result => {
      if (result.isConfirmed) {
        this.masterService.deleteLocationCategory(category.id).subscribe({
          next: () => {
            Swal.fire('Deactivated!', 'Location category deactivated.', 'success');
            this.loadLocationCategories();
          },
          error: () => Swal.fire('Error', 'Failed to deactivate location category.', 'error')
        });
      }
    });
  }

  // ========================== Tab 3: Location Subcategories CRUD ==========================
  loadLocationSubcategories(): void {
    this.masterService.getLocationSubcategories().subscribe({
      next: (data: any) => {
        this.locationSubcategories = data.map((item: any) => ({
          id: item.id,
          subcategoryName: item.subcategoryName || item.subcategory_name,
          categoryId: item.category, // parent category id returned in 'category' from serializer
          categoryName: item.categoryName || item.category_name,
          description: item.description,
          isActive: item.isActive !== undefined ? item.isActive : item.is_active,
          operationDate: item.operationDate || item.operation_date,
          createdBy: item.createdBy || item.created_by,
          status: item.status,
          subDivision: item.sub_division || item.subDivision
        }));
      },
      error: () => Swal.fire('Error', 'Failed to load location subcategories.', 'error')
    });
  }

  onAddSubcategory(): void {
    const dialogRef = this.dialog.open(ManageLocationSubcategoryComponent, {
      width: '500px',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadLocationSubcategories();
    });
  }

  onEditSubcategory(sub: LocationSubcategory): void {
    const dialogRef = this.dialog.open(ManageLocationSubcategoryComponent, {
      width: '500px',
      data: sub
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadLocationSubcategories();
    });
  }

  onDeleteSubcategory(sub: LocationSubcategory): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Deactivate subcategory "${sub.subcategoryName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Deactivate',
    }).then(result => {
      if (result.isConfirmed) {
        this.masterService.deleteLocationSubcategory(sub.id).subscribe({
          next: () => {
            Swal.fire('Deactivated!', 'Location subcategory deactivated.', 'success');
            this.loadLocationSubcategories();
          },
          error: () => Swal.fire('Error', 'Failed to deactivate location subcategory.', 'error')
        });
      }
    });
  }
}
