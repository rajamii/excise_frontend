import { Component, EventEmitter, OnInit, OnDestroy, Output } from '@angular/core';
import { MaterialModule } from '../../../../../../../shared/material.module';
import { Company, CompanyDocuments } from '../../../../../../../core/models/company.model';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { CompanyRegistrationService } from '../../../../../../../core/services/company-registration.service';
import { Router } from '@angular/router';

// ── MemberEntry matches the interface in member-details.component.ts ──────────
export interface MemberEntry {
  memberName:         string;
  memberDesignation:  string;
  memberMobileNumber: string;
  memberEmailId?:     string;
  memberAddress:      string;
  fatherName?:        string;
  dob?:               string;
  gender?:            string;
  nationality?:       string;
}

@Component({
  selector: 'app-submit-application',
  imports: [MaterialModule, FormsModule],
  templateUrl: './submit-application.component.html',
  styleUrl: './submit-application.component.scss'
})
export class SubmitApplicationComponent implements OnInit, OnDestroy {

  fileUrls:       string[]  = [];
  acceptTerms:    boolean   = false;
  isSubmitting:   boolean   = false;
  applicationId:  string | null = null;

  companyDetails: { key: string; value: any }[] = [];
  membersList: MemberEntry[] = [];
  companyDocuments: { key: string; label: string; file: File; fileUrl: string }[] = [];
  summaryData: { key: string; value: any }[] = [];

  // ── Human-readable labels for company/license fields ────────────────────────
  readonly companyLabels: Partial<Record<keyof Company, string>> = {
    brandType:           'Brand Type',
    license:             'License',
    applicationYear:     'Application Year',
    companyName:         'Company Name',
    pan:                 'PAN',
    officeAddress:       'Office Address',
    country:             'Country',
    state:               'State',
    factoryAddress:      'Factory Address',
    pinCode:             'PIN Code',
    companyMobileNumber: 'Company Mobile Number',
    companyEmailId:      'Company Email Id',
  };

  // ── Human-readable labels for uploaded documents ─────────────────────────────
  readonly documentLabels: Record<string, string> = {
    exciseLicense:          'Excise License issued by the Excise Authority',
    deedOfPartnership:      'Deed of Partnership',
    memorandumOfAssociation:'Memorandum & Article of Association',
    undertaking:            'Undertaking (Sikkim Excise Act, 1992)',
  };

  @Output() back = new EventEmitter<void>();

  constructor(
    private companyRegistrationService: CompanyRegistrationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.fileUrls.forEach(url => URL.revokeObjectURL(url));
  }

  // ─────────────────────────────────────────────────────────────────
  // Data Loading
  // ─────────────────────────────────────────────────────────────────
  private loadData(): void {
    // 1. Company details
    this.companyDetails = this.parseSession<Partial<Company>>('companyDetails', this.companyLabels);

    // 2. Members list
    try {
      const raw = sessionStorage.getItem('companyMembersList');
      if (raw) {
        const list = JSON.parse(raw) as MemberEntry[];
        this.membersList = list.filter(
          m => m && typeof m.memberName === 'string' && m.memberName.trim() !== ''
        );
      } else {
        const single = sessionStorage.getItem('memberDetails');
        if (single) {
          const m = JSON.parse(single) as MemberEntry;
          this.membersList = (m && typeof m.memberName === 'string' && m.memberName.trim() !== '') ? [m] : [];
        }
      }
    } catch {
      this.membersList = [];
    }

    // 3. Documents
    const docs = this.companyRegistrationService.getCompanyDocuments();
    this.fileUrls.forEach(u => URL.revokeObjectURL(u));
    this.fileUrls = [];
    this.companyDocuments = Object.entries(docs)
      .filter(([, file]) => file instanceof File)
      .map(([key, file]) => {
        const url = URL.createObjectURL(file!);
        this.fileUrls.push(url);
        return {
          key,
          label:   this.documentLabels[key] || key,
          file:    file!,
          fileUrl: url
        };
      });

    // 4. Summary
    this.summaryData = this.generateSummaryData();
  }

  private generateSummaryData(): { key: string; value: any }[] {
    const summary: { key: string; value: any }[] = [];

    const find = (arr: { key: string; value: any }[], label: string) =>
      arr.find(i => i.key === label)?.value;

    const cd = this.companyDetails;
    if (find(cd, 'Application Year'))    summary.push({ key: 'Application Year',    value: find(cd, 'Application Year') });
    if (find(cd, 'Company Name'))        summary.push({ key: 'Company Name',        value: find(cd, 'Company Name') });
    if (find(cd, 'PAN'))                 summary.push({ key: 'PAN',                 value: find(cd, 'PAN') });
    if (find(cd, 'Brand Type'))          summary.push({ key: 'Brand Type',          value: find(cd, 'Brand Type') });

    const members = this.membersList;
    if (members.length > 0) {
      summary.push({ key: 'Total Members',  value: members.length });
      summary.push({ key: 'Primary Member', value: members[0].memberName });
    }

    summary.push({ key: 'Total Documents Uploaded', value: this.companyDocuments.length });
    summary.push({ key: 'Application Date', value: new Date().toLocaleDateString('en-GB') });

    return summary;
  }

  // ─────────────────────────────────────────────────────────────────
  // Utility
  // ─────────────────────────────────────────────────────────────────
  private parseSession<T extends Record<string, any>>(
    key: string,
    labels: Record<string, string>
  ): { key: string; value: any }[] {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return [];
      const obj: T = JSON.parse(raw);
      return Object.entries(obj)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => ({ key: labels[k] || k, value: v }));
    } catch {
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // File viewer
  // ─────────────────────────────────────────────────────────────────
  viewFile(doc: { file: File; fileUrl: string }) {
    const url = doc.fileUrl || URL.createObjectURL(doc.file);
    const w = window.open(url, '_blank');
    if (!w) Swal.fire('Warning', 'Pop-up blocked. Please allow pop-ups for this site.', 'warning');
  }

  // ─────────────────────────────────────────────────────────────────
  // Submit
  // ─────────────────────────────────────────────────────────────────
  async submit(): Promise<void> {
    if (!this.acceptTerms) {
      Swal.fire('Warning', 'Please accept the declaration to proceed.', 'warning');
      return;
    }

    const confirm = await Swal.fire({
      title: 'Confirm Submission',
      text: 'Are you sure you want to submit this application?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Submit',
      cancelButtonText: 'Review Again',
      confirmButtonColor: '#1C2B78'
    });

    if (!confirm.isConfirmed) return;

    this.isSubmitting = true;

    try {
      const companyDetails: Partial<Company> = JSON.parse(sessionStorage.getItem('companyDetails') || '{}');
      const membersList: MemberEntry[]        = JSON.parse(sessionStorage.getItem('companyMembersList') || '[]');
      const docs = this.companyRegistrationService.getCompanyDocuments();

      const formData = new FormData();

      // Append company fields
      Object.entries(companyDetails).forEach(([k, v]) => {
        if (v != null) formData.append(this.camelToSnake(k), v.toString());
      });

      // Extract and append primary member fields individually (required by backend model schema)
      const primaryMember = membersList[0];
      if (primaryMember) {
        formData.append('member_name', primaryMember.memberName);
        formData.append('member_designation', primaryMember.memberDesignation);
        formData.append('member_mobile_number', primaryMember.memberMobileNumber);
        formData.append('member_address', primaryMember.memberAddress);
        if (primaryMember.memberEmailId) {
          formData.append('member_email_id', primaryMember.memberEmailId);
        }
      }

      // Append all members as JSON array (if needed in future or for other fields)
      formData.append('members', JSON.stringify(membersList));

      // Append documents
      for (const [k, file] of Object.entries(docs)) {
        if (file instanceof File) formData.append(k, file);
      }

      this.companyRegistrationService.applyCompanyRegistration(formData).subscribe({
        next: (response) => {
          this.applicationId = response.applicationId || response.application_id;
          Swal.fire({
            icon: 'success',
            title: 'Application Submitted!',
            text: `Your Application ID: ${this.applicationId}`,
            confirmButtonText: 'OK',
            confirmButtonColor: '#1C2B78'
          });
          this.isSubmitting = false;
        },
        error: (err) => {
          const msg = err?.error?.detail || err?.error?.message || 'Failed to submit application.';
          Swal.fire('Error', msg, 'error');
          this.isSubmitting = false;
        }
      });

    } catch (err) {
      console.error('Unexpected submission error:', err);
      Swal.fire('Error', 'An unexpected error occurred.', 'error');
      this.isSubmitting = false;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────────────────────────────
  goBack() { this.back.emit(); }

  goToDashboard() {
    sessionStorage.clear();
    this.companyRegistrationService.clearCompanyDocuments();
    this.router.navigate(['/dashboard']);
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
  }
}