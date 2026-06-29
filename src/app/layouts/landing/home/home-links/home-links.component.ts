import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../shared/material.module';
import { ActivatedRoute } from '@angular/router';
import { MasterService } from '../../../../core/services/master.service';

interface Notification {
  notificationDate: string;
  subject: string;
  category: string;
  notificationFileUrl?: string | null;
  notificationFileDownloadUrl?: string | null;
}

@Component({
  selector: 'app-home-links',
  imports: [MaterialModule],
  templateUrl: './home-links.component.html',
  styleUrl: './home-links.component.scss'
})
export class HomeLinksComponent implements OnInit{
  page: string | null= '';
  selectedCategory: string = 'all';

  notifications: Notification[] = [];

  displayedColumns: string[] = ['date', 'subject', 'view', 'download'];

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.page = params.get('page');
      if (this.page === 'notifications') {
        this.loadNotifications();
      }
    });
  }

  constructor(private route: ActivatedRoute, private masterService: MasterService) {}

  get filteredNotifications(): Notification[] {
    if (this.selectedCategory === 'all') {
      return this.notifications;
    }
    return this.notifications.filter(notification => notification.category === this.selectedCategory);
  }

  downloadFile(notification: Notification) {
    const downloadUrl = notification.notificationFileDownloadUrl || notification.notificationFileUrl;
    if (!downloadUrl) return;
    window.location.href = downloadUrl;
  }

  viewFile(notification: Notification) {
    if (!notification.notificationFileUrl) return;
    window.open(notification.notificationFileUrl, '_blank', 'noopener,noreferrer');``
  }

  loadNotifications(): void {
    this.masterService.getPublicNotifications().subscribe({
      next: (data) => this.notifications = Array.isArray(data) ? data : [],
      error: () => this.notifications = []
    });
  }
  
  raidsColumns: string[] = ['photo', 'caption'];

  dataSource = [
    {
      photoUrl: '../../assets/images/main/preventive-raids/preventive-raids.jpg',
      publishedOn: 'Apr 20 2021 12:00AM',
      caption: 'Raid conducted by Sikkim State Excise',
      captionLink: 'Excise Raids on illicit dens in Remote Villages.'
    }
  ];
}
