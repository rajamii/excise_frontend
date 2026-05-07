import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { InfoPagesService } from '../../../../../core/services/info-pages.service';
import { MaterialModule } from '../../../../../shared/material.module';
import {
  DirectorateAndDistrictOfficials,
  GrievanceRedressalOfficer,
  NodalOfficer,
  PublicInformationOfficer
} from '../../../../../core/models/contact-us.model';
import { ManageComponent } from '../manage/manage.component';

type ContactUsCategoryKey =
  | 'nodalOfficer'
  | 'publicInformationOfficer'
  | 'directorateAndDistrictOfficials'
  | 'grievanceRedressalOfficer';

type ContactUsRecord =
  | NodalOfficer
  | PublicInformationOfficer
  | DirectorateAndDistrictOfficials
  | GrievanceRedressalOfficer;

interface ContactUsFieldConfig {
  key: string;
  apiKey?: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  options?: Array<{ value: string; label: string }>;
}

interface ContactUsCategoryConfig {
  key: ContactUsCategoryKey;
  label: string;
  singularLabel: string;
  displayedColumns: string[];
  fields: ContactUsFieldConfig[];
  load: () => import('rxjs').Observable<ContactUsRecord[]>;
  create: (data: Partial<ContactUsRecord>) => import('rxjs').Observable<ContactUsRecord>;
  update: (id: number, data: Partial<ContactUsRecord>) => import('rxjs').Observable<ContactUsRecord>;
  delete: (id: number) => import('rxjs').Observable<any>;
}

@Component({
  selector: 'app-contact-us-list',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  categories: ContactUsCategoryConfig[] = [];
  activeCategory!: ContactUsCategoryConfig;
  dataSource: Record<string, ContactUsRecord[]> = {};

  constructor(
    private route: ActivatedRoute,
    private infoPagesService: InfoPagesService,
    private dialog: MatDialog
  ) {
    this.categories = this.buildCategories();
  }

  ngOnInit(): void {
    const categoryKey = this.route.snapshot.data['contactUsCategory'] as ContactUsCategoryKey | undefined;
    this.activeCategory = this.categories.find(category => category.key === categoryKey) || this.categories[0];
    this.loadCategory(this.activeCategory);
  }

  loadAll(): void {
    this.categories.forEach(category => this.loadCategory(category));
  }

  loadCategory(category: ContactUsCategoryConfig): void {
    category.load().subscribe({
      next: (data) => this.dataSource[category.key] = data,
      error: () => Swal.fire('Error', `Failed to load ${category.label}.`, 'error')
    });
  }

  onAdd(category: ContactUsCategoryConfig): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '600px',
      data: { category, record: null }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadCategory(category);
    });
  }

  onEdit(category: ContactUsCategoryConfig, record: ContactUsRecord): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '600px',
      data: { category, record }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadCategory(category);
    });
  }

  onDelete(category: ContactUsCategoryConfig, record: ContactUsRecord): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete "${record.name}" from ${category.label}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete'
    }).then(result => {
      if (result.isConfirmed && record.id !== undefined) {
        category.delete(record.id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Contact deleted successfully.', 'success');
            this.loadCategory(category);
          },
          error: () => Swal.fire('Error', 'Failed to delete contact.', 'error')
        });
      }
    });
  }

  getColumnLabel(column: string): string {
    const labels: Record<string, string> = {
      name: 'Name',
      designation: 'Designation',
      phoneNumber: 'Phone Number',
      email: 'Email',
      department: 'Department',
      cell: 'Cell',
      locationType: 'Location Type',
      location: 'Location',
      address: 'Address',
      officeLevel: 'Office Level',
      officeSubLevel: 'Office Sub Level',
      actions: 'Actions'
    };

    return labels[column] || column;
  }

  getColumnValue(contact: ContactUsRecord, column: string): string {
    const field = this.activeCategory.fields.find(item => item.key === column);
    const value = this.readValue(contact, column, field?.apiKey);
    return value === '' ? '-' : String(value);
  }

  private buildCategories(): ContactUsCategoryConfig[] {
    const commonFields = [
      { key: 'name', label: 'Name', required: true },
      { key: 'designation', label: 'Designation', required: true },
      { key: 'phoneNumber', label: 'Phone Number', required: true, type: 'tel' as const },
      { key: 'email', label: 'Email', required: true, type: 'email' as const }
    ];

    return [
      {
        key: 'nodalOfficer',
        label: 'Website Nodal Officer',
        singularLabel: 'Website Nodal Officer',
        displayedColumns: ['department', 'cell', 'phoneNumber', 'email', 'actions'],
        fields: [
          { key: 'department', label: 'Department', required: true },
          { key: 'cell', label: 'Cell', required: true },
          { key: 'phoneNumber', label: 'Phone Number', required: true, type: 'tel' as const },
          { key: 'email', label: 'Email', required: true, type: 'email' as const }
        ],
        load: () => this.infoPagesService.getNodalOfficers(),
        create: (data) => this.infoPagesService.createNodalOfficer(data),
        update: (id, data) => this.infoPagesService.updateNodalOfficer(id, data),
        delete: (id) => this.infoPagesService.deleteNodalOfficer(id)
      },
      {
        key: 'publicInformationOfficer',
        label: 'Public Information Officers',
        singularLabel: 'Public Information Officer',
        displayedColumns: ['locationType', 'location', 'name', 'designation', 'address', 'phoneNumber', 'email', 'actions'],
        fields: [
          ...commonFields,
          {
            key: 'locationType',
            label: 'Location Type',
            required: true,
            type: 'select',
            options: [
              { value: 'Headquarter', label: 'Headquarter' },
              { value: 'District', label: 'District' }
            ]
          },
          { key: 'location', label: 'Location', required: true },
          { key: 'address', label: 'Address', required: true, type: 'textarea' }
        ],
        load: () => this.infoPagesService.getPublicInformationOfficers(),
        create: (data) => this.infoPagesService.createPublicInformationOfficer(data),
        update: (id, data) => this.infoPagesService.updatePublicInformationOfficer(id, data),
        delete: (id) => this.infoPagesService.deletePublicInformationOfficer(id)
      },
      {
        key: 'directorateAndDistrictOfficials',
        label: 'Directorate & District Officials',
        singularLabel: 'Directorate & District Official',
        displayedColumns: ['name', 'designation', 'phoneNumber', 'email', 'actions'],
        fields: commonFields,
        load: () => this.infoPagesService.getDirectorateAndDistrictOfficials(),
        create: (data) => this.infoPagesService.createDirectorateAndDistrictOfficial(data),
        update: (id, data) => this.infoPagesService.updateDirectorateAndDistrictOfficial(id, data),
        delete: (id) => this.infoPagesService.deleteDirectorateAndDistrictOfficial(id)
      },
      {
        key: 'grievanceRedressalOfficer',
        label: 'Grievance Redressal Officer',
        singularLabel: 'Grievance Redressal Officer',
        displayedColumns: ['officeLevel', 'officeSubLevel', 'name', 'designation', 'phoneNumber', 'email', 'actions'],
        fields: [
          ...commonFields,
          {
            key: 'officeLevel',
            label: 'Office Level',
            required: true,
            type: 'select',
            options: [
              { value: 'Head Quarter', label: 'Head Quarter' },
              { value: 'Permit Section', label: 'Permit Section' },
              { value: 'Administration Section', label: 'Administration Section' },
              { value: 'Accounts Section', label: 'Accounts Section' },
              { value: 'IT Cell', label: 'IT Cell' }
            ]
          },
          { key: 'officeSubLevel', label: 'Office Sub Level' }
        ],
        load: () => this.infoPagesService.getGrievanceRedressalOfficers(),
        create: (data) => this.infoPagesService.createGrievanceRedressalOfficer(data),
        update: (id, data) => this.infoPagesService.updateGrievanceRedressalOfficer(id, data),
        delete: (id) => this.infoPagesService.deleteGrievanceRedressalOfficer(id)
      }
    ];
  }

  private readValue(record: any, key: string, apiKey?: string): any {
    const candidates = [
      key,
      apiKey,
      this.toSnakeCase(key),
      this.toCamelCase(apiKey || key)
    ].filter((value): value is string => !!value);

    for (const candidate of candidates) {
      if (record?.[candidate] !== undefined && record?.[candidate] !== null && record?.[candidate] !== '') {
        return record[candidate];
      }
    }

    return '';
  }

  private toSnakeCase(value: string): string {
    return value.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  private toCamelCase(value: string): string {
    return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
  }
}
