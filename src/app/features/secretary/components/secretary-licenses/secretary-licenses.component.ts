import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  SecretaryService, 
  SecretaryLicensesOverview, 
  DryDayPermitItem, 
  SalesmanBarmanItem, 
  CompanyRegistrationItem, 
  CompanyCollaborationItem
} from '../../services/secretary.service';

@Component({
  selector: 'app-secretary-licenses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './secretary-licenses.component.html',
  styleUrls: ['./secretary-licenses.component.scss']
})
export class SecretaryLicensesComponent implements OnInit {
  isLoading = false;

  // Raw data from API
  rawDryDayPermits: DryDayPermitItem[] = [];
  rawSalesmanBarman: SalesmanBarmanItem[] = [];
  rawCompanyRegistrations: CompanyRegistrationItem[] = [];
  rawCompanyCollaborations: CompanyCollaborationItem[] = [];

  // Filtered arrays bound directly in template (NO getters)
  filteredDryDayPermits: DryDayPermitItem[] = [];
  filteredSalesmanBarman: SalesmanBarmanItem[] = [];
  filteredCompanyRegistrations: CompanyRegistrationItem[] = [];
  filteredCompanyCollaborations: CompanyCollaborationItem[] = [];

  // KPI summary counts
  totalCount = 0;
  dryDayCount = 0;
  sbmCount = 0;
  compRegCount = 0;
  compCollabCount = 0;

  activeTab: 'dry-day' | 'salesman-barman' | 'company-registration' | 'company-collaboration' = 'dry-day';
  statusFilter: 'all' | 'approved' | 'pending' = 'all';
  searchQuery = '';

  selectedDetailItem: any = null;
  selectedDetailType = '';

  constructor(
    private secretaryService: SecretaryService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadLicensesData();
  }

  loadLicensesData(): void {
    this.isLoading = true;
    this.cdr.detectChanges();
    this.secretaryService.getLicensesOverview().subscribe({
      next: (res: any) => {
        this.ngZone.run(() => {
          console.log('Licenses API raw response:', res);
          if (res) {
            const rawDryDay = res.dry_day_permits || res.dryDayPermits || [];
            const rawSbm = res.salesman_barman_applications || res.salesmanBarmanApplications || [];
            const rawCompReg = res.company_registrations || res.companyRegistrations || [];
            const rawCompCollab = res.company_collaborations || res.companyCollaborations || [];

            this.rawDryDayPermits = Array.isArray(rawDryDay) ? rawDryDay.map((i: any) => this.normalizeDryDay(i)) : [];
            this.rawSalesmanBarman = Array.isArray(rawSbm) ? rawSbm.map((i: any) => this.normalizeSbm(i)) : [];
            this.rawCompanyRegistrations = Array.isArray(rawCompReg) ? rawCompReg.map((i: any) => this.normalizeCompReg(i)) : [];
            this.rawCompanyCollaborations = Array.isArray(rawCompCollab) ? rawCompCollab.map((i: any) => this.normalizeCompCollab(i)) : [];

            const kpis = res.summary_kpis || res.summaryKpis || {};
            this.dryDayCount = kpis.dry_day_permits_count ?? kpis.dryDayPermitsCount ?? this.rawDryDayPermits.length;
            this.sbmCount = kpis.salesman_barman_count ?? kpis.salesmanBarmanCount ?? this.rawSalesmanBarman.length;
            this.compRegCount = kpis.company_registrations_count ?? kpis.companyRegistrationsCount ?? this.rawCompanyRegistrations.length;
            this.compCollabCount = kpis.company_collaborations_count ?? kpis.companyCollaborationsCount ?? this.rawCompanyCollaborations.length;
            this.totalCount = kpis.total_licenses_count ?? kpis.totalLicensesCount ?? (this.dryDayCount + this.sbmCount + this.compRegCount + this.compCollabCount);

            console.log(`Parsed: DryDay=${this.rawDryDayPermits.length}, SBM=${this.rawSalesmanBarman.length}, CompReg=${this.rawCompanyRegistrations.length}, CompCollab=${this.rawCompanyCollaborations.length}`);
          }
          this.isLoading = false;
          this.applyFilters();
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('Failed to load licenses:', err);
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  applyFilters(): void {
    const q = (this.searchQuery || '').toLowerCase().trim();

    this.filteredDryDayPermits = this.rawDryDayPermits.filter(i => {
      if (this.statusFilter === 'approved' && !i.is_approved) return false;
      if (this.statusFilter === 'pending' && i.is_approved) return false;
      if (q) {
        return String(i.application_id).toLowerCase().includes(q) ||
               String(i.applicant_name).toLowerCase().includes(q) ||
               String(i.excise_district).toLowerCase().includes(q) ||
               String(i.reason_remarks).toLowerCase().includes(q);
      }
      return true;
    });

    this.filteredSalesmanBarman = this.rawSalesmanBarman.filter(i => {
      if (this.statusFilter === 'approved' && !i.is_approved) return false;
      if (this.statusFilter === 'pending' && i.is_approved) return false;
      if (q) {
        return String(i.application_id).toLowerCase().includes(q) ||
               String(i.applicant_name).toLowerCase().includes(q) ||
               String(i.establishment_name).toLowerCase().includes(q) ||
               String(i.role).toLowerCase().includes(q);
      }
      return true;
    });

    this.filteredCompanyRegistrations = this.rawCompanyRegistrations.filter(i => {
      if (this.statusFilter === 'approved' && !i.is_approved) return false;
      if (this.statusFilter === 'pending' && i.is_approved) return false;
      if (q) {
        return String(i.application_id).toLowerCase().includes(q) ||
               String(i.company_name).toLowerCase().includes(q) ||
               String(i.brand_type).toLowerCase().includes(q) ||
               String(i.key_member).toLowerCase().includes(q);
      }
      return true;
    });

    this.filteredCompanyCollaborations = this.rawCompanyCollaborations.filter(i => {
      if (this.statusFilter === 'approved' && !i.is_approved) return false;
      if (this.statusFilter === 'pending' && i.is_approved) return false;
      if (q) {
        return String(i.application_id).toLowerCase().includes(q) ||
               String(i.brand_owner_name).toLowerCase().includes(q) ||
               String(i.licensee_name).toLowerCase().includes(q) ||
               String(i.brands_collaborated).toLowerCase().includes(q);
      }
      return true;
    });
  }

  onFilterChange(): void {
    this.applyFilters();
    this.cdr.detectChanges();
  }

  setTab(tab: 'dry-day' | 'salesman-barman' | 'company-registration' | 'company-collaboration'): void {
    this.activeTab = tab;
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.applyFilters();
    this.cdr.detectChanges();
  }

  private normalizeDryDay(item: any): DryDayPermitItem {
    if (!item) item = {};
    return {
      application_id: String(item.application_id || item.applicationId || ''),
      applicant_name: String(item.applicant_name || item.applicantName || 'Applicant'),
      excise_district: String(item.excise_district || item.exciseDistrict || 'Sikkim'),
      reason_remarks: String(item.reason_remarks || item.reasonRemarks || ''),
      duration_days: String(item.duration_days || item.durationDays || '1 Day'),
      dates_requested: String(item.dates_requested || item.datesRequested || ''),
      financial_year: String(item.financial_year || item.financialYear || '2026-27'),
      status: String(item.status || 'Pending'),
      is_approved: item.is_approved === true || item.isApproved === true,
      is_fee_paid: item.is_fee_paid === true || item.isFeePaid === true,
      created_at: String(item.created_at || item.createdAt || '')
    };
  }

  private normalizeSbm(item: any): SalesmanBarmanItem {
    if (!item) item = {};
    return {
      application_id: String(item.application_id || item.applicationId || ''),
      applicant_name: String(item.applicant_name || item.applicantName || 'Applicant'),
      role: String(item.role || 'Salesman'),
      establishment_name: String(item.establishment_name || item.establishmentName || ''),
      excise_district: String(item.excise_district || item.exciseDistrict || ''),
      mobile_number: String(item.mobile_number || item.mobileNumber || ''),
      email: String(item.email || item.emailId || ''),
      gender: String(item.gender || ''),
      dob: String(item.dob || ''),
      aadhaar: String(item.aadhaar || ''),
      pan: String(item.pan || ''),
      status: String(item.status || 'Pending'),
      is_approved: item.is_approved === true || item.isApproved === true,
      current_stage: String(item.current_stage || item.currentStage || ''),
      created_at: String(item.created_at || item.createdAt || ''),
      documents: item.documents || {}
    };
  }

  private normalizeCompReg(item: any): CompanyRegistrationItem {
    if (!item) item = {};
    return {
      application_id: String(item.application_id || item.applicationId || ''),
      company_name: String(item.company_name || item.companyName || ''),
      brand_type: String(item.brand_type || item.brandType || ''),
      factory_address: String(item.factory_address || item.factoryAddress || ''),
      country: String(item.country || 'India'),
      state: String(item.state || 'Sikkim'),
      company_phone: String(item.company_phone || item.companyPhone || ''),
      company_email: String(item.company_email || item.companyEmail || ''),
      key_member: String(item.key_member || item.keyMember || ''),
      designation: String(item.designation || ''),
      member_phone: String(item.member_phone || item.memberPhone || ''),
      status: String(item.status || 'Pending'),
      is_approved: item.is_approved === true || item.isApproved === true,
      payment_amount: Number(item.payment_amount ?? item.paymentAmount ?? 0),
      created_at: String(item.created_at || item.createdAt || '')
    };
  }

  private normalizeCompCollab(item: any): CompanyCollaborationItem {
    if (!item) item = {};
    return {
      application_id: String(item.application_id || item.applicationId || ''),
      brand_owner_name: String(item.brand_owner_name || item.brandOwnerName || ''),
      brand_owner_code: String(item.brand_owner_code || item.brandOwnerCode || ''),
      brand_owner_pan: String(item.brand_owner_pan || item.brandOwnerPan || ''),
      licensee_name: String(item.licensee_name || item.licenseeName || ''),
      license_number: String(item.license_number || item.licenseNumber || ''),
      factory_address: String(item.factory_address || item.factoryAddress || ''),
      brands_collaborated: String(item.brands_collaborated || item.brandsCollaborated || ''),
      status: String(item.status || 'Pending'),
      is_approved: item.is_approved === true || item.isApproved === true,
      financial_year: String(item.financial_year || item.financialYear || ''),
      created_at: String(item.created_at || item.createdAt || '')
    };
  }

  openDetailView(item: any, type: string): void {
    this.selectedDetailItem = item;
    this.selectedDetailType = type;
  }

  closeDetailView(): void {
    this.selectedDetailItem = null;
    this.selectedDetailType = '';
  }

  printDetailView(): void {
    window.print();
  }
}
