import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../shared/material.module';
import { ActivatedRoute } from '@angular/router';
import { WhatsCurrentService } from '../../../../core/services/whats-current.service';
import { environment } from '../../../../../environments/environment';

interface Notification {
  date: string;
  subject: string;
  category: string;
  file?: string;
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

  displayedColumns: string[] = ['date', 'subject', 'download'];

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.page = params.get('page');
    });
    this.loadNotifications();
  }

  constructor(
    private route: ActivatedRoute,
    private whatsCurrentService: WhatsCurrentService
  ) {}

  loadNotifications() {
    this.whatsCurrentService.getWhatsCurrent().subscribe({
      next: (data) => {
        this.notifications = data.map(item => ({
          date: item.date,
          subject: item.title,
          category: item.category,
          file: item.file ? String(item.file) : undefined
        }));
      },
      error: (err) => {
        console.error('Failed to load notifications dynamically:', err);
      }
    });
  }

  get filteredNotifications(): Notification[] {
    // Never show bullet notifications in the public list
    const nonBullet = this.notifications.filter(n => n.category !== 'bullet');
    if (this.selectedCategory === 'all') {
      return nonBullet;
    }
    return nonBullet.filter(n => n.category === this.selectedCategory);
  }

  downloadFile(notification: Notification) {
    if (notification.file) {
      const url = notification.file.startsWith('http')
        ? notification.file
        : `${environment.apiBaseUrl}${notification.file}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      alert('No document attached.');
    }
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
