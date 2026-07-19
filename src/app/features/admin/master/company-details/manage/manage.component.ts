import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { CompanyCollaborationService } from '../../../../../core/services/company-collaboration.service';

@Component({
  selector: 'app-manage-company-detail',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent implements OnInit {
  company: any = {
    brandOwnerCode: '',
    brandOwnerType: '',
    brandOwnerName: '',
    brandOwnerMobileNo: '',
    brandOwnerCompanyAddress: '',
    brandOwnerAddress: '',
    brandOwnerPincode: '',
    brandOwnerPan: '',
    brandOwnerEmail: '',
    brandOwnerOrigin: 'I',
    brandOwnerCountry: 87, // Default: India
    brandOwnerState: 28, // Default: Sikkim
    liquorBownerCode: '',
    brandOwnerLicenseeIdNo: '',
    parentLicenseeIdNo: '',
    enableStatus: 'E'
  };

  isEditMode = false;
  types: any[] = [];

  constructor(
    private companyCollabService: CompanyCollaborationService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any | null
  ) {}

  ngOnInit(): void {
    this.loadTypes();

    if (this.data) {
      this.company = { ...this.data };
      this.isEditMode = true;
    }
  }

  loadTypes(): void {
    this.companyCollabService.getBrandOwnerTypes().subscribe({
      next: (res) => {
        this.types = Array.isArray(res) ? res : [];
      },
      error: () => Swal.fire('Error', 'Failed to load brand owner types.', 'error')
    });
  }

  onSave(): void {
    if (!this.company.brandOwnerCode || !this.company.brandOwnerName || !this.company.brandOwnerType) {
      Swal.fire('Error', 'Please fill all required fields.', 'error');
      return;
    }

    Swal.fire({
      title: this.isEditMode ? 'Update Company Details?' : 'Add Company Details?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      const request = this.isEditMode
        ? this.companyCollabService.updateCompanyDetail(this.company.brandOwnerCode, this.company)
        : this.companyCollabService.createCompanyDetail(this.company);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Company details updated!' : 'Company details added!', 'success');
          this.dialogRef.close(true);
        },
        error: (err) => {
          Swal.fire('Error', err?.error?.detail || 'Failed to save company details.', 'error');
        }
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
