import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { environment } from '../../../../../../environments/environment';
import { InfoPagesService } from '../../../../../core/services/info-pages.service';
import { MaterialModule } from '../../../../../shared/material.module';
import {
  ExciseSecretary,
  HeadOfOrganisation,
  AboutUs,
  Department,
  ProductsServices,
  RefundCancellationPolicy
} from '../../../../../core/models/about-us.model';
import { ManageComponent } from '../manage/manage.component';

type AboutUsCategoryKey =
  | 'headsOfOrganisations'
  | 'exciseSecretaries'
  | 'aboutUsText'
  | 'productsAndServices'
  | 'refundCancellationPolicy';

type AboutUsRecord =
  | HeadOfOrganisation
  | ExciseSecretary
  | AboutUs
  | Department
  | ProductsServices
  | RefundCancellationPolicy;

interface AboutUsFieldConfig {
  key: string;
  apiKey?: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'email' | 'file' | 'textarea' | 'date' | 'color';
}

interface AboutUsCategoryConfig {
  key: AboutUsCategoryKey;
  label: string;
  singularLabel: string;
  displayedColumns: string[];
  fields: AboutUsFieldConfig[];
  load: () => import('rxjs').Observable<AboutUsRecord[]>;
  create: (data: Partial<AboutUsRecord>) => import('rxjs').Observable<AboutUsRecord>;
  update: (id: number, data: Partial<AboutUsRecord>) => import('rxjs').Observable<AboutUsRecord>;
  delete: (id: number) => import('rxjs').Observable<any>;
}

@Component({
  selector: 'app-about-us-list',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  categories: AboutUsCategoryConfig[] = [];
  activeCategory!: AboutUsCategoryConfig;
  dataSource: Record<string, AboutUsRecord[]> = {};

  constructor(
    private route: ActivatedRoute,
    private infoPagesService: InfoPagesService,
    private dialog: MatDialog
  ) {
    this.categories = this.buildCategories();
  }

  ngOnInit(): void {
    const categoryKey = this.route.snapshot.data['aboutUsCategory'] as AboutUsCategoryKey | undefined;
    this.activeCategory = this.categories.find(category => category.key === categoryKey) || this.categories[0];
    this.loadCategory(this.activeCategory);
  }

  loadCategory(category: AboutUsCategoryConfig): void {
    category.load().subscribe({
      next: (data) => this.dataSource[category.key] = data,
      error: () => Swal.fire('Error', `Failed to load ${category.label}.`, 'error')
    });
  }

  onAdd(category: AboutUsCategoryConfig): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '650px',
      data: { category, record: null }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadCategory(category);
    });
  }

  onEdit(category: AboutUsCategoryConfig, record: AboutUsRecord): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '650px',
      data: { category, record }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadCategory(category);
    });
  }

  onDelete(category: AboutUsCategoryConfig, record: AboutUsRecord): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete "${this.getRecordName(record)}" from ${category.label}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete'
    }).then(result => {
      if (result.isConfirmed && record.id !== undefined) {
        category.delete(record.id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Record deleted successfully.', 'success');
            this.loadCategory(category);
          },
          error: () => Swal.fire('Error', 'Failed to delete record.', 'error')
        });
      }
    });
  }

  getColumnLabel(column: string): string {
    const labels: Record<string, string> = {
      name: 'Name',
      designation: 'Designation',
      email: 'Email',
      fromDate: 'From Date',
      toDate: 'To Date',
      title: 'Title',
      image: 'Image',
      content: 'Content Preview',
      headerColor: 'Header Color',
      headerTextColor: 'Text Color',
      cardBgColor: 'Card Bg',
      accentColor: 'Accent Color',
      actions: 'Actions'
    };

    return labels[column] || column;
  }

  getColumnValue(record: AboutUsRecord, column: string): string {
    const field = this.activeCategory.fields.find(item => item.key === column);
    const value = this.readValue(record, column, field?.apiKey);
    if (column === 'content' && typeof value === 'string') {
      return value.length > 100 ? value.substring(0, 100) + '...' : value;
    }
    return value === '' ? '-' : String(value);
  }

  isFileColumn(column: string): boolean {
    return this.activeCategory.fields.some(field => field.key === column && field.type === 'file');
  }

  isColorColumn(column: string): boolean {
    return this.activeCategory.fields.some(field => field.key === column && field.type === 'color');
  }

  canViewFile(record: AboutUsRecord, column: string): boolean {
    return this.getFileUrl(record, column) !== '';
  }

  viewFile(record: AboutUsRecord, column: string): void {
    const fileUrl = this.getFileUrl(record, column);

    if (!fileUrl) {
      Swal.fire('No Image', 'No image has been uploaded for this record.', 'info');
      return;
    }

    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  }

  private buildCategories(): AboutUsCategoryConfig[] {
    return [
      {
        key: 'aboutUsText',
        label: 'Department Content',
        singularLabel: 'Department Content',
        displayedColumns: ['title', 'headerColor', 'cardBgColor', 'content', 'actions'],
        fields: [
          { key: 'title', label: 'Page Title', required: true },
          { key: 'headerColor', apiKey: 'header_color', label: 'Header Background Color', type: 'color' as const },
          { key: 'headerTextColor', apiKey: 'header_text_color', label: 'Header Text Color', type: 'color' as const },
          { key: 'cardBgColor', apiKey: 'card_bg_color', label: 'Card Background Color', type: 'color' as const },
          { key: 'accentColor', apiKey: 'accent_color', label: 'Accent / Border Color', type: 'color' as const },
          { key: 'content', label: 'Content (Markdown)', required: true, type: 'textarea' as const }
        ],
        load: () => this.infoPagesService.getDepartment(),
        create: (data) => this.infoPagesService.createDepartment(data),
        update: (id, data) => this.infoPagesService.updateDepartment(id, data),
        delete: (id) => this.infoPagesService.deleteDepartment(id)
      },
      {
        key: 'productsAndServices',
        label: 'Products & Services',
        singularLabel: 'Products & Services Content',
        displayedColumns: ['title', 'headerColor', 'cardBgColor', 'content', 'actions'],
        fields: [
          { key: 'title', label: 'Page Title', required: true },
          { key: 'headerColor', apiKey: 'header_color', label: 'Header Background Color', type: 'color' as const },
          { key: 'headerTextColor', apiKey: 'header_text_color', label: 'Header Text Color', type: 'color' as const },
          { key: 'cardBgColor', apiKey: 'card_bg_color', label: 'Card Background Color', type: 'color' as const },
          { key: 'accentColor', apiKey: 'accent_color', label: 'Accent / Border Color', type: 'color' as const },
          { key: 'content', label: 'Content (Markdown)', required: true, type: 'textarea' as const }
        ],
        load: () => this.infoPagesService.getProductsServices(),
        create: (data) => this.infoPagesService.createProductsServices(data),
        update: (id, data) => this.infoPagesService.updateProductsServices(id, data),
        delete: (id) => this.infoPagesService.deleteProductsServices(id)
      },
      {
        key: 'refundCancellationPolicy',
        label: 'Refund / Cancellation Policy',
        singularLabel: 'Refund / Cancellation Policy Content',
        displayedColumns: ['title', 'headerColor', 'cardBgColor', 'content', 'actions'],
        fields: [
          { key: 'title', label: 'Page Title', required: true },
          { key: 'headerColor', apiKey: 'header_color', label: 'Header Background Color', type: 'color' as const },
          { key: 'headerTextColor', apiKey: 'header_text_color', label: 'Header Text Color', type: 'color' as const },
          { key: 'cardBgColor', apiKey: 'card_bg_color', label: 'Card Background Color', type: 'color' as const },
          { key: 'accentColor', apiKey: 'accent_color', label: 'Accent / Border Color', type: 'color' as const },
          { key: 'content', label: 'Content (Markdown)', required: true, type: 'textarea' as const }
        ],
        load: () => this.infoPagesService.getRefundCancellationPolicy(),
        create: (data) => this.infoPagesService.createRefundCancellationPolicy(data),
        update: (id, data) => this.infoPagesService.updateRefundCancellationPolicy(id, data),
        delete: (id) => this.infoPagesService.deleteRefundCancellationPolicy(id)
      },
      {
        key: 'headsOfOrganisations',
        label: 'Heads of Organisations',
        singularLabel: 'Head of Organisation',
        displayedColumns: ['name', 'title', 'image', 'actions'],
        fields: [
          { key: 'name', label: 'Name', required: true },
          { key: 'title', label: 'Title', required: true },
          { key: 'image', label: 'Upload Image', required: true, type: 'file' as const }
        ],
        load: () => this.infoPagesService.getHeadsOfOrganisations(),
        create: (data) => this.infoPagesService.createHeadOfOrganisation(data),
        update: (id, data) => this.infoPagesService.updateHeadOfOrganisation(id, data),
        delete: (id) => this.infoPagesService.deleteHeadOfOrganisation(id)
      },
      {
        key: 'exciseSecretaries',
        label: 'Excise Secretaries / Principal Secretaries',
        singularLabel: 'Excise Secretary / Principal Secretary',
        displayedColumns: ['name', 'designation', 'email', 'fromDate', 'toDate', 'actions'],
        fields: [
          { key: 'name', label: 'Name', required: true },
          { key: 'designation', label: 'Designation', required: true },
          { key: 'email', label: 'Email', required: true, type: 'email' as const },
          { key: 'fromDate', apiKey: 'from_date', label: 'From Date', type: 'date' as const },
          { key: 'toDate', apiKey: 'to_date', label: 'To Date', type: 'date' as const }
        ],
        load: () => this.infoPagesService.getExciseSecretaries(),
        create: (data) => this.infoPagesService.createExciseSecretary(data),
        update: (id, data) => this.infoPagesService.updateExciseSecretary(id, data),
        delete: (id) => this.infoPagesService.deleteExciseSecretary(id)
      }
    ];
  }

  private getRecordName(record: AboutUsRecord): string {
    return String(this.readValue(record, 'name') || 'this record');
  }

  private getFileUrl(record: AboutUsRecord, column: string): string {
    const field = this.activeCategory.fields.find(item => item.key === column);
    const value = this.readValue(record, column, field?.apiKey);

    if (!value || typeof value !== 'string') {
      return '';
    }

    if (value.startsWith('http') || value.startsWith('assets/')) {
      return value;
    }

    return value.startsWith('/')
      ? `${environment.apiBaseUrl}${value}`
      : `${environment.apiBaseUrl}/${value}`;
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
