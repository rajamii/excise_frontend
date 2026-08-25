import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { Location, CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { 
  SecretaryService, 
  SecretaryLicensesOverview, 
  DryDayPermitItem, 
  SalesmanBarmanItem, 
  CompanyRegistrationItem, 
  CompanyCollaborationItem,
  NewLicenseApplicationItem,
  LicenseRenewalAppItem
} from '../../services/secretary.service';
import { SidebarPendingBadgeService } from '../../../../shared/services/sidebar-pending-badge.service';

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
  rawNewLicenseApps: NewLicenseApplicationItem[] = [];
  rawLicenseRenewals: LicenseRenewalAppItem[] = [];
  rawDryDayPermits: DryDayPermitItem[] = [];
  rawSalesmanBarman: SalesmanBarmanItem[] = [];
  rawCompanyRegistrations: CompanyRegistrationItem[] = [];
  rawCompanyCollaborations: CompanyCollaborationItem[] = [];

  // Filtered arrays bound directly in template
  filteredNewLicenseApps: NewLicenseApplicationItem[] = [];
  filteredLicenseRenewals: LicenseRenewalAppItem[] = [];
  filteredDryDayPermits: DryDayPermitItem[] = [];
  filteredSalesmanBarman: SalesmanBarmanItem[] = [];
  filteredCompanyRegistrations: CompanyRegistrationItem[] = [];
  filteredCompanyCollaborations: CompanyCollaborationItem[] = [];

  // KPI summary counts
  totalCount = 0;
  newLicenseCount = 0;
  renewalCount = 0;
  dryDayCount = 0;
  sbmCount = 0;
  compRegCount = 0;
  compCollabCount = 0;

  activeTab: 'new-license' | 'license-renewal' | 'dry-day' | 'salesman-barman' | 'company-registration' | 'company-collaboration' = 'new-license';
  statusFilter: 'all' | 'approved' | 'pending' = 'all';
  searchQuery = '';

  selectedDetailItem: any = null;
  selectedDetailType = '';

  // Pagination State
  pageSize = 5;
  currentPageMap: { [key: string]: number } = {
    'new-license': 1,
    'license-renewal': 1,
    'dry-day': 1,
    'salesman-barman': 1,
    'company-registration': 1,
    'company-collaboration': 1
  };

  onPageSizeChange(): void {
    Object.keys(this.currentPageMap).forEach(key => {
      this.currentPageMap[key] = 1;
    });
    this.cdr.detectChanges();
  }

  getCurrentPage(tabKey: string): number {
    return this.currentPageMap[tabKey] || 1;
  }

  setPage(tabKey: string, page: number): void {
    const maxPages = this.getTotalPagesForTab(tabKey);
    if (page >= 1 && page <= maxPages) {
      this.currentPageMap[tabKey] = page;
      this.cdr.detectChanges();
    }
  }

  getPaginatedList<T>(list: T[], tabKey: string): T[] {
    const page = this.getCurrentPage(tabKey);
    const start = (page - 1) * this.pageSize;
    return (list || []).slice(start, start + this.pageSize);
  }

  getListForTab(tabKey: string): any[] {
    switch (tabKey) {
      case 'new-license': return this.filteredNewLicenseApps;
      case 'license-renewal': return this.filteredLicenseRenewals;
      case 'dry-day': return this.filteredDryDayPermits;
      case 'salesman-barman': return this.filteredSalesmanBarman;
      case 'company-registration': return this.filteredCompanyRegistrations;
      case 'company-collaboration': return this.filteredCompanyCollaborations;
      default: return [];
    }
  }

  getTotalPagesForTab(tabKey: string): number {
    const len = this.getListForTab(tabKey).length;
    return Math.ceil(len / this.pageSize) || 1;
  }

  getPageNumbersForTab(tabKey: string): number[] {
    const pages = this.getTotalPagesForTab(tabKey);
    return Array.from({ length: pages }, (_, i) => i + 1);
  }

  getStartIndex(tabKey: string): number {
    const len = this.getListForTab(tabKey).length;
    if (len === 0) return 0;
    const page = this.getCurrentPage(tabKey);
    return (page - 1) * this.pageSize + 1;
  }

  getEndIndex(tabKey: string): number {
    const len = this.getListForTab(tabKey).length;
    const page = this.getCurrentPage(tabKey);
    return Math.min(page * this.pageSize, len);
  }

  constructor(
    private secretaryService: SecretaryService,
    private sidebarPendingBadgeService: SidebarPendingBadgeService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private location: Location,
    private router: Router
  ) {}

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  ngOnInit(): void {
    this.loadLicensesData();
    this.sidebarPendingBadgeService.refreshNeeded$.subscribe(() => {
      console.log('🔄 SecretaryLicensesComponent: Reloading licenses overview due to refresh notification');
      this.loadLicensesData();
    });
  }

  loadLicensesData(): void {
    this.isLoading = true;
    this.cdr.detectChanges();
    this.secretaryService.getLicensesOverview().subscribe({
      next: (res: any) => {
        this.ngZone.run(() => {
          console.log('Licenses API raw response:', res);
          if (res) {
            const rawNla = res.new_license_applications || res.newLicenseApplications || [];
            const rawRen = res.license_renewals || res.licenseRenewals || [];
            const rawDryDay = res.dry_day_permits || res.dryDayPermits || [];
            const rawSbm = res.salesman_barman_applications || res.salesmanBarmanApplications || [];
            const rawCompReg = res.company_registrations || res.companyRegistrations || [];
            const rawCompCollab = res.company_collaborations || res.companyCollaborations || [];

            this.rawNewLicenseApps = Array.isArray(rawNla) ? rawNla.map((i: any) => this.normalizeNewLicenseApp(i)) : [];
            this.rawLicenseRenewals = Array.isArray(rawRen) ? rawRen.map((i: any) => this.normalizeLicenseRenewal(i)) : [];
            this.rawDryDayPermits = Array.isArray(rawDryDay) ? rawDryDay.map((i: any) => this.normalizeDryDay(i)) : [];
            this.rawSalesmanBarman = Array.isArray(rawSbm) ? rawSbm.map((i: any) => this.normalizeSbm(i)) : [];
            this.rawCompanyRegistrations = Array.isArray(rawCompReg) ? rawCompReg.map((i: any) => this.normalizeCompReg(i)) : [];
            this.rawCompanyCollaborations = Array.isArray(rawCompCollab) ? rawCompCollab.map((i: any) => this.normalizeCompCollab(i)) : [];

            const kpis = res.summary_kpis || res.summaryKpis || {};
            this.newLicenseCount = kpis.new_license_apps_count ?? kpis.newLicenseAppsCount ?? this.rawNewLicenseApps.length;
            this.renewalCount = kpis.license_renewals_count ?? kpis.licenseRenewalsCount ?? this.rawLicenseRenewals.length;
            this.dryDayCount = kpis.dry_day_permits_count ?? kpis.dryDayPermitsCount ?? this.rawDryDayPermits.length;
            this.sbmCount = kpis.salesman_barman_count ?? kpis.salesmanBarmanCount ?? this.rawSalesmanBarman.length;
            this.compRegCount = kpis.company_registrations_count ?? kpis.companyRegistrationsCount ?? this.rawCompanyRegistrations.length;
            this.compCollabCount = kpis.company_collaborations_count ?? kpis.companyCollaborationsCount ?? this.rawCompanyCollaborations.length;
            this.totalCount = kpis.total_licenses_count ?? kpis.totalLicensesCount ?? (this.newLicenseCount + this.renewalCount + this.dryDayCount + this.sbmCount + this.compRegCount + this.compCollabCount);
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

    this.filteredNewLicenseApps = this.rawNewLicenseApps.filter(i => {
      if (this.statusFilter === 'approved' && !i.is_approved) return false;
      if (this.statusFilter === 'pending' && i.is_approved) return false;
      if (q) {
        return String(i.application_id).toLowerCase().includes(q) ||
               String(i.license_no).toLowerCase().includes(q) ||
               String(i.applicant_name).toLowerCase().includes(q) ||
               String(i.establishment_name).toLowerCase().includes(q) ||
               String(i.category).toLowerCase().includes(q) ||
               String(i.sub_category).toLowerCase().includes(q);
      }
      return true;
    });

    this.filteredLicenseRenewals = this.rawLicenseRenewals.filter(i => {
      if (this.statusFilter === 'approved' && !i.is_approved) return false;
      if (this.statusFilter === 'pending' && i.is_approved) return false;
      if (q) {
        return String(i.application_id).toLowerCase().includes(q) ||
               String(i.old_license_no).toLowerCase().includes(q) ||
               String(i.new_license_no).toLowerCase().includes(q) ||
               String(i.applicant_name).toLowerCase().includes(q) ||
               String(i.establishment_name).toLowerCase().includes(q);
      }
      return true;
    });

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
    this.currentPageMap[this.activeTab] = 1;
    this.applyFilters();
    this.cdr.detectChanges();
  }

  getExpiryCountdown(expiryDateStr?: string | null): { dateDisplay: string; daysLeftText: string; isPending: boolean } {
    if (!expiryDateStr || expiryDateStr.includes('Pending') || expiryDateStr.includes('Awaiting') || expiryDateStr.includes('N/A')) {
      return { dateDisplay: 'Awaiting Grant', daysLeftText: 'Pending Grant', isPending: true };
    }

    try {
      const parts = expiryDateStr.trim().split('-');
      if (parts.length === 3) {
        const monthNames: { [key: string]: number } = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        const day = parseInt(parts[0], 10);
        const month = monthNames[parts[1]] ?? 2;
        const year = parseInt(parts[2], 10);

        const expiryDt = new Date(year, month, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffTime = expiryDt.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
          return { dateDisplay: expiryDateStr, daysLeftText: `${diffDays} Days Left`, isPending: false };
        } else if (diffDays === 0) {
          return { dateDisplay: expiryDateStr, daysLeftText: 'Expires Today', isPending: false };
        } else {
          return { dateDisplay: expiryDateStr, daysLeftText: 'Expired', isPending: false };
        }
      }
    } catch (e) {
      console.error('Error computing expiry countdown:', e);
    }

    return { dateDisplay: expiryDateStr, daysLeftText: 'Valid', isPending: false };
  }

  setTab(tab: 'new-license' | 'license-renewal' | 'dry-day' | 'salesman-barman' | 'company-registration' | 'company-collaboration'): void {
    this.activeTab = tab;
    this.currentPageMap[tab] = 1;
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.applyFilters();
    this.cdr.detectChanges();
  }

  private normalizeNewLicenseApp(item: any): NewLicenseApplicationItem {
    if (!item) item = {};
    return {
      application_id: String(item.application_id || item.applicationId || ''),
      license_no: String(item.license_no || item.licenseNo || (item.is_approved ? 'NA/2026-27/001' : 'Awaiting Grant')),
      applicant_name: String(item.applicant_name || item.applicantName || 'Authorized Licensee'),
      establishment_name: String(item.establishment_name || item.establishmentName || item.company_name || 'Unit'),
      company_name: String(item.company_name || item.companyName || ''),
      category: String(item.category || 'Retailer'),
      sub_category: String(item.sub_category || item.subCategory || 'Foreign Liquor Retail Shop'),
      excise_district: String(item.excise_district || item.exciseDistrict || 'Gangtok'),
      mobile_number: String(item.mobile_number || item.mobileNumber || ''),
      email: String(item.email || ''),
      financial_year: String(item.financial_year || item.financialYear || '2026-27'),
      is_approved: item.is_approved === true || item.isApproved === true,
      is_fee_paid: item.is_fee_paid === true || item.isFeePaid === true,
      fee_amount: Number(item.fee_amount ?? item.feeAmount ?? 15000),
      expiry_date: String(item.expiry_date || item.expiryDate || '31-Mar-2027'),
      status: String(item.status || 'Under Review'),
      current_stage: String(item.current_stage || item.currentStage || 'Scrutiny'),
      created_at: String(item.created_at || item.createdAt || '')
    };
  }

  private normalizeLicenseRenewal(item: any): LicenseRenewalAppItem {
    if (!item) item = {};
    return {
      application_id: String(item.application_id || item.applicationId || ''),
      old_license_no: String(item.old_license_no || item.oldLicenseNo || 'NA/2025-26/001'),
      new_license_no: String(item.new_license_no || item.newLicenseNo || 'NA/2026-27/001'),
      license_no: String(item.license_no || item.licenseNo || item.new_license_no || item.old_license_no || ''),
      applicant_name: String(item.applicant_name || item.applicantName || 'Licensee'),
      establishment_name: String(item.establishment_name || item.establishmentName || ''),
      category: String(item.category || 'Retailer'),
      sub_category: String(item.sub_category || item.subCategory || ''),
      excise_district: String(item.excise_district || item.exciseDistrict || 'Gangtok'),
      mobile_number: String(item.mobile_number || item.mobileNumber || ''),
      email: String(item.email || ''),
      financial_year: String(item.financial_year || item.financialYear || '2026-27'),
      is_approved: item.is_approved === true || item.isApproved === true,
      is_fee_paid: item.is_fee_paid === true || item.isFeePaid === true,
      fee_amount: Number(item.fee_amount ?? item.feeAmount ?? 20000),
      expiry_date: String(item.expiry_date || item.expiryDate || '31-Mar-2027'),
      status: String(item.status || 'Renewal Under Review'),
      current_stage: String(item.current_stage || item.currentStage || 'Review'),
      created_at: String(item.created_at || item.createdAt || '')
    };
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
