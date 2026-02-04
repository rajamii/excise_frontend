import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HologramService, DailyRegisterEntry, DailyRegisterSummary } from '../../../../core/services/hologram.service';

interface FilterOptions {
  referenceNumber: string;
  status: string;
  type: string;
  dateFrom: string;
  dateTo: string;
  onlyOverdue: boolean;
  distillery: string;
}

@Component({
  selector: 'app-dailyhologramrecordregister',
  imports: [CommonModule, FormsModule],
  templateUrl: './dailyhologramrecordregister.component.html',
  styleUrl: './dailyhologramrecordregister.component.scss'
})
export class DailyhologramrecordregisterComponent implements OnInit {
  Math = Math;
  
  dailyRegisterEntries: DailyRegisterEntry[] = [];
  filteredEntries: DailyRegisterEntry[] = [];
  paginatedEntries: DailyRegisterEntry[] = [];
  summary: DailyRegisterSummary = {
    totalEntries: 0,
    applied: 0,
    underProcess: 0,
    completedOnTime: 0,
    completedLate: 0,
    overdue: 0
  };

  filters: FilterOptions = {
    referenceNumber: '',
    status: '',
    type: '',
    dateFrom: '',
    dateTo: '',
    onlyOverdue: false,
    distillery: ''
  };

  // List of distilleries/breweries - will be populated from backend
  distilleries: string[] = [];

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  // Selected entry for details modal
  selectedEntry: DailyRegisterEntry | null = null;

  // Loading state
  isLoading = false;
  errorMessage = '';

  constructor(private hologramService: HologramService) {}

  ngOnInit() {
    this.loadDailyRegisterEntries();
    
    // Auto-refresh every 30 seconds
    setInterval(() => {
      this.loadDailyRegisterEntries();
    }, 30000);
  }

  loadDailyRegisterEntries() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.hologramService.getDailyRegisterOverview().subscribe({
      next: (response) => {
        this.summary = response.summary;
        this.dailyRegisterEntries = response.entries;
        
        // Extract unique distilleries
        const distillerySet = new Set(response.entries.map(e => e.distilleryName));
        this.distilleries = Array.from(distillerySet).sort();
        
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading daily register:', error);
        this.errorMessage = 'Failed to load daily register data. Please try again.';
        this.isLoading = false;
      }
    });
  }

  applyFilters() {
    this.filteredEntries = this.dailyRegisterEntries.filter(entry => {
      const matchesReference = !this.filters.referenceNumber ||
        entry.referenceNo.toLowerCase().includes(this.filters.referenceNumber.toLowerCase());

      const matchesStatus = !this.filters.status || entry.status === this.filters.status;
      const matchesType = !this.filters.type || entry.hologramType === this.filters.type;

      const matchesDateFrom = !this.filters.dateFrom ||
        (entry.approvalDate ? new Date(entry.approvalDate) >= new Date(this.filters.dateFrom) : 
         new Date(entry.submissionDate) >= new Date(this.filters.dateFrom));

      const matchesDateTo = !this.filters.dateTo ||
        (entry.approvalDate ? new Date(entry.approvalDate) <= new Date(this.filters.dateTo) :
         new Date(entry.submissionDate) <= new Date(this.filters.dateTo));

      const matchesOverdue = !this.filters.onlyOverdue || entry.isOverdue;

      const matchesDistillery = !this.filters.distillery || 
        entry.distilleryName === this.filters.distillery;

      return matchesReference && matchesStatus && matchesType && 
             matchesDateFrom && matchesDateTo && matchesOverdue && matchesDistillery;
    });

    this.currentPage = 1;
    this.updatePagination();
  }

  clearFilters() {
    this.filters = {
      referenceNumber: '',
      status: '',
      type: '',
      dateFrom: '',
      dateTo: '',
      onlyOverdue: false,
      distillery: ''
    };
    this.applyFilters();
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredEntries.length / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedEntries = this.filteredEntries.slice(startIndex, endIndex);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'APPLIED': return 'bg-info text-white';
      case 'UNDER_PROCESS': return 'bg-warning text-dark';
      case 'COMPLETED': return 'bg-success text-white';
      default: return 'bg-secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'APPLIED': return 'bi bi-file-earmark-text';
      case 'UNDER_PROCESS': return 'bi bi-hourglass-split';
      case 'COMPLETED': return 'bi bi-check-circle-fill';
      default: return 'bi bi-question-circle';
    }
  }

  getTypeClass(type: string): string {
    switch (type) {
      case 'LOCAL': return 'bg-success text-white';
      case 'EXPORT': return 'bg-primary text-white';
      case 'DEFENCE': return 'bg-warning text-dark';
      default: return 'bg-secondary text-white';
    }
  }

  viewEntryDetails(entry: DailyRegisterEntry) {
    this.selectedEntry = entry;
  }

  closeDetailsModal() {
    this.selectedEntry = null;
  }

  getEntryCount(status?: string): number {
    if (status) {
      return this.filteredEntries.filter(entry => entry.status === status).length;
    }
    return this.filteredEntries.length;
  }

  getTotalHolograms(): number {
    return this.filteredEntries.reduce((total, entry) => total + entry.quantity, 0);
  }

  getOverdueCount(): number {
    return this.summary.overdue;
  }

  getCompletedOnTimeCount(): number {
    return this.summary.completedOnTime;
  }

  getCompletedLateCount(): number {
    return this.summary.completedLate;
  }

  exportData() {
    this.hologramService.exportDailyRegister('excel').subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `daily-hologram-register-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Export failed:', error);
        alert('Failed to export data. Please try again.');
      }
    });
  }

  refreshData() {
    this.loadDailyRegisterEntries();
  }

  clearAllData() {
    if (confirm('Are you sure you want to clear all register data? This will remove all entries.')) {
      // This would need a backend endpoint to clear data
      alert('Clear functionality requires backend implementation');
    }
  }

  getTimeRemaining(entry: DailyRegisterEntry): string {
    if (entry.status === 'APPLIED') {
      return 'Awaiting Approval';
    }
    
    if (entry.status === 'COMPLETED') {
      return 'Completed';
    }

    return entry.timeRemaining || 'No deadline set';
  }

  getTimeRemainingClass(entry: DailyRegisterEntry): string {
    if (entry.status === 'APPLIED') {
      return 'text-info';
    }
    
    if (entry.status === 'COMPLETED') {
      return 'text-success';
    }

    if (entry.isOverdue) {
      return 'text-danger fw-bold';
    }

    if (entry.timeRemaining) {
      const hours = parseInt(entry.timeRemaining.split('h')[0]);
      if (hours < 2) {
        return 'text-danger';
      } else if (hours < 4) {
        return 'text-warning';
      }
    }
    
    return 'text-success';
  }

  // Helper methods for brands summary
  getTotalBrandQuantity(brands: any[]): number {
    return brands.reduce((total, brand) => total + (brand.quantity || 0), 0);
  }

  getTotalRollsCount(brands: any[]): number {
    return brands.reduce((total, brand) => {
      const rollsCount = (brand.rollsAssigned || []).length;
      return total + rollsCount;
    }, 0);
  }

  getTotalSerialRanges(brands: any[]): number {
    return brands.reduce((total, brand) => {
      const serialRanges = brand.serialRanges || [];
      const rollsAssigned = brand.rollsAssigned || [];
      
      let rangesCount = 0;
      if (serialRanges.length > 0) {
        rangesCount = serialRanges.length;
      } else if (rollsAssigned.length > 0) {
        rangesCount = rollsAssigned.filter((roll: any) => roll.fromSerial && roll.toSerial).length;
      }
      return total + rangesCount;
    }, 0);
  }
}