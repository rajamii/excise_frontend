import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupplyChainService } from '../services/supplychain.service';

interface DisplayData {
  refNo: string;
  date: Date;
  totalENA: string;
  strengthFrom: string;
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
    strengthFrom: '',
    permitNumbers: '',
    permitDate: new Date(),
    expiryDate: new Date(),
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supplyChainService: SupplyChainService
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const id = params['id'];

      if (id) {
        this.loadRevalidationData(id);
      } else {
        // Handle missing ID, maybe redirect back or show error
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
          strengthFrom: data.strength || data.strength_from || '',
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
    // Implement submission logic if needed, or if this view is just for re-requesting
    // For now, let's keep the existing structure but maybe update the API call if different
    this.showMessage('Feature not fully implemented yet.', 'info');

    // Example submission logic placeholder
    /*
    const modalElement = document.getElementById('declarationModal');
    if (modalElement) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
      modal.hide();
    }
    // ... submission code
    */
  }

  goBack() {
    this.router.navigate(['/dev-supply-chain'], { queryParams: { tab: 'revalidation' } });
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

