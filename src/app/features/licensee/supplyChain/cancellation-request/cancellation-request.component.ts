import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { SupplyChainService } from '../services/supplychain.service';
import { SupplyChainProfileService } from '../../../../core/services/supply-chain-profile.service';
import { environment } from '../../../../../environments/environment';

interface Permit {
  number: string;
  amount: number;
  isCancelled: boolean;
  isLocked: boolean;
  lockReason?: string;
  isSelected?: boolean;
}

interface RequisitionData {
  ourRefNo: string;
  requisitionDate: string;
  branchName: string; // Placeholder in backend
  branchAddress: string; // Placeholder
  grainEnaNumber: string; // Backend sends grainEnaNumber (camelCase of grain_ena_number)
  strength: string; // Backend sends strength
  liftedFromDistilleryName: string; // Backend sends lifted_from_distillery_name
  viaRoute: string; // Backend sends via_route -> viaRoute
  totalbl: string; // Backend sends totalbl
  requisitonNumberOfPermits: number; // Backend sends requisitonNumberOfPermits
  branchPurpose: string;
  govtOfficer: string; // Placeholder
  state: string;
  liftedFrom: string; // Backend sends lifted_from -> liftedFrom
}

@Component({
  selector: 'app-cancellation-request',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cancellation-request.component.html',
  styleUrls: ['./cancellation-request.component.scss'],
})
export class CancellationRequestComponent implements OnInit, OnChanges {
  @Input() referenceNo: string = '';
  @Output() close = new EventEmitter<void>();

  requisitionData: any = null; // Using any to match backend response roughly
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
  isLoading: boolean = false;

  // File upload
  uploadedFiles: any[] = [];

  // Profile Data
  currentLicenseeId: string = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private supplyChainService: SupplyChainService,
    private profileService: SupplyChainProfileService
  ) { }

  ngOnInit() {
    console.log('CancellationRequestComponent: ngOnInit, refNo:', this.referenceNo);
    if (this.referenceNo) {
      this.loadData();
    }
    this.fetchProfile();
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('CancellationRequestComponent: ngOnChanges', changes);
    if (changes['referenceNo'] && changes['referenceNo'].currentValue) {
      this.loadData();
    }
  }

  fetchProfile() {
    this.profileService.getProfile().subscribe({
      next: (res) => {
        if (res.exists && res.data) {
          this.currentLicenseeId = res.data.licenseeId;
          console.log('Fetched Licensee ID:', this.currentLicenseeId);
        } else {
          console.warn('Profile not found, defaulting loop or error?');
        }
      },
      error: (err) => console.error('Error fetching profile', err)
    });
  }

  loadData() {
    console.log('CancellationRequestComponent: loading data for', this.referenceNo);
    this.isLoading = true;
    this.errorMessage = '';

    // 1. Fetch Requisition Data
    this.http.get<any[]>(`${environment.apiBaseUrl}/transactional/supply_chain/ena-requisitions/?our_ref_no=${this.referenceNo}`).subscribe({
      next: (reqData) => {
        console.log('CancellationRequestComponent: req Data loaded', reqData);
        if (reqData && reqData.length > 0) {
          this.requisitionData = reqData[0];

          // 2. Fetch Existing Cancellations to mark cancelled permits
          this.fetchExistingCancellations();
        } else {
          this.errorMessage = 'Requisition not found.';
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error loading requisition:', error);
        this.errorMessage = 'Failed to load requisition data.';
        this.isLoading = false;
      }
    });
  }

  fetchExistingCancellations() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/transactional/supply_chain/ena-cancellation-details/?requisition_ref_no=${this.referenceNo}`).subscribe({
      next: (cancelData) => {
        console.log('Cancellation Data:', cancelData);
        const permitStateMap = new Map<string, { isCancelled: boolean; isLocked: boolean; lockReason: string }>();
        if (cancelData) {
          if (Array.isArray(cancelData)) {
            cancelData.forEach(c => {
              const cancelledRaw = c.cancelled_permit_numbers || c.cancelled_permit_number || '';
              if (cancelledRaw) {
                const permitNumbers = cancelledRaw
                  .split(',')
                  .map((num: string) => num.trim())
                  .filter((num: string) => num.length > 0);

                const isApproved = this.isCommissionerApprovedCancellation(c);
                const isPaid = this.isPaidCancellation(c);
                const isLocked = this.isActiveCancellationRequest(c) || isPaid;
                const lockReason = isApproved ? 'Cancelled' : (isPaid ? 'Paid' : 'Already submitted');

                permitNumbers.forEach((num: string) => {
                  const existing = permitStateMap.get(num) || {
                    isCancelled: false,
                    isLocked: false,
                    lockReason: ''
                  };

                  permitStateMap.set(num, {
                    isCancelled: existing.isCancelled || isApproved,
                    isLocked: existing.isLocked || isLocked,
                    lockReason: existing.lockReason || (isLocked ? lockReason : '')
                  });
                });
              }
            });
          } else {
            console.warn('Cancel Data is not an array:', cancelData);
          }
        }
        console.log('Generating permits with count:', this.requisitionData.requisitonNumberOfPermits);
        this.generatePermitsFromRequisition(permitStateMap);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading cancellations:', error);
        console.log('Generating permits (fallback) with count:', this.requisitionData.requisitonNumberOfPermits);
        this.generatePermitsFromRequisition(new Map());
        this.isLoading = false;
      }
    });
  }

  private isCommissionerApprovedCancellation(record: any): boolean {
    const status = String(record?.status || '').toLowerCase();
    const stageName = String(record?.current_stage_name || '').toLowerCase();
    const merged = `${status} ${stageName}`;
    return merged.includes('approved') && merged.includes('commissioner');
  }

  private isRejectedCancellation(record: any): boolean {
    const status = String(record?.status || '').toLowerCase();
    const stageName = String(record?.current_stage_name || '').toLowerCase();
    const merged = `${status} ${stageName}`;
    return merged.includes('reject');
  }

  private isPaidCancellation(record: any): boolean {
    if (record?.payment_completed === true) {
      return true;
    }

    const paymentStatus = String(
      record?.payment_status ||
      record?.paymentStatus ||
      record?.wallet_payment_status ||
      ''
    ).toLowerCase();

    if (['success', 'paid', 'completed'].includes(paymentStatus)) {
      return true;
    }

    const status = String(record?.status || '').toLowerCase();
    return status.includes('payslip') || status.includes('paid');
  }

  private isActiveCancellationRequest(record: any): boolean {
    return !this.isRejectedCancellation(record);
  }

  private generatePermitsFromRequisition(permitStateMap: Map<string, { isCancelled: boolean; isLocked: boolean; lockReason: string }>) {
    const detailsNumbersRaw =
      this.requisitionData?.details_permits_number ||
      this.requisitionData?.detailsPermitsNumber ||
      '';

    const explicitPermitNumbers = String(detailsNumbersRaw)
      .split(',')
      .map((num: string) => num.trim())
      .filter((num: string) => num.length > 0);

    if (explicitPermitNumbers.length > 0) {
      this.permits = explicitPermitNumbers.map((num: string) => ({
        number: num,
        amount: 1000,
        isCancelled: permitStateMap.get(num)?.isCancelled || false,
        isLocked: permitStateMap.get(num)?.isLocked || false,
        lockReason: permitStateMap.get(num)?.lockReason || '',
        isSelected: false
      }));
      return;
    }

    const totalCount =
      this.requisitionData?.requisitonNumberOfPermits ||
      this.requisitionData?.requisiton_number_of_permits ||
      0;

    this.generatePermits(totalCount, permitStateMap);
  }

  generatePermits(totalCount: any, permitStateMap: Map<string, { isCancelled: boolean; isLocked: boolean; lockReason: string }>) {
    this.permits = [];
    const count = Number(totalCount);
    console.log('Generating permits loop, count:', count);
    if (!count || isNaN(count)) return;
    for (let i = 1; i <= count; i++) {
      const numStr = i.toString();
      this.permits.push({
        number: numStr,
        amount: 1000,
        isCancelled: permitStateMap.get(numStr)?.isCancelled || false,
        isLocked: permitStateMap.get(numStr)?.isLocked || false,
        lockReason: permitStateMap.get(numStr)?.lockReason || '',
        isSelected: false
      });
    }
  }

  onPermitSelectionChange() {
    // We only care about newly selected ones for the current transaction
    // The UI checkbox binds to nothing directly? 
    // Wait, the template uses [checked]="permit.isCancelled" but that is for ALREADY cancelled.
    // I need to track the NEWLY selected checkboxes.
    // The template likely needs [(ngModel)] or (change) updating a set.
    // The provided template snippet uses (change)="onPermitSelectionChange()". 
    // I need to scan the DOM or bind inputs. 
    // Better: Update the 'permits' model with a 'isSelected' property or similar, but interface is fixed.
    // I shall check the checkboxes via querySelector or bind to a local map if I can't change template.
    // Actually, I can allow the user to select multiple.

    // NOTE: The current template logic in the prompt:
    // <input ... [checked]="permit.isCancelled" ... (change)="onPermitSelectionChange()" />
    // It binds checked to isCancelled which is for EXISTING. 
    // It doesn't seem to have a binding for NEW selection.
    // I implicitly need to handle the selection state.
    // I will iterate over the checkboxes in the DOM or add a 'selected' prop to my local Permit objects if allowed.
    // Since I am rewriting the component, I can extend the Permit interface locally.
  }

  // Helper to handle selection since template is not fully binded in the snippet provided
  togglePermit(permit: Permit, event: any) {
    if (permit.isLocked) return;
    permit.isSelected = !!event.target.checked;

    // Update newlySelectedPermits for submission logic
    if (event.target.checked) {
      if (!this.newlySelectedPermits.includes(permit.number)) {
        this.newlySelectedPermits.push(permit.number);
      }
      // Also update selectedPermits for display
      if (!this.selectedPermits.includes(permit.number)) {
        this.selectedPermits.push(permit.number);
      }
    } else {
      this.newlySelectedPermits = this.newlySelectedPermits.filter(n => n !== permit.number);
      // Remove from selectedPermits
      this.selectedPermits = this.selectedPermits.filter(n => n !== permit.number);
    }
    // Sort visually
    this.selectedPermits.sort((a, b) => Number(a) - Number(b));
  }

  getTotalBalance(): number {
    // grainEnaNumber * newlySelectedPermits.length
    if (this.requisitionData && this.requisitionData.grainEnaNumber) {
      return Number(this.requisitionData.grainEnaNumber) * this.newlySelectedPermits.length;
    }
    return 0;
  }


  loadPermitNumbers() {
    // Replaced by loadData flow
  }

  loadCancellationData() {
    // Replaced by loadData flow
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
    // Must gather selected permits. 
    // Since the template calls onPermitSelectionChange without args, I need to read the state.
    // I'll assume I update the template to pass $event or permit.
    // OR create a ViewChild.
    // For now, I will assume I can update the template too.
    const cancellationCharges = this.newlySelectedPermits.length * 1000;
    this.successMessage = `Refund of ₹${cancellationCharges.toLocaleString()} will be processed after approval by the Commissioner.`;
    this.showDeclarationModal = true;
  }

  confirmCancellation() {
    this.showDeclarationModal = false;

    if (!this.currentLicenseeId) {
      alert('Licensee Profile not loaded. Cannot submit cancellation.');
      return;
    }

    const payload = {
      reference_no: this.referenceNo,
      permit_numbers: this.newlySelectedPermits,
      licensee_id: this.currentLicenseeId,
    };

    console.log('🔧 Submitting cancellation with payload:', payload);

    this.supplyChainService.submitCancellation(payload).subscribe({
      next: (response: any) => {
        console.log('✅ Cancellation submitted successfully:', response);
        this.showSuccessModal = true;
        this.successMessage = response.message;
        // Refresh data to show updated status
        this.loadData();
        this.newlySelectedPermits = [];
      },
      error: (error) => {
        console.error('❌ Error submitting cancellation:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          message: error.message
        });
        this.errorMessage = 'Failed to submit cancellation: ' + (error.error?.error || error.error?.message || error.message);
        alert(this.errorMessage);
      },
    });
  }

  // Helper removed as we use service now
  // getLicenseeIdFromSession()...

  redirectToDashboard() {
    this.showSuccessModal = false;
    // Navigate to dashboard cancellation section and force reload
    this.router.navigate(['/dashboard'], { 
      queryParams: { section: 'cancellation' },
      queryParamsHandling: 'merge'
    }).then(() => {
      // Force page reload to ensure data is refreshed
      window.location.reload();
    });
  }

  goBack() {
    this.close.emit();
  }



  getCancellationCharges(): number {
    return this.newlySelectedPermits.length * 1000;
  }

  isPermitSelectionLocked(): boolean {
    return this.permits.length > 0 && this.permits.every((p) => p.isLocked);
  }
}
