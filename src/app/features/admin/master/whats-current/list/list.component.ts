import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { environment } from '../../../../../../environments/environment';
import { WhatsCurrentService } from '../../../../../core/services/whats-current.service';
import { MaterialModule } from '../../../../../shared/material.module';
import { WhatsCurrent } from '../../../../../core/models/whats-current.model';
import { ManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-whats-current-list',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  dataSource: WhatsCurrent[] = [];
  displayedColumns: string[] = ['category', 'date', 'title', 'file', 'status', 'actions'];
  selectedCategory = 'all';

  constructor(
    private whatsCurrentService: WhatsCurrentService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.whatsCurrentService.getWhatsCurrent(undefined, true).subscribe({
      next: (data) => {
        this.dataSource = data.map((item: any) => ({
          ...item,
          isActive: item.isActive !== undefined ? item.isActive : item.is_active
        }));
      },
      error: () => Swal.fire('Error', 'Failed to load What\'s Current records.', 'error')
    });
  }

  onTabChange(event: any): void {
    const tabs = ['all', 'act', 'rule', 'circular', 'bullet', 'license'];
    this.selectedCategory = tabs[event.index] || 'all';
  }

  get filteredDataSource(): WhatsCurrent[] {
    if (this.selectedCategory === 'all') {
      return this.dataSource;
    }
    return this.dataSource.filter(item => item.category === this.selectedCategory);
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      act: 'Acts',
      rule: 'Rules',
      circular: 'Circulars',
      bullet: 'Bullet Notifications',
      license: 'License Info'
    };
    return labels[category] || category;
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '600px',
      data: { record: null }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadData();
    });
  }

  onEdit(record: WhatsCurrent): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '600px',
      data: { record }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadData();
    });
  }

  onDelete(record: WhatsCurrent): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete "${record.title}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete'
    }).then(result => {
      if (result.isConfirmed && record.id !== undefined) {
        this.whatsCurrentService.deleteWhatsCurrent(record.id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Record deleted successfully.', 'success');
            this.loadData();
          },
          error: () => Swal.fire('Error', 'Failed to delete record.', 'error')
        });
      }
    });
  }

  getFileUrl(fileUrl: any): string {
    if (!fileUrl || typeof fileUrl !== 'string') return '';
    if (fileUrl.startsWith('http')) return fileUrl;
    return fileUrl.startsWith('/')
      ? `${environment.apiBaseUrl}${fileUrl}`
      : `${environment.apiBaseUrl}/${fileUrl}`;
  }

  viewFile(fileUrl: string): void {
    const url = this.getFileUrl(fileUrl);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      Swal.fire('No File', 'No file has been uploaded for this record.', 'info');
    }
  }
}
