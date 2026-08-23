import { Component, OnInit } from '@angular/core';
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
  overview: SecretaryLicensesOverview = {
    summary_kpis: {
      dry_day_permits_count: 3,
      salesman_barman_count: 3,
      company_registrations_count: 2,
      company_collaborations_count: 2,
      total_licenses_count: 10
    },
    dry_day_permits: [
      {
        application_id: 'DDP/2026-27/0001',
        applicant_name: 'Mount Distilleries Limited',
        excise_district: 'Gangtok (East Sikkim)',
        reason_remarks: 'Exemption request for international trade exhibition & bonded warehouse maintenance',
        duration_days: '1 Day',
        dates_requested: '2026-08-15 (Independence Day)',
        financial_year: '2026-27',
        status: 'Approved',
        is_approved: true,
        is_fee_paid: true,
        created_at: '2026-08-10 10:30'
      },
      {
        application_id: 'DDP/2026-27/0002',
        applicant_name: 'Yuksom Breweries Limited',
        excise_district: 'Gyalshing (West Sikkim)',
        reason_remarks: 'Maintenance & export dispatch permission on designated state dry day',
        duration_days: '1 Day',
        dates_requested: '2026-10-02 (Gandhi Jayanti)',
        financial_year: '2026-27',
        status: 'Under Review',
        is_approved: false,
        is_fee_paid: true,
        created_at: '2026-08-14 11:45'
      },
      {
        application_id: 'DDP/2026-27/0003',
        applicant_name: 'Mayall & Fraser Pvt Ltd',
        excise_district: 'Namchi (South Sikkim)',
        reason_remarks: 'Special emergency maintenance of distillation columns during gazetted dry day',
        duration_days: '2 Days',
        dates_requested: '2026-11-01, 2026-11-02',
        financial_year: '2026-27',
        status: 'Pending Approval',
        is_approved: false,
        is_fee_paid: false,
        created_at: '2026-08-18 16:00'
      }
    ],
    salesman_barman_applications: [
      {
        application_id: 'SBM/2026-27/0001',
        applicant_name: 'Rajesh Kumar Sharma',
        role: 'Barman',
        establishment_name: 'Mayfair Spa Resort & Casino, Gangtok',
        excise_district: 'Gangtok (East Sikkim)',
        mobile_number: '9800012345',
        email: 'rajesh.sharma@mayfair.in',
        gender: 'Male',
        dob: '1990-04-12',
        aadhaar: '8834-1234-9988',
        pan: 'AJSPK8821M',
        status: 'Approved',
        is_approved: true,
        current_stage: 'Approved by Commissioner',
        created_at: '2026-08-05 11:30',
        documents: { passPhoto: true, aadhaarCard: true, residentialCertificate: true, dateofBirthProof: true }
      },
      {
        application_id: 'SBM/2026-27/0002',
        applicant_name: 'Priya Gurung',
        role: 'Salesman',
        establishment_name: 'Sinclairs Retreat & Lounge, Okhrey',
        excise_district: 'Soreng (West Sikkim)',
        mobile_number: '9733345678',
        email: 'priya.gurung@sinclairs.com',
        gender: 'Female',
        dob: '1995-09-25',
        aadhaar: '7721-9988-1122',
        pan: 'BGPGP1192L',
        status: 'Under Review',
        is_approved: false,
        current_stage: 'Superintendent Verification',
        created_at: '2026-08-12 14:15',
        documents: { passPhoto: true, aadhaarCard: true, residentialCertificate: true, dateofBirthProof: true }
      },
      {
        application_id: 'SBM/2026-27/0003',
        applicant_name: 'Bikash Rai',
        role: 'Barman',
        establishment_name: 'Hotel Lemon Tree Premium, Gangtok',
        excise_district: 'Gangtok (East Sikkim)',
        mobile_number: '9832011223',
        email: 'bikash.rai@lemontree.in',
        gender: 'Male',
        dob: '1992-11-08',
        aadhaar: '6644-3322-7788',
        pan: 'CKPRR5544N',
        status: 'Pending Approval',
        is_approved: false,
        current_stage: 'Inspector Scrutiny',
        created_at: '2026-08-16 09:45',
        documents: { passPhoto: true, aadhaarCard: true, residentialCertificate: true, dateofBirthProof: true }
      }
    ],
    company_registrations: [
      {
        application_id: 'COMP/2026-27/0001',
        company_name: 'Mount Distilleries Limited',
        brand_type: 'Manufactured in Sikkim',
        factory_address: 'Plot 12, Mining Area, Rangpo, East Sikkim PIN: 737132',
        country: 'India',
        state: 'Sikkim',
        company_phone: '9800098765',
        company_email: 'contact@mountdistilleries.com',
        key_member: 'Tashi Namgyal Sherpa',
        designation: 'Executive Director',
        member_phone: '9800098765',
        status: 'Approved',
        is_approved: true,
        payment_amount: 50000.0,
        created_at: '2026-06-24 06:10'
      },
      {
        application_id: 'COMP/2026-27/0002',
        company_name: 'Himalayan Endeavour Spirits Pvt Ltd',
        brand_type: 'Bottled in Sikkim (BIS)',
        factory_address: 'Majhitar Industrial Estate, Jorethang, South Sikkim',
        country: 'India',
        state: 'Sikkim',
        company_phone: '9733099887',
        company_email: 'info@himalayanendeavour.com',
        key_member: 'Karmapa Lepcha',
        designation: 'Managing Director',
        member_phone: '9733099887',
        status: 'Under Scrutiny',
        is_approved: false,
        payment_amount: 50000.0,
        created_at: '2026-07-15 10:20'
      }
    ],
    company_collaborations: [
      {
        application_id: 'CCOL/2026-27/0001',
        brand_owner_name: 'Himalayan Distillers & Breweries Corp',
        brand_owner_code: 'BOC/2026/001',
        brand_owner_pan: 'AAAAA1222A',
        licensee_name: 'Mount Distilleries Limited (Sikkim Unit)',
        license_number: 'COMP/2026-27/0001',
        factory_address: 'Rangpo Industrial Complex, East Sikkim',
        brands_collaborated: 'Gold Medal Gin, Ruby Gold Orange Gin',
        status: 'Approved',
        is_approved: true,
        financial_year: '2026-27',
        created_at: '2026-07-21 07:55'
      },
      {
        application_id: 'CCOL/2026-27/0002',
        brand_owner_name: 'United Spirits Bottlers Corp',
        brand_owner_code: 'BOC/2026/002',
        brand_owner_pan: 'AAAAA1234A',
        licensee_name: 'Yuksom Breweries Limited',
        license_number: 'COMP/2026-27/0002',
        factory_address: 'Gyalshing Brewery Complex, West Sikkim',
        brands_collaborated: 'Bangla Royal Country Spirit, Himalayan Malt',
        status: 'Pending Secretary Approval',
        is_approved: false,
        financial_year: '2026-27',
        created_at: '2026-07-22 14:31'
      }
    ]
  };

  activeTab: 'dry-day' | 'salesman-barman' | 'company-registration' | 'company-collaboration' = 'dry-day';
  statusFilter: 'all' | 'approved' | 'pending' = 'all';
  searchQuery: string = '';

  // Full-page detailed view overlay state
  selectedDetailItem: any = null;
  selectedDetailType: string = '';

  constructor(private secretaryService: SecretaryService) {}

  ngOnInit(): void {
    this.loadLicensesData();
  }

  loadLicensesData(): void {
    this.isLoading = true;
    this.secretaryService.getLicensesOverview().subscribe({
      next: (res) => {
        if (res && res.dry_day_permits && res.dry_day_permits.length > 0) {
          this.overview = res;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load Secretary licenses overview:', err);
        this.isLoading = false;
      }
    });
  }

  setTab(tab: 'dry-day' | 'salesman-barman' | 'company-registration' | 'company-collaboration'): void {
    this.activeTab = tab;
    this.searchQuery = '';
    this.statusFilter = 'all';
  }

  get filteredDryDayPermits(): DryDayPermitItem[] {
    let list = this.overview?.dry_day_permits || [];
    if (this.statusFilter === 'approved') {
      list = list.filter(i => i.is_approved || i.status.toLowerCase().includes('approved'));
    } else if (this.statusFilter === 'pending') {
      list = list.filter(i => !i.is_approved && !i.status.toLowerCase().includes('approved'));
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(i => 
        (i.application_id && i.application_id.toLowerCase().includes(q)) || 
        (i.applicant_name && i.applicant_name.toLowerCase().includes(q)) || 
        (i.excise_district && i.excise_district.toLowerCase().includes(q)) ||
        (i.reason_remarks && i.reason_remarks.toLowerCase().includes(q))
      );
    }
    return list;
  }

  get filteredSalesmanBarman(): SalesmanBarmanItem[] {
    let list = this.overview?.salesman_barman_applications || [];
    if (this.statusFilter === 'approved') {
      list = list.filter(i => i.is_approved || i.status.toLowerCase().includes('approved'));
    } else if (this.statusFilter === 'pending') {
      list = list.filter(i => !i.is_approved && !i.status.toLowerCase().includes('approved'));
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(i => 
        (i.application_id && i.application_id.toLowerCase().includes(q)) || 
        (i.applicant_name && i.applicant_name.toLowerCase().includes(q)) || 
        (i.establishment_name && i.establishment_name.toLowerCase().includes(q)) ||
        (i.role && i.role.toLowerCase().includes(q))
      );
    }
    return list;
  }

  get filteredCompanyRegistrations(): CompanyRegistrationItem[] {
    let list = this.overview?.company_registrations || [];
    if (this.statusFilter === 'approved') {
      list = list.filter(i => i.is_approved || i.status.toLowerCase().includes('approved'));
    } else if (this.statusFilter === 'pending') {
      list = list.filter(i => !i.is_approved && !i.status.toLowerCase().includes('approved'));
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(i => 
        (i.application_id && i.application_id.toLowerCase().includes(q)) || 
        (i.company_name && i.company_name.toLowerCase().includes(q)) || 
        (i.brand_type && i.brand_type.toLowerCase().includes(q)) ||
        (i.key_member && i.key_member.toLowerCase().includes(q))
      );
    }
    return list;
  }

  get filteredCompanyCollaborations(): CompanyCollaborationItem[] {
    let list = this.overview?.company_collaborations || [];
    if (this.statusFilter === 'approved') {
      list = list.filter(i => i.is_approved || i.status.toLowerCase().includes('approved'));
    } else if (this.statusFilter === 'pending') {
      list = list.filter(i => !i.is_approved && !i.status.toLowerCase().includes('approved'));
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(i => 
        (i.application_id && i.application_id.toLowerCase().includes(q)) || 
        (i.brand_owner_name && i.brand_owner_name.toLowerCase().includes(q)) || 
        (i.licensee_name && i.licensee_name.toLowerCase().includes(q)) ||
        (i.brands_collaborated && i.brands_collaborated.toLowerCase().includes(q))
      );
    }
    return list;
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
