import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MasterService } from '../../../core/services/master.service';

interface HomeNotification {
  title: string;
  date: string;
  link: string;
}

@Component({
  selector: 'app-home',
  imports: [MaterialModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'] // Corrected styleUrls
})
export class HomeComponent implements OnInit{
  selectedLink: string = '';
  markdownContent: string = '';

  notifications: HomeNotification[] = [];

  constructor(
    private router: Router,
    private http: HttpClient,
    private masterService: MasterService
  ) {}

  ngOnInit(): void {
    this.loadMarkdown();
    this.loadNotifications();
  }

  loadMarkdown(): void {
    this.http.get(`assets/content/department.md`, { responseType: 'text' })
      .subscribe({
        next: data => this.markdownContent = data,
        error: () => this.markdownContent = '*Content not available.*'
      });
  }

  navigateToExternal(url: string) {
    if (!url) return;
    window.location.href = url;
  }  

  loadNotifications(): void {
    this.masterService.getPublicNotifications(6).subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : [];
        this.notifications = list.map((notification: any) => ({
          title: notification.subject,
          date: this.formatDate(notification.notificationDate),
          link: notification.notificationFileUrl || ''
        }));
      },
      error: () => this.notifications = []
    });
  }

  private formatDate(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-GB');
  }

  navigateTo(page: string) {
    this.router.navigate(['/home', page]);
  }

  login(): void {
    this.router.navigate(['/login']); // Navigate to the login route
  }
}
