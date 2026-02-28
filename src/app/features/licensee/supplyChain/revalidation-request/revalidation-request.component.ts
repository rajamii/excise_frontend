import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupplyChainService } from '../services/supplychain.service';

interface DisplayData {
  refNo: string;
  date: Date;
  totalENA: string;
  bulk_spirit_type: string;
  permitNumbers: string;
  permitDate: Date;
  expiryDate: Date;
  // Add other fields as needed based on backend response
}

@Component({
  selector: 'app-revalidation-request',
  standalone: true,
  templateUrl: './revalidation-request.component.html',
  styleUrls: ['./revalidation-request.component.scss'],
  imports: [CommonModule, FormsModule],
})
export class RevalidationRequestComponent implements OnInit {
  message: string = '';
  messageType: string = 'danger';

  displayData: DisplayData = {
    refNo: '',
    date: new Date(),
    totalENA: '0',
    bulk_spirit_type: '',
    permitNumbers: '',
    permitDate: new Date(),
    expiryDate: new Date(),
  };

  isViewMode: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supplyChainService: SupplyChainService
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const id = params['id'];
      this.isViewMode = params['mode'] === 'view';

      if (id) {
        this.loadRevalidationData(id);
      } else {
        // Only if NOT viewing (creating new) do we care about missing ID differently?
        // Actually for request we usually need ID unless it's a completely new blank form?
        // Let's keep existing logic.
        this.showMessage('No Revalidation ID provided.', 'danger');
        setTimeout(() => this.goBack(), 2000);
      }
    });
  }

  private loadRevalidationData(id: string) {
    this.supplyChainService.getRevalidationDetail(id).subscribe({
      next: (data) => {
        console.log('Detail Data:', data); // Debug log
        this.displayData = {
          refNo: data.ourRefNo || data.our_ref_no,
          date: new Date(data.revalidationDate || data.revalidationDate),
          totalENA: data.totalBl || data.total_bl,
          bulk_spirit_type: data.strength || data.bulk_spirit_type || '',
          permitNumbers: (data.requisitonNumberOfPermits || data.requisiton_number_of_permits || '0').toString(),
          permitDate: new Date(data.requisitionDate || data.requisition_date),
          expiryDate: new Date(data.revalidationDate || data.revalidation_date),
        };
      },
      error: (error) => {
        this.showMessage('Error loading data: ' + error.message, 'danger');
      },
    });
  }

  showDeclarationModal() {
    // Using Bootstrap modal via JavaScript
    const modalElement = document.getElementById('declarationModal');
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  submitRevalidation() {
    // Hide the modal first
    const modalElement = document.getElementById('declarationModal');
    if (modalElement) {
      // Use Bootstrap's instance to hide it properly
      const bootstrap = (window as any).bootstrap;
      if (bootstrap) {
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) {
          modalInstance.hide();
        }
      } else {
        // Fallback for direct DOM manipulation if bootstrap global not found (though it should be)
        modalElement.classList.remove('show');
        document.body.classList.remove('modal-open');
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) backdrop.remove();
      }
    }

    const id = this.route.snapshot.queryParams['id'];
    if (!id) {
      this.showMessage('No Revalidation ID found to submit.', 'danger');
      return;
    }

    this.supplyChainService.submitRevalidation(id).subscribe({
      next: (response) => {
        // Success
        this.showMessage('Revalidation request submitted successfully!', 'success');

        // Navigate back to the dashboard revalidation section after a short delay
        setTimeout(() => {
          this.router.navigate(['/dashboard'], { queryParams: { section: 'revalidation' } });
        }, 1500);
      },
      error: (error) => {
        console.error('Submission error:', error);
        const errMsg = error.error?.message || error.error?.error || error.message || 'Unknown error';
        this.showMessage('Failed to submit revalidation: ' + errMsg, 'danger');
      }
    });
  }

  goBack() {
    const sourceParam = String(this.route.snapshot.queryParams['source'] || '').trim().toLowerCase();
    let normalizedSource = 'licensee-dashboard';

    if (sourceParam.includes('commissioner')) {
      normalizedSource = 'commissioner-dashboard';
    } else if (sourceParam.includes('permit-section')) {
      normalizedSource = 'permit-section';
    } else if (sourceParam.includes('licensee')) {
      normalizedSource = 'licensee-dashboard';
    }

    this.router.navigate(['/dashboard'], {
      queryParams: {
        section: 'revalidation',
        source: normalizedSource
      }
    });
  }


  private showMessage(msg: string, type: string) {
    this.message = msg;
    this.messageType = type;

    // Auto hide after 5 seconds
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }
}

