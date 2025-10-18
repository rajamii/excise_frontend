import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface HologramMonthlyReport {
  id: string;
  month: string;
  year: number;
  companyName: string;
  totalLocalQty: number;
  totalExportQty: number;
  totalDefenceQty: number;
  totalQuantity: number;
  totalHologramFee: number;
  status: string;
  generatedDate: Date;
  generatedBy: string;
}

@Component({
  selector: 'app-hologram-monthly-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hologram-monthly-report.component.html',
  styleUrls: ['./hologram-monthly-report.component.scss']
})
export class HologramMonthlyReportComponent {
  Math = Math;
  selectedMonth = '';
  selectedYear = '';
  selectedCompany = '';
  selectedStatus = '';
  sidebarHidden = true;
  private isBrowser = false;

  // Sample data for hologram monthly reports
  monthlyReports: HologramMonthlyReport[] = [
    {
      id: '1',
      month: 'January',
      year: 2025,
      companyName: 'Yuksom Breweries Ltd.',
      totalLocalQty: 150.5,
      totalExportQty: 25.0,
      totalDefenceQty: 10.0,
      totalQuantity: 185.5,
      totalHologramFee: 18550.00,
      status: 'Generated',
      generatedDate: new Date('2025-01-31'),
      generatedBy: 'System Admin'
    },
    {
      id: '2',
      month: 'February',
      year: 2025,
      companyName: 'Yuksom Breweries Ltd.',
      totalLocalQty: 180.0,
      totalExportQty: 30.5,
      totalDefenceQty: 15.0,
      totalQuantity: 225.5,
      totalHologramFee: 22550.00,
      status: 'Generated',
      generatedDate: new Date('2025-02-28'),
      generatedBy: 'System Admin'
    },
    {
      id: '3',
      month: 'March',
      year: 2025,
      companyName: 'Yuksom Breweries Ltd.',
      totalLocalQty: 200.0,
      totalExportQty: 40.0,
      totalDefenceQty: 20.0,
      totalQuantity: 260.0,
      totalHologramFee: 26000.00,
      status: 'Draft',
      generatedDate: new Date('2025-03-15'),
      generatedBy: 'System Admin'
    },
    {
      id: '4',
      month: 'December',
      year: 2024,
      companyName: 'Yuksom Breweries Ltd.',
      totalLocalQty: 120.0,
      totalExportQty: 15.0,
      totalDefenceQty: 5.0,
      totalQuantity: 140.0,
      totalHologramFee: 14000.00,
      status: 'Generated',
      generatedDate: new Date('2024-12-31'),
      generatedBy: 'System Admin'
    }
  ];

  filteredReports: HologramMonthlyReport[] = [];

  constructor(private router: Router, @Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.filteredReports = [...this.monthlyReports];
  }

  // Filter methods
  onSearch(): void {
    this.filteredReports = this.monthlyReports.filter(report => {
      const monthMatch = !this.selectedMonth || report.month.toLowerCase().includes(this.selectedMonth.toLowerCase());
      const yearMatch = !this.selectedYear || report.year.toString() === this.selectedYear;
      const companyMatch = !this.selectedCompany || report.companyName.toLowerCase().includes(this.selectedCompany.toLowerCase());
      const statusMatch = !this.selectedStatus || report.status.toLowerCase().includes(this.selectedStatus.toLowerCase());
      
      return monthMatch && yearMatch && companyMatch && statusMatch;
    });
  }

  onClear(): void {
    this.selectedMonth = '';
    this.selectedYear = '';
    this.selectedCompany = '';
    this.selectedStatus = '';
    this.filteredReports = [...this.monthlyReports];
  }

  // Navigation methods
  goBack(): void {
    this.router.navigate(['/dev-supply-chain']);
  }

  generateReport(): void {
    // Logic to generate new monthly report
    console.log('Generating new hologram monthly report...');
    // In a real application, this would call a service to generate the report
  }

  viewReport(report: HologramMonthlyReport): void {
    console.log('Viewing report:', report.id);
    // In a real application, this would open a detailed view or PDF
  }

  downloadReport(report: HologramMonthlyReport): void {
    console.log('Downloading report:', report.id);
    // In a real application, this would download the report as PDF/Excel
  }

  editReport(report: HologramMonthlyReport): void {
    console.log('Editing report:', report.id);
    // In a real application, this would open an edit form
  }

  deleteReport(report: HologramMonthlyReport): void {
    if (confirm('Are you sure you want to delete this report?')) {
      this.monthlyReports = this.monthlyReports.filter(r => r.id !== report.id);
      this.onSearch(); // Refresh filtered list
    }
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'generated':
        return 'badge bg-success';
      case 'draft':
        return 'badge bg-warning';
      case 'pending':
        return 'badge bg-info';
      default:
        return 'badge bg-secondary';
    }
  }

  toggleSidebar(): void {
    this.sidebarHidden = !this.sidebarHidden;
  }

  // Pagination
  pageSize = 10;
  currentPage = 1;

  getTotalPages(): number {
    return Math.ceil(this.filteredReports.length / this.pageSize);
  }

  getPagedReports(): HologramMonthlyReport[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredReports.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    const totalPages = this.getTotalPages();
    if (page >= 1 && page <= totalPages) {
      this.currentPage = page;
    }
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
  }
}