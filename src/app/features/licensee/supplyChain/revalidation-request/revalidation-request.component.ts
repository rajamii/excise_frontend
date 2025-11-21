import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface DisplayData {
  refNo: string;
  date: Date;
  totalENA: string;
  strengthFrom: string;
  permitNumbers: string;
  permitDate: Date;
  expiryDate: Date;
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
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const refNo = params['RefNo'];

      if (refNo) {
        this.loadRevalidationData(refNo);
      } else {
        this.initializeDefaultData();
      }
    });
  }

  private initializeDefaultData() {
    this.displayData.date = new Date();
    this.displayData.permitDate = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    );
    this.displayData.expiryDate = new Date();
  }

  private loadRevalidationData(refNo: string) {
    // Replace with your Django API endpoint
    this.http.get<any>(`/api/revalidation/${refNo}/`).subscribe({
      next: (data) => {
        this.displayData = {
          refNo: data.our_ref_no,
          date: new Date(data.requisition_date),
          totalENA: data.total_bl,
          strengthFrom: data.strength_from,
          permitNumbers: data.permit_no_count,
          permitDate: new Date(data.requisition_date),
          expiryDate: new Date(),
        };
      },
      error: (error) => {
        this.showMessage('Error loading data: ' + error.message, 'danger');
        this.displayData.refNo = 'Error loading data';
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
    // Close modal first
    const modalElement = document.getElementById('declarationModal');
    if (modalElement) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
      modal.hide();
    }

    // Prepare data for Django backend
    const revalidationData = {
      ref_no: this.displayData.refNo,
      licensee_id: this.getLicenseeId(), // Get from auth service
      amount: 1000,
    };

    // Call Django API
    this.http.post('/api/revalidation/submit/', revalidationData).subscribe({
      next: (response: any) => {
        this.showMessage(
          `Revalidation request submitted successfully! ₹1000 has been deducted from your wallet.`,
          'success'
        );

        // Redirect after success
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 2000);
      },
      error: (error) => {
        this.showMessage(
          'Error submitting revalidation: ' + error.error.message,
          'danger'
        );
      },
    });
  }

  goBack() {
    this.router.navigate(['/licensee/ena-import']);
  }

  private getLicenseeId(): string {
    // Implement your authentication service to get licensee ID
    // This is a placeholder - replace with actual implementation
    return localStorage.getItem('licensee_id') || '';
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
