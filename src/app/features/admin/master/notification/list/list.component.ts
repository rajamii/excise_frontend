import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { Notification } from '../../../../../core/models/notification.model';
import { MasterService } from '../../../../../core/services/master.service';
import { AdminService } from '../../../admin.service';
import { ManageComponent } from '../manage/manage.component';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  displayedColumns: string[] = ['notificationDate', 'subject', 'category', 'image', 'actions'];
  notifications: Notification[] = [];

  categoryLabels: { [key: string]: string } = {
    act: 'Act',
    rule: 'Rule',
    circular: 'Circular'
  };

  constructor(
    private masterService: MasterService,
    private adminService: AdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.masterService.getNotifications().subscribe({
      next: (data: Notification[]) => this.notifications = Array.isArray(data) ? data : [],
      error: () => Swal.fire('Error', 'Failed to load notifications.', 'error')
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ManageComponent, { width: '550px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadNotifications();
    });
  }

  onEdit(notification: Notification): void {
    const dialogRef = this.dialog.open(ManageComponent, {
      width: '550px',
      data: { ...notification }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.loadNotifications();
    });
  }

  canViewFile(notification: Notification): boolean {
    return !!notification.notificationFileUrl;
  }

  viewFile(notification: Notification): void {
    if (!notification.notificationFileUrl) {
      Swal.fire('No Image', 'No image has been uploaded for this record.', 'info');
      return;
    }

    window.open(notification.notificationFileUrl, '_blank', 'noopener,noreferrer');
  }

  onDelete(notification: Notification): void {
    if (notification?.id === undefined) {
      Swal.fire('Error', 'Invalid notification record.', 'error');
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: `Delete notification "${notification.subject}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.adminService.deleteNotification(notification.id as number).subscribe({
        next: () => {
          Swal.fire('Deleted!', 'Notification deleted successfully.', 'success');
          this.loadNotifications();
        },
        error: () => Swal.fire('Error', 'Failed to delete notification.', 'error')
      });
    });
  }
}
