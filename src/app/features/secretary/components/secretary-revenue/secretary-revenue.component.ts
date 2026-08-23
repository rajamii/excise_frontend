// Secretary Revenue Component Implementation
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  SecretaryService, 
  SecretaryRevenueOverview, 
  SecretaryTopContributorItem, 
  SecretarySecurityDepositItem,
  SecretaryRevenueHeadItem
} from '../../services/secretary.service';

@Component({
  selector: 'app-secretary-revenue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './secretary-revenue.component.html',
  styleUrls: ['./secretary-revenue.component.scss']
})
export class SecretaryRevenueComponent implements OnInit {
  isLoading = false;

  // View Mode Sub-tabs: 'overview' | 'top-contributors' | 'security-deposits'
  activeTab: 'overview' | 'top-contributors' | 'security-deposits' = 'overview';

  // Filters requested by user: Financial Year, Month, Category / Head
  selectedFinancialYear: string = '2026-2027';
  selectedMonth: string = 'all';
  selectedHeadFilter: string = 'all';
  selectedCategoryFilter: string = 'all';
  searchQuery: string = '';

  // Detail Modal State
  selectedContributor: SecretaryTopContributorItem | null = null;
  selectedSecurityDeposit: SecretarySecurityDepositItem | null = null;

  overview: SecretaryRevenueOverview = {
    summary_kpis: {
      total_revenue_collected: 75631457.0,
      net_excise_revenue_collected: 64873457.0,
      total_active_balance: 1228683461.0,
      total_security_deposit_fd: 288000.0,
      top_contributors_count: 12
    },
    revenue_heads: [
      { head_name: 'Excise/Additional Duty', total_credit: 49104952.0, total_debit: 14527267.3, current_balance: 1034577699.7, accounts_count: 10 },
      { head_name: 'Hologram Procurement', total_credit: 15350000.0, total_debit: 2075000.0, current_balance: 63335000.0, accounts_count: 10 },
      { head_name: 'Education Cess', total_credit: 10470000.0, total_debit: 80743.51, current_balance: 10489256.49, accounts_count: 10 },
      { head_name: 'License Fees', total_credit: 418505.0, total_debit: 235000.0, current_balance: 110183505.0, accounts_count: 14 },
      { head_name: 'Security Deposit (FD)', total_credit: 288000.0, total_debit: 190000.0, current_balance: 10098000.0, accounts_count: 14 }
    ],
    top_contributors: [
      { rank: 1, tier_badge: 'Tier 1 Top Contributor', user_id: 'AS01AF8001', licensee_name: 'Amrit Raj Sharma', manufacturing_unit: 'ABC Distilleries Limited', category: 'Manufacturing', sub_category: 'Distillery', total_revenue_contributed: 21306100.0, total_fd_amount: 5000000.0, current_balance: 19935390.2, wallets_count: 4 },
      { rank: 2, tier_badge: 'Tier 1 Top Contributor', user_id: 'LP01D54001', licensee_name: 'Lahang Spirits Private Limited', manufacturing_unit: 'Lahag Spirits Private Limited', category: 'Manufacturing', sub_category: 'Distillery', total_revenue_contributed: 17240000.0, total_fd_amount: 4500000.0, current_balance: 13832900.0, wallets_count: 3 },
      { rank: 3, tier_badge: 'Tier 1 Top Contributor', user_id: 'MF01E99001', licensee_name: 'Ms Mayall And Fraser Pvt Ltd', manufacturing_unit: 'Ms Mayall & Fraser Pvt Ltd', category: 'Manufacturing', sub_category: 'Distillery', total_revenue_contributed: 15000000.0, total_fd_amount: 4000000.0, current_balance: 9986342.7, wallets_count: 5 },
      { rank: 4, tier_badge: 'Tier 2 Contributor', user_id: 'SL057A1001', licensee_name: 'Sikkim Distilleries Limited', manufacturing_unit: 'Sikkim Distillery Limited', category: 'Manufacturing', sub_category: 'Distillery', total_revenue_contributed: 11430000.0, total_fd_amount: 3500000.0, current_balance: 2637100.0, wallets_count: 4 },
      { rank: 5, tier_badge: 'Tier 2 Contributor', user_id: 'JD01135001', licensee_name: 'Jane R Doe', manufacturing_unit: 'Doe Breweries Limited', category: 'Manufacturing', sub_category: 'Brewery', total_revenue_contributed: 1905000.0, total_fd_amount: 2500000.0, current_balance: 1397800.0, wallets_count: 4 },
      { rank: 6, tier_badge: 'Tier 2 Contributor', user_id: 'DD01881001', licensee_name: 'Sikkim Himalayan Bottlers Pvt Ltd', manufacturing_unit: 'Gangtok Central Spirits Depot', category: 'Distributor', sub_category: 'Distributor', total_revenue_contributed: 1650000.0, total_fd_amount: 2000000.0, current_balance: 1450000.0, wallets_count: 3 }
    ],
    security_deposits: [
      { licensee_id: 'FD-2026-001', user_id: 'AS01AF8001', licensee_name: 'Amrit Raj Sharma', manufacturing_unit: 'ABC Distilleries Limited', category: 'Manufacturing', sub_category: 'Distillery', fd_credit_amount: 5000000.0, fd_current_balance: 5000000.0, status: 'Verified & Locked FD', updated_at: '2026-07-15' },
      { licensee_id: 'FD-2026-002', user_id: 'LP01D54001', licensee_name: 'Lahang Spirits Private Limited', manufacturing_unit: 'Lahag Spirits Private Limited', category: 'Manufacturing', sub_category: 'Distillery', fd_credit_amount: 4500000.0, fd_current_balance: 4500000.0, status: 'Verified & Locked FD', updated_at: '2026-07-20' },
      { licensee_id: 'FD-2026-003', user_id: 'MF01E99001', licensee_name: 'Ms Mayall And Fraser Pvt Ltd', manufacturing_unit: 'Ms Mayall & Fraser Pvt Ltd', category: 'Manufacturing', sub_category: 'Distillery', fd_credit_amount: 4000000.0, fd_current_balance: 4000000.0, status: 'Verified & Locked FD', updated_at: '2026-08-01' },
      { licensee_id: 'FD-2026-004', user_id: 'SL057A1001', licensee_name: 'Sikkim Distilleries Limited', manufacturing_unit: 'Sikkim Distillery Limited', category: 'Manufacturing', sub_category: 'Distillery', fd_credit_amount: 3500000.0, fd_current_balance: 3500000.0, status: 'Verified & Locked FD', updated_at: '2026-08-05' },
      { licensee_id: 'FD-2026-005', user_id: 'JD01135001', licensee_name: 'Jane R Doe', manufacturing_unit: 'Doe Breweries Limited', category: 'Manufacturing', sub_category: 'Brewery', fd_credit_amount: 2500000.0, fd_current_balance: 2500000.0, status: 'Verified & Locked FD', updated_at: '2026-08-10' },
      { licensee_id: 'FD-2026-006', user_id: 'DD01881001', licensee_name: 'Sikkim Himalayan Bottlers Pvt Ltd', manufacturing_unit: 'Gangtok Central Spirits Depot', category: 'Distributor', sub_category: 'Distributor', fd_credit_amount: 2000000.0, fd_current_balance: 2000000.0, status: 'Verified & Locked FD', updated_at: '2026-08-12' }
    ]
  };

  constructor(private secretaryService: SecretaryService) {}

  ngOnInit(): void {
    this.loadRevenueData();
  }

  loadRevenueData(): void {
    this.isLoading = true;
    this.secretaryService.getRevenueOverview().subscribe({
      next: (res) => {
        if (res && res.revenue_heads && res.revenue_heads.length > 0) {
          this.overview = res;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load Secretary Revenue overview:', err);
        this.isLoading = false;
      }
    });
  }

  setTab(tab: 'overview' | 'top-contributors' | 'security-deposits'): void {
    this.activeTab = tab;
    this.searchQuery = '';
  }

  get filteredTopContributors(): SecretaryTopContributorItem[] {
    let list = this.overview?.top_contributors || [];

    if (this.selectedCategoryFilter !== 'all') {
      list = list.filter(i => (i.category || '').toLowerCase() === this.selectedCategoryFilter.toLowerCase());
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(i => 
        (i.licensee_name || i.licenseeName || '').toLowerCase().includes(q) || 
        (i.manufacturing_unit || i.manufacturingUnit || '').toLowerCase().includes(q) || 
        (i.user_id || i.userId || '').toLowerCase().includes(q) ||
        (i.sub_category || i.subCategory || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  get filteredSecurityDeposits(): SecretarySecurityDepositItem[] {
    let list = this.overview?.security_deposits || [];

    if (this.selectedCategoryFilter !== 'all') {
      list = list.filter(i => (i.category || '').toLowerCase() === this.selectedCategoryFilter.toLowerCase());
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(i => 
        (i.licensee_name || i.licenseeName || '').toLowerCase().includes(q) || 
        (i.manufacturing_unit || i.manufacturingUnit || '').toLowerCase().includes(q) || 
        (i.licensee_id || i.licenseeId || '').toLowerCase().includes(q) ||
        (i.user_id || i.userId || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  openContributorDetail(item: SecretaryTopContributorItem): void {
    this.selectedContributor = item;
  }

  closeContributorDetail(): void {
    this.selectedContributor = null;
  }

  openSecurityDepositDetail(item: SecretarySecurityDepositItem): void {
    this.selectedSecurityDeposit = item;
  }

  closeSecurityDepositDetail(): void {
    this.selectedSecurityDeposit = null;
  }

  getHeadCardClass(headName: string = ''): string {
    const name = (headName || '').toLowerCase();
    if (name.includes('excise')) return 'head-theme-emerald';
    if (name.includes('security') || name.includes('fd')) return 'head-theme-amber';
    if (name.includes('hologram')) return 'head-theme-sky';
    if (name.includes('license')) return 'head-theme-purple';
    if (name.includes('cess')) return 'head-theme-teal';
    return 'head-theme-emerald';
  }

  printReport(): void {
    window.print();
  }
}
