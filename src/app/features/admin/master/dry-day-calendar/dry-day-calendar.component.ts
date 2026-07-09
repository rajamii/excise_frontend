import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../../../environments/environment';
import Swal from 'sweetalert2';

interface MonthGridDay {
  date: Date | null;
  dateStr: string; // "YYYY-MM-DD"
  dayNumber: number | null;
  isDryDay: boolean;
}

interface MonthInfo {
  name: string;
  year: number;
  monthIndex: number; // 0-11
  days: MonthGridDay[];
}

@Component({
  selector: 'app-dry-day-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './dry-day-calendar.component.html',
  styleUrl: './dry-day-calendar.component.scss'
})
export class DryDayCalendarComponent implements OnInit {
  isLoading = false;
  financialYear = '2026-27';
  availableYears: string[] = ['2025-26', '2026-27', '2027-28', '2028-29'];
  
  allowedDates: Set<string> = new Set<string>(); // Set of YYYY-MM-DD strings
  months: MonthInfo[] = [];
  weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  private apiBaseUrl = `${environment.apiBaseUrl}/transactional/special-permit/master-dry-day/`;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadCalendar();
  }

  loadCalendar(): void {
    this.isLoading = true;
    this.http.get<any>(`${this.apiBaseUrl}?financial_year=${this.financialYear}`).subscribe({
      next: (res) => {
        this.allowedDates.clear();
        const datesList = res?.allowedDates || res?.allowed_dates || [];
        datesList.forEach((d: string) => this.allowedDates.add(d));
        this.generateCalendarStructure();
        this.isLoading = false;
      },
      error: () => {
        Swal.fire('Error', 'Failed to load dry day calendar configuration.', 'error');
        this.generateCalendarStructure();
        this.isLoading = false;
      }
    });
  }

  generateCalendarStructure(): void {
    // A financial year e.g. "2026-27" starts April 1st 2026 and ends March 31st 2027
    const parts = this.financialYear.split('-');
    if (parts.length !== 2) return;
    
    const startYear = parseInt(parts[0], 10);
    const endYear = 2000 + parseInt(parts[1], 10); // handles "27" to 2027

    // Month order: April (3) to Dec (11) of startYear, then Jan (0) to March (2) of endYear
    const monthConfigs = [
      { month: 3, year: startYear, name: 'April' },
      { month: 4, year: startYear, name: 'May' },
      { month: 5, year: startYear, name: 'June' },
      { month: 6, year: startYear, name: 'July' },
      { month: 7, year: startYear, name: 'August' },
      { month: 8, year: startYear, name: 'September' },
      { month: 9, year: startYear, name: 'October' },
      { month: 10, year: startYear, name: 'November' },
      { month: 11, year: startYear, name: 'December' },
      { month: 0, year: endYear, name: 'January' },
      { month: 1, year: endYear, name: 'February' },
      { month: 2, year: endYear, name: 'March' }
    ];

    this.months = monthConfigs.map((cfg) => {
      const days = this.getMonthDays(cfg.year, cfg.month);
      return {
        name: cfg.name,
        year: cfg.year,
        monthIndex: cfg.month,
        days
      };
    });
  }

  getMonthDays(year: number, month: number): MonthGridDay[] {
    const startDate = new Date(year, month, 1);
    const startDayOfWeek = startDate.getDay(); // 0 (Sunday) to 6 (Saturday)
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: MonthGridDay[] = [];

    // Pad days leading up to the 1st of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({
        date: null,
        dateStr: '',
        dayNumber: null,
        isDryDay: false
      });
    }

    // Populate active days of the month
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const dateStr = this.formatLocalDate(d);
      days.push({
        date: d,
        dateStr,
        dayNumber: i,
        isDryDay: this.allowedDates.has(dateStr)
      });
    }

    return days;
  }

  formatLocalDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  toggleDay(day: MonthGridDay): void {
    if (!day.date || !day.dateStr) return;

    if (this.allowedDates.has(day.dateStr)) {
      this.allowedDates.delete(day.dateStr);
      day.isDryDay = false;
    } else {
      this.allowedDates.add(day.dateStr);
      day.isDryDay = true;
    }
  }

  onYearChange(): void {
    this.loadCalendar();
  }

  addNewFinancialYear(): void {
    Swal.fire({
      title: 'Add Financial Year',
      input: 'text',
      inputPlaceholder: 'YYYY-YY (e.g. 2029-30)',
      showCancelButton: true,
      confirmButtonText: 'Add',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value) {
          return 'Financial Year code is required!';
        }
        if (!/^\d{4}-\d{2}$/.test(value)) {
          return 'Format must be YYYY-YY (e.g. 2029-30)';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const newYear = result.value;
        if (!this.availableYears.includes(newYear)) {
          this.availableYears.push(newYear);
          this.availableYears.sort();
        }
        this.financialYear = newYear;
        this.loadCalendar();
      }
    });
  }

  saveCalendar(): void {
    this.isLoading = true;
    const sortedDates = Array.from(this.allowedDates).sort();

    this.http.post<any>(this.apiBaseUrl, {
      financial_year: this.financialYear,
      allowed_dates: sortedDates
    }).subscribe({
      next: () => {
        Swal.fire('Saved!', 'Dry Day calendar saved successfully.', 'success');
        this.isLoading = false;
      },
      error: (err) => {
        const msg = err?.error?.detail || 'Failed to save calendar.';
        Swal.fire('Error', msg, 'error');
        this.isLoading = false;
      }
    });
  }
}
