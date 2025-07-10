import { Component, OnInit } from '@angular/core';
import { MaterialModule } from '../../../shared/material.module';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-home',
  imports: [MaterialModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'] // Corrected styleUrls
})
export class HomeComponent implements OnInit{
  selectedLink: string = '';
  markdownContent: string = '';

  notifications = [
    {
      title: 'Circular Regarding Settlement of Excise License',
      date: '04/02/2025',
      link: 'https://example.com'
    },
    {
      title: 'DRY DAY NOTIFICATION',
      date: '23/12/2024',
      link: 'https://example.com'
    },
    {
      title: 'Office order no 226/Excise dated 11/09/2024 regarding Grievance cell',
      date: '11/09/2024',
      link: 'https://example.com'
    },
    {
      title: 'Gazette No 394 regarding suspension on issue of New Foreign Liquor Retail License',
      date: '14/08/2024',
      link: 'https://example.com'
    },
    {
      title: 'Notification No 01/Excise regarding License Renewal for FY 2024-25',
      date: '08/02/2024',
      link: 'https://example.com'
    },
    {
      title: 'DRY DAY NOTIFICATION 2024',
      date: '08/01/2024',
      link: 'https://example.com'
    }
  ];

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    this.loadMarkdown();
  }

  loadMarkdown(): void {
    this.http.get(`assets/content/department.md`, { responseType: 'text' })
      .subscribe({
        next: data => this.markdownContent = data,
        error: () => this.markdownContent = '*Content not available.*'
      });
  }

  navigateToExternal(url: string) {
    window.location.href = url;
  }  

  navigateTo(page: string) {
    this.router.navigate(['/home', page]);
  }

  login(): void {
    this.router.navigate(['/login']); // Navigate to the login route
  }
}
