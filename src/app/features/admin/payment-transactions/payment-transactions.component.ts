import { Component, OnInit, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { MaterialModule } from '../../../shared/material.module';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-payment-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './payment-transactions.component.html',
  styleUrls: ['./payment-transactions.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class PaymentTransactionsComponent implements OnInit {
  private http = inject(HttpClient);
  Number = Number;

  searchQuery = '';
  selectedStatus = ''; // '', 'S', 'F', 'P'
  transactions: any[] = [];
  isLoading = false;
  totalTransactions = 0;
  pageIndex = 0;
  pageSize = 10;
  pageSizeOptions = [10, 25, 50, 100];
  error: string | null = null;

  private searchSubject = new Subject<string>();

  ngOnInit() {
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => {
      this.pageIndex = 0;
      this.loadTransactions();
    });

    this.loadTransactions();
  }

  loadTransactions() {
    this.isLoading = true;
    this.error = null;

    const params: any = {
      page: this.pageIndex + 1,
      page_size: this.pageSize
    };

    if (this.searchQuery.trim()) {
      params.query = this.searchQuery.trim();
    }

    if (this.selectedStatus) {
      params.status = this.selectedStatus;
    }

    this.http.get<any>(`${environment.apiBaseUrl}/transactional/payment-gateway/billdesk/transactions/`, { params })
      .subscribe({
        next: (response) => {
          this.transactions = response.results || [];
          this.totalTransactions = response.count || 0;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error fetching transactions:', err);
          this.error = 'Failed to load transactions. Please verify permissions and try again.';
          this.isLoading = false;
        }
      });
  }

  onSearchChange() {
    this.searchSubject.next(this.searchQuery);
  }

  onStatusChange() {
    this.pageIndex = 0;
    this.loadTransactions();
  }

  clearSearch() {
    this.searchQuery = '';
    this.pageIndex = 0;
    this.loadTransactions();
  }

  onPageChange(event: any) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadTransactions();
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'S': return 'Success';
      case 'F': return 'Failed';
      case 'P': return 'Pending';
      default: return 'Unknown';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'S': return 'status-success';
      case 'F': return 'status-failed';
      case 'P': return 'status-pending';
      default: return 'status-unknown';
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  }

  viewDetails(txn: any) {
    const statusLabel = this.getStatusLabel(txn.paymentStatus);
    const statusClass = this.getStatusClass(txn.paymentStatus);

    Swal.fire({
      title: '',
      html: `
        <div class="txn-detail-modal">
          <div class="txn-detail-header ${statusClass}">
            <div class="txn-detail-header-icon">
              <span class="material-icons">${txn.paymentStatus === 'S' ? 'check_circle' : txn.paymentStatus === 'F' ? 'cancel' : 'pending'}</span>
            </div>
            <h2>Transaction Details</h2>
            <div class="txn-status-badge">${statusLabel}</div>
          </div>

          <div class="txn-detail-body">
            <div class="txn-detail-section">
              <h3>Payment Summary</h3>
              <div class="txn-detail-grid">
                <div class="txn-detail-row">
                  <span class="detail-label">UTR / Order ID</span>
                  <span class="detail-value highlight"><code>${txn.utr || 'N/A'}</code></span>
                </div>
                <div class="txn-detail-row">
                  <span class="detail-label">Transaction Amount</span>
                  <span class="detail-value amount-value">₹${Number(txn.transactionAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div class="txn-detail-row">
                  <span class="detail-label">Purpose / Category</span>
                  <span class="detail-value">${txn.purpose || 'N/A'}</span>
                </div>
                <div class="txn-detail-row">
                  <span class="detail-label">Module Code</span>
                  <span class="detail-value"><code>${txn.paymentModuleCode || 'N/A'}</code></span>
                </div>
              </div>
            </div>

            <div class="txn-detail-section">
              <h3>Applicant & System Details</h3>
              <div class="txn-detail-grid">
                <div class="txn-detail-row">
                  <span class="detail-label">Applicant Name</span>
                  <span class="detail-value font-bold">${txn.applicantName || 'N/A'}</span>
                </div>
                <div class="txn-detail-row">
                  <span class="detail-label">Application ID (Payer)</span>
                  <span class="detail-value"><code>${txn.payerId || 'N/A'}</code></span>
                </div>
                <div class="txn-detail-row">
                  <span class="detail-label">Initiated By</span>
                  <span class="detail-value"><code>${txn.userId || 'N/A'}</code></span>
                </div>
                <div class="txn-detail-row">
                  <span class="detail-label">Date & Time</span>
                  <span class="detail-value">${this.formatDate(txn.transactionDate)}</span>
                </div>
              </div>
            </div>

            <div class="txn-detail-section">
              <h3>Gateway Response</h3>
              <div class="txn-detail-grid">
                <div class="txn-detail-row">
                  <span class="detail-label">Bank Reference No.</span>
                  <span class="detail-value"><code>${txn.responseBankreferenceno || 'N/A'}</code></span>
                </div>
                <div class="txn-detail-row">
                  <span class="detail-label">Bank Auth Status</span>
                  <span class="detail-value"><code>${txn.responseAuthstatus || 'N/A'}</code></span>
                </div>
                <div class="txn-detail-row">
                  <span class="detail-label">Gateway Txn Date</span>
                  <span class="detail-value">${this.formatDate(txn.responseTxndate)}</span>
                </div>
                <div class="txn-detail-row">
                  <span class="detail-label">Error/Status Remarks</span>
                  <span class="detail-value remark-value">${txn.responseErrordescription || 'None'}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="txn-detail-footer">
            <button id="close-detail-btn" class="modal-close-btn">Close Window</button>
          </div>
        </div>
      `,
      showConfirmButton: false,
      width: '480px',
      background: '#ffffff',
      showCloseButton: true,
      customClass: {
        popup: 'custom-sweetalert-popup',
        htmlContainer: 'custom-sweetalert-container'
      },
      didOpen: () => {
        const closeBtn = document.getElementById('close-detail-btn');
        if (closeBtn) {
          closeBtn.addEventListener('click', () => Swal.close());
        }
      }
    });
  }
}
