import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { PreventiveRaid } from '../../../../../core/models/preventive-raids.model';
import { PreventiveRaidsService } from '../../../../../core/services/preventive-raids.service';
import { ManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-preventive-raid-list',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  dataSource: PreventiveRaid[] = [];
  displayedColumns: string[] = ['date', 'title', 'subject', 'imagesCount', 'actions'];

  constructor(
    private raidsService: PreventiveRaidsService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadRaids();
  }

  loadRaids(): void {
    this.raidsService.getPreventiveRaids().subscribe({
      next: (data) => this.dataSource = data,
      error: () => Swal.fire('Error', 'Failed to load Preventive Raids.', 'error')
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '650px',
      data: { record: null }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadRaids();
    });
  }

  onEdit(record: PreventiveRaid): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '650px',
      data: { record }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadRaids();
    });
  }

  onDelete(record: PreventiveRaid): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete "${record.title}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete'
    }).then(result => {
      if (result.isConfirmed && record.id !== undefined) {
        this.raidsService.deletePreventiveRaid(record.id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Preventive Raid record deleted successfully.', 'success');
            this.loadRaids();
          },
          error: () => Swal.fire('Error', 'Failed to delete Preventive Raid record.', 'error')
        });
      }
    });
  }

  truncateText(text: string, limit: number = 80): string {
    if (!text) return '';
    return text.length > limit ? text.substring(0, limit) + '...' : text;
  }
}
