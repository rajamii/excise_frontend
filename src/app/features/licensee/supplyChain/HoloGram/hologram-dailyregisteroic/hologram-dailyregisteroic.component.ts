import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HologramDataService } from '../../services/hologram-data.service';

interface HologramDailyEntry {
  id: number;
  date: string;
  referenceNo: string;
  brandDetails: string;
  bottleSize: string;
  rollNumber: string;
  issuedFrom: string;
  issuedTo: string;
  issuedQty: number;
  wastageFrom?: string;
  wastageTo?: string;
  wastageQty?: number;
  status: string;
  approvalStatus: string;
  submittedBy: string;
  submissionDate: string;
}

@Component({
  selector: 'app-hologram-dailyregisteroic',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hologram-dailyregisteroic.component.html',
  styleUrl: './hologram-dailyregisteroic.component.scss'
})
export class HologramDailyregisteroicComponent implements OnInit {
  // Data properties
  dailyEntries: HologramDailyEntry[] = [];
  filteredEntries: HologramDailyEntry[] = [];

  // Filter properties
  selectedDate: string = '';
  selectedStatus: string = '';
  selectedApprovalStatus: string = '';
  searchTerm: string = '';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;

  // Loading state
  isLoading: boolean = false;

  private hologramService = inject(HologramDataService);
  private router = inject(Router);

  ngOnInit(): void {
    this.setDefaultDate();
    this.loadDailyEntries();
  }

  private setDefaultDate(): void {
    const today = new Date();
    this.selectedDate = today.toISOString().split('T')[0];
  }

  loadDailyEntries(): void {
    this.isLoading = true;

    this.hologramService.getDailyRegisterEntries().subscribe({
      next: (data: any) => {
        this.dailyEntries = data.map((entry: any) => ({
          id: entry.id,
          date: entry.usage_date || entry.usageDate || entry.date,
          referenceNo: entry.reference_no || entry.referenceNo || `REF-${entry.id}`,
          brandDetails: entry.brand_details || entry.brandDetails || 'N/A',
          bottleSize: entry.bottle_size || entry.bottleSize || 'N/A',
          rollNumber: entry.cartoon_number || entry.cartoonNumber || entry.roll_number || 'N/A',
          issuedFrom: entry.issued_from || entry.issuedFrom || '',
          issuedTo: entry.issued_to || entry.issuedTo || '',
          issuedQty: entry.issued_qty || entry.issuedQty || 0,
          wastageFrom: entry.wastage_from || entry.wastageFrom || '',
          wastageTo: entry.wastage_to || entry.wastageTo || '',
          wastageQty: entry.wastage_qty || entry.wastageQty || 0,
          status: entry.status || 'PENDING',
          approvalStatus: entry.approval_status || entry.approvalStatus || 'PENDING',
          submittedBy: entry.submitted_by || entry.submittedBy || entry.licensee_name || 'N/A',
          submissionDate: entry.submission_date || entry.submissionDate || entry.created_at || entry.date
        }));

        this.applyFilters();
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading daily entries:', error);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredEntries = this.dailyEntries.filter(entry => {
      let matches = true;

      // Date filter
      if (this.selectedDate) {
        const entryDate = new Date(entry.date).toISOString().split('T')[0];
        matches = matches && entryDate === this.selectedDate;
      }

      // Status filter
      if (this.selectedStatus) {
        matches = matches && entry.status.toLowerCase().includes(this.selectedStatus.toLowerCase());
      }

      // Approval status filter
      if (this.selectedApprovalStatus) {
        matches = matches && entry.approvalStatus.toLowerCase().includes(this.selectedApprovalStatus.toLowerCase());
      }

      // Search term filter
      if (this.searchTerm) {
        const searchLower = this.searchTerm.toLowerCase();
        matches = matches && (
          entry.referenceNo.toLowerCase().includes(searchLower) ||
          entry.brandDetails.toLowerCase().includes(searchLower) ||
          entry.rollNumber.toLowerCase().includes(searchLower) ||
          entry.submittedBy.toLowerCase().includes(searchLower)
        );
      }

      return matches;
    });

    this.currentPage = 1;
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.selectedDate = '';
    this.selectedStatus = '';
    this.selectedApprovalStatus = '';
    this.searchTerm = '';
    this.applyFilters();
  }

  // Approval actions
  approveEntry(entry: HologramDailyEntry): void {
    if (confirm(`Approve entry ${entry.referenceNo}?`)) {
      // For daily register entries, we'll use a direct HTTP call or create a new method
      // For now, let's simulate the approval
      entry.approvalStatus = 'APPROVED';
      alert('Entry approved successfully');

      // TODO: Implement actual API call for daily register approval
      // this.hologramService.approveDailyEntry(entry.id).subscribe(...)
    }
  }

  rejectEntry(entry: HologramDailyEntry): void {
    const reason = prompt('Enter rejection reason:');
    if (reason && reason.trim()) {
      // For daily register entries, we'll use a direct HTTP call or create a new method
      // For now, let's simulate the rejection
      entry.approvalStatus = 'REJECTED';
      alert('Entry rejected successfully');

      // TODO: Implement actual API call for daily register rejection
      // this.hologramService.rejectDailyEntry(entry.id, reason).subscribe(...)
    }
  }

  viewEntryDetails(entry: HologramDailyEntry): void {
    // Navigate to unified view
    this.router.navigate(['/supply-chain-view'], {
      queryParams: {
        ref: entry.referenceNo,
        type: 'hologram',
        source: 'oic-register'
      }
    });
  }

  // Utility methods
  getStatusClass(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('approved')) return 'bg-success';
    if (statusLower.includes('rejected')) return 'bg-danger';
    if (statusLower.includes('pending')) return 'bg-warning';
    return 'bg-secondary';
  }

  getApprovalStatusClass(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('approved')) return 'bg-success';
    if (statusLower.includes('rejected')) return 'bg-danger';
    if (statusLower.includes('pending')) return 'bg-warning';
    return 'bg-secondary';
  }

  // Pagination methods
  getTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredEntries.length / this.pageSize));
  }

  getPaged(): HologramDailyEntry[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredEntries.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
    }
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Summary methods
  getTotalEntries(): number {
    return this.filteredEntries.length;
  }

  getPendingCount(): number {
    return this.filteredEntries.filter(e => e.approvalStatus.toLowerCase().includes('pending')).length;
  }

  getApprovedCount(): number {
    return this.filteredEntries.filter(e => e.approvalStatus.toLowerCase().includes('approved')).length;
  }

  getRejectedCount(): number {
    return this.filteredEntries.filter(e => e.approvalStatus.toLowerCase().includes('rejected')).length;
  }

  getTotalIssuedQty(): number {
    return this.filteredEntries.reduce((sum, entry) => sum + entry.issuedQty, 0);
  }

  getTotalWastageQty(): number {
    return this.filteredEntries.reduce((sum, entry) => sum + (entry.wastageQty || 0), 0);
  }
}
