import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MaterialModule } from '../../../../../shared/material.module';
import { CompanyCollaborationService } from '../../../../../core/services/company-collaboration.service';
import { CompanyCollaborationBrandOwner } from '../../../../../core/models/company-collaboration.model';

@Component({
  selector: 'app-manage-brand-owner',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent implements OnInit {
  owner: any = {
    brand_owner_code: '',
    brand_owner_name: '',
    brand_owner_address: '',
    brand_owner_pincode: '',
    brand_owner_licensee_id_no: '',
    brand_owner_origin: 'I',
    brand_owner_type: 1
  };

  isEditMode = false;

  constructor(
    private companyCollabService: CompanyCollaborationService,
    public dialogRef: MatDialogRef<ManageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CompanyCollaborationBrandOwner | null
  ) {}

  ngOnInit(): void {
    if (this.data) {
      this.owner = {
        brand_owner_code: this.data.brand_owner_code || '',
        brand_owner_name: this.data.company_name || '',
        brand_owner_address: this.data.office_address || this.data.company_address || '',
        brand_owner_pincode: this.data.pan_no || '',
        brand_owner_licensee_id_no: this.data.brand_owner_licensee_id_no || '',
        brand_owner_origin: this.data.brand_owner_origin || 'I',
        brand_owner_type: this.data.owner_type ? (this.data.owner_type.includes('Imported') ? 2 : (this.data.owner_type.includes('Collaboration') ? 3 : 1)) : 1
      };
      this.isEditMode = true;
    }
  }

  onSave(): void {
    if (!this.owner.brand_owner_code || !this.owner.brand_owner_name) {
      Swal.fire('Error', 'Please fill all required fields.', 'error');
      return;
    }

    Swal.fire({
      title: this.isEditMode ? 'Update Brand Owner?' : 'Add Brand Owner?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.isEditMode ? 'Update' : 'Save',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (!result.isConfirmed) return;

      const payload = {
        brandOwnerCode: this.owner.brand_owner_code,
        brandOwnerName: this.owner.brand_owner_name,
        brandOwnerAddress: this.owner.brand_owner_address,
        brandOwnerCompanyAddress: this.owner.brand_owner_address,
        brandOwnerPincode: this.owner.brand_owner_pincode,
        brandOwnerLicenseeIdNo: this.owner.brand_owner_licensee_id_no,
        parentLicenseeIdNo: this.owner.brand_owner_licensee_id_no,
        brandOwnerOrigin: this.owner.brand_owner_origin,
        brandOwnerType: Number(this.owner.brand_owner_type),
        liquorBownerCode: this.owner.brand_owner_code
      };

      const request = this.isEditMode
        ? this.companyCollabService.updateBrandOwner(this.owner.brand_owner_code, payload)
        : this.companyCollabService.createBrandOwner(payload);

      request.subscribe({
        next: () => {
          Swal.fire('Success', this.isEditMode ? 'Brand Owner updated!' : 'Brand Owner added!', 'success');
          this.dialogRef.close(true);
        },
        error: (err) => {
          Swal.fire('Error', err?.error?.detail || 'Failed to save brand owner.', 'error');
        }
      });
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
