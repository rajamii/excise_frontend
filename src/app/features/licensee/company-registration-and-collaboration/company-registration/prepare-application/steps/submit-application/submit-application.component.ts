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

  // Caching variables to prevent change detection errors while remaining reactive to stepper step changes
  private lastCompanyDetailsRaw = '';
  private cachedCompanyDetails: { key: string; value: any }[] = [];

  private lastMembersRaw = '';
  private cachedMembersList: MemberEntry[] = [];

  private lastDocsSignature = '';
  private cachedCompanyDocuments: { key: string; label: string; file: File; fileUrl: string }[] = [];

  private lastSummarySignature = '';
  private cachedSummaryData: { key: string; value: any }[] = [];

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
    // No-op: data is loaded reactively via cached getters when Angular checks the view
  }

  ngOnDestroy(): void {
    this.fileUrls.forEach(url => URL.revokeObjectURL(url));
  }

  // ─────────────────────────────────────────────────────────────────
  // Data accessors with caching to prevent change detection loops
  // ─────────────────────────────────────────────────────────────────

  /** Company / license fields from sessionStorage */
  get companyDetails(): { key: string; value: any }[] {
    const raw = sessionStorage.getItem('companyDetails') || '';
    if (raw !== this.lastCompanyDetailsRaw) {
      this.lastCompanyDetailsRaw = raw;
      this.cachedCompanyDetails = this.parseSession<Partial<Company>>('companyDetails', this.companyLabels);
    }
    return this.cachedCompanyDetails;
  }

  /** ALL saved members — filters out any empty/corrupted entries */
  get membersList(): MemberEntry[] {
    const raw = sessionStorage.getItem('companyMembersList') || sessionStorage.getItem('memberDetails') || '';
    if (raw !== this.lastMembersRaw) {
      this.lastMembersRaw = raw;
      try {
        const rawList = sessionStorage.getItem('companyMembersList');
        if (rawList) {
          const list = JSON.parse(rawList) as MemberEntry[];
          this.cachedMembersList = list.filter(
            m => m && typeof m.memberName === 'string' && m.memberName.trim() !== ''
          );
        } else {
          const single = sessionStorage.getItem('memberDetails');
          if (single) {
            const m = JSON.parse(single) as MemberEntry;
            this.cachedMembersList = (m && typeof m.memberName === 'string' && m.memberName.trim() !== '') ? [m] : [];
          } else {
            this.cachedMembersList = [];
          }
        }
      } catch {
        this.cachedMembersList = [];
      }
    }
    return this.cachedMembersList;
  }

  /** Documents uploaded (from the service) with blob URLs.
   *  Always rebuilt fresh when files change. */
  get companyDocuments(): { key: string; label: string; file: File; fileUrl: string }[] {
    const docs = this.companyRegistrationService.getCompanyDocuments();
    const signature = Object.entries(docs)
      .map(([k, f]) => f instanceof File ? `${k}:${f.name}:${f.size}` : `${k}:null`)
      .join('|');

    if (signature !== this.lastDocsSignature) {
      this.lastDocsSignature = signature;
      
      // Revoke old URLs
      this.fileUrls.forEach(u => URL.revokeObjectURL(u));
      this.fileUrls = [];

      this.cachedCompanyDocuments = Object.entries(docs)
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
    }
    return this.cachedCompanyDocuments;
  }

  /** Quick-summary data */
  get summaryData(): { key: string; value: any }[] {
    // Force evaluation of dependencies to ensure cache is hot
    const cd = this.companyDetails;
    const members = this.membersList;
    const docs = this.companyDocuments;
    
    const signature = `${cd.length}|${members.length}|${docs.length}|${cd.map(i => `${i.key}:${i.value}`).join(',')}`;
    if (signature !== this.lastSummarySignature) {
      this.lastSummarySignature = signature;
      this.cachedSummaryData = this.generateSummaryData();
    }
    return this.cachedSummaryData;
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