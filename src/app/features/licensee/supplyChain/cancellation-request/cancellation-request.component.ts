import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';

interface Permit {
  number: string;
  amount: number;
  isCancelled: boolean;
}

interface RequisitionData {
  ourRefNo: string;
  requisitionDate: string;
  branchName: string;
  branchAddress: string;
  grainENANumber: string;
  strengthFrom: string;
  strengthTo: string;
  liftedFrom: string;
  viaRoute: string;
  totalBL: string;
  permitNocount: string;
  branchPurpose: string;
  govtOfficer: string;
  state: string;
}

@Component({
  selector: 'app-cancellation-request',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cancellation-request.component.html',
  styleUrls: ['./cancellation-request.component.scss'],
})
export class CancellationRequestComponent implements OnInit {
  referenceNo: string = '';
  requisitionData: RequisitionData | null = null;
  permits: Permit[] = [];
  selectedPermits: string[] = [];
  newlySelectedPermits: string[] = [];

  // Modal states
  showDeclarationModal: boolean = false;
  showSuccessModal: boolean = false;
  showCancelModal: boolean = false;

  // Success message
  successMessage: string = '';
  errorMessage: string = '';

  // File upload
  uploadedFiles: any[] = [];

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // For testing with dummy data
    this.loadDummyData();
    
    // Commented out the API calls for now
    // this.route.queryParams.subscribe((params) => {
    //   this.referenceNo = params['RefNo'] || '';
    //   if (this.referenceNo) {
    //     this.loadCancellationData();
    //     this.loadPermitNumbers();
    //   }
    // });
  }

  loadDummyData() {
    this.requisitionData = {
      ourRefNo: 'TEST-2024-001',
      requisitionDate: '2024-11-10',
      branchName: 'Test Brewery Ltd.',
      branchAddress: 'Industrial Area, Test Road, Sikkim',
      grainENANumber: 'GRAIN-12345',
      strengthFrom: '5%',
      strengthTo: '8%',
      liftedFrom: 'Warehouse A',
      viaRoute: 'NH10',
      totalBL: 'BL-2024-001',
      permitNocount: '5',
      branchPurpose: 'Manufacturing',
      govtOfficer: 'Mr. Test Officer',
      state: 'Sikkim'
    };

    this.permits = [
      { number: 'PER-001', amount: 15000, isCancelled: false },
      { number: 'PER-002', amount: 20000, isCancelled: true },
      { number: 'PER-003', amount: 18000, isCancelled: false }
    ];
  }

  loadCancellationData() {
    console.log('Loading cancellation data for reference:', this.referenceNo);
    // Call your API to load cancellation data
    this.http.get(`/api/cancellation/${this.referenceNo}`).subscribe({
      next: (data: any) => {
        console.log('Received data:', data);
        this.requisitionData = data;
      },
      error: (error) => {
        console.error('Error loading cancellation data:', error);
        this.errorMessage = 'Failed to load cancellation data. Please try again.';
        // For testing, you can uncomment the following line to see if the template works with sample data
        // this.requisitionData = {
        //   ourRefNo: 'TEST123',
        //   branchName: 'Test Branch',
        //   branchAddress: 'Test Address',
        //   // ... other required fields
        // } as RequisitionData;
      },
    });
  }

  loadPermitNumbers() {
    this.http.get(`/api/cancellation/${this.referenceNo}/permits`).subscribe({
      next: (data: any) => {
        this.permits = data.permits;
      },
      error: (error) => {
        console.error('Error loading permit numbers:', error);
      },
    });
  }

  onPermitSelectionChange() {
    this.selectedPermits = this.permits
      .filter((p) => p.isCancelled)
      .map((p) => p.number);

    this.newlySelectedPermits = this.permits
      .filter((p) => !p.isCancelled)
      .map((p) => p.number);
  }

  onFileSelected(event: any, fileType: string) {
    const file = event.target.files[0];
    if (file) {
      this.uploadedFiles.push({
        file: file,
        type: fileType,
        name: file.name,
        size: this.formatFileSize(file.size),
      });
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes > 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    } else {
      return (bytes / 1024).toFixed(2) + ' KB';
    }
  }

  showDeclaration() {
    const cancellationCharges = this.newlySelectedPermits.length * 1000;
    this.successMessage = `Refund of ₹${cancellationCharges.toLocaleString()} will be processed after approval by the Commissioner.`;
    this.showDeclarationModal = true;
  }

  confirmCancellation() {
    this.showDeclarationModal = false;

    const payload = {
      referenceNo: this.referenceNo,
      permitNumbers: this.newlySelectedPermits,
      licenseeId: this.getLicenseeIdFromSession(),
    };

    this.http.post('/api/cancellation/submit', payload).subscribe({
      next: (response: any) => {
        this.showSuccessModal = true;
        this.successMessage = response.message;
      },
      error: (error) => {
        console.error('Error submitting cancellation:', error);
        // Handle error display
      },
    });
  }

  getLicenseeIdFromSession(): string {
    // Implement session management as per your application
    return localStorage.getItem('licensee_id') || '';
  }

  redirectToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  goBack() {
    this.router.navigate(['/licensee/ena-import']);
  }

  getTotalBalance(): number {
    if (!this.requisitionData) return 0;
    const permitAmount = parseFloat(this.requisitionData.grainENANumber) || 0;
    return permitAmount * this.selectedPermits.length;
  }

  getCancellationCharges(): number {
    return this.newlySelectedPermits.length * 1000;
  }
}
