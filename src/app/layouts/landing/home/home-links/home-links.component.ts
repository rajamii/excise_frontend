import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../../shared/material.module';
import { ActivatedRoute } from '@angular/router';
import { WhatsCurrentService } from '../../../../core/services/whats-current.service';
import { PreventiveRaidsService } from '../../../../core/services/preventive-raids.service';
import { PreventiveRaid } from '../../../../core/models/preventive-raids.model';
import { environment } from '../../../../../environments/environment';

interface Notification {
  date: string;
  subject: string;
  message?: string;
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
  preventiveRaids: PreventiveRaid[] = [];

  displayedColumns: string[] = ['date', 'subject', 'download'];

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.page = params.get('page');
    });
    this.loadNotifications();
    this.loadRaids();
  }

  constructor(
    private route: ActivatedRoute,
    private whatsCurrentService: WhatsCurrentService,
    private raidsService: PreventiveRaidsService
  ) {}

  loadNotifications() {
    this.whatsCurrentService.getWhatsCurrent().subscribe({
      next: (data) => {
        this.notifications = data.map(item => ({
          date: item.date,
          subject: item.title,
          message: item.message,
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

  truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }
  
  raidsColumns: string[] = ['photo', 'caption'];
  dataSource: PreventiveRaid[] = [];

  loadRaids(): void {
    this.raidsService.getPreventiveRaids().subscribe({
      next: (data) => {
        this.dataSource = data;
      },
      error: (err) => {
        console.error('Failed to load preventive raids:', err);
      }
    });
  }

  getRaidImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    if (imagePath.startsWith('http') || imagePath.startsWith('assets/')) {
      return imagePath;
    }
    return `${environment.apiBaseUrl}${imagePath}`;
  }
}
