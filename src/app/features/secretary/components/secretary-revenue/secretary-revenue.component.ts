import { Component, OnInit } from '@angular/core';
import { Location, CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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

  // Targeted Amount for Financial Year (CM Target)
  targetRevenueAmount: number = 20000000; // Default ₹2,00,00,000 (2 Crores)

  setTargetPreset(amount: number): void {
    this.targetRevenueAmount = amount;
  }

  // Checked Target Scope State for each Revenue Head
  selectedTargetHeads: { [headName: string]: boolean } = {};

  toggleHeadTarget(headName: string): void {
    const key = (headName || '').trim();
    this.selectedTargetHeads[key] = !this.isHeadTargetActive(key);
  }

  isHeadTargetActive(headName: string): boolean {
    const key = (headName || '').trim();
    if (this.selectedTargetHeads[key] === undefined) {
      const lower = key.toLowerCase();
      // Active ON for all heads EXCEPT Education Cess and Security Deposit (FD)
      if (lower.includes('cess') || lower.includes('security') || lower.includes('fd')) {
        return false;
      }
      return true;
    }
    return this.selectedTargetHeads[key];
  }

  get activeTargetHeadsCount(): number {
    return this.filteredRevenueHeads.filter(h => this.isHeadTargetActive(h.head_name || h.headName || '')).length;
  }

  get activeTargetHeadsNames(): string {
    const active = this.filteredRevenueHeads
      .filter(h => this.isHeadTargetActive(h.head_name || h.headName || ''))
      .map(h => h.head_name || h.headName || '');
    if (active.length === 0) return 'No Heads Selected';
    if (active.length === this.filteredRevenueHeads.length) return 'All Revenue Heads Scope';
    return active.join(', ');
  }

  selectAllTargetHeads(active: boolean): void {
    this.filteredRevenueHeads.forEach(h => {
      const key = (h.head_name || h.headName || '').trim();
      this.selectedTargetHeads[key] = active;
    });
  }

  get totalAchievedRevenue(): number {
    const heads = this.filteredRevenueHeads;
    if (!heads || heads.length === 0) return 0;

    return heads
      .filter(h => this.isHeadTargetActive(h.head_name || h.headName || ''))
      .reduce((sum, h) => sum + (h.total_paid_to_excise !== undefined ? h.total_paid_to_excise : (h.total_debit || h.totalDebit || 0)), 0);
  }

  get currentHeadTargetShare(): number {
    const activeCount = this.activeTargetHeadsCount;
    if (activeCount <= 0 || !this.targetRevenueAmount || this.targetRevenueAmount <= 0) return 0;
    return this.targetRevenueAmount / activeCount;
  }

  get targetProgressPercent(): number {
    if (!this.targetRevenueAmount || this.targetRevenueAmount <= 0) return 0;
    const pct = (this.totalAchievedRevenue / this.targetRevenueAmount) * 100;
    return Math.min(100, Math.round(pct * 100) / 100);
  }

  get remainingTargetNeeded(): number {
    if (!this.targetRevenueAmount) return 0;
    return Math.max(0, this.targetRevenueAmount - this.totalAchievedRevenue);
  }

  get isOverallTargetExceeded(): boolean {
    return this.totalAchievedRevenue >= (this.targetRevenueAmount || 0);
  }

  get overallSurplusAmount(): number {
    return Math.max(0, this.totalAchievedRevenue - (this.targetRevenueAmount || 0));
  }

  getHeadProgressPercent(headPaid: number = 0, headName: string = ''): number {
    if (headName && !this.isHeadTargetActive(headName)) return 0;
    const headTarget = this.currentHeadTargetShare;
    if (headTarget <= 0) return 0;
    const pct = (headPaid / headTarget) * 100;
    return Math.min(100, Math.round(pct * 100) / 100);
  }

  getHeadTargetDifference(headPaid: number = 0): number {
    const headTarget = this.currentHeadTargetShare;
    return headPaid - headTarget; // positive if surplus, negative if shortfall
  }

  isHeadTargetExceeded(headPaid: number = 0): boolean {
    return this.getHeadTargetDifference(headPaid) >= 0;
  }

  getHeadRemainingNeeded(headPaid: number = 0): number {
    const diff = this.getHeadTargetDifference(headPaid);
    return diff < 0 ? Math.abs(diff) : 0;
  }

  getHeadSurplusAmount(headPaid: number = 0): number {
    const diff = this.getHeadTargetDifference(headPaid);
    return diff > 0 ? diff : 0;
  }

  // Filters: Financial Year, Month, Category, Search
  selectedFinancialYear: string = '2026-2027';
  selectedMonth: string = 'all';
  selectedCategoryFilter: string = 'all';
  searchQuery: string = '';

  // Detail Modal State
  selectedContributor: SecretaryTopContributorItem | null = null;
  selectedSecurityDeposit: SecretarySecurityDepositItem | null = null;

  // Pagination State
  pageSize = 5;
  currentPageMap: { [key: string]: number } = {
    'overview': 1,
    'top-contributors': 1,
    'security-deposits': 1
  };

  onPageSizeChange(): void {
    Object.keys(this.currentPageMap).forEach(key => {
      this.currentPageMap[key] = 1;
    });
  }

  getCurrentPage(tabKey: string): number {
    return this.currentPageMap[tabKey] || 1;
  }

  setPage(tabKey: string, page: number): void {
    const maxPages = this.getTotalPagesForTab(tabKey);
    if (page >= 1 && page <= maxPages) {
      this.currentPageMap[tabKey] = page;
    }
  }

  getPaginatedList<T>(list: T[], tabKey: string): T[] {
    const page = this.getCurrentPage(tabKey);
    const start = (page - 1) * this.pageSize;
    return (list || []).slice(start, start + this.pageSize);
  }

  getListForTab(tabKey: string): any[] {
    if (tabKey === 'overview') return this.filteredRevenueHeads;
    if (tabKey === 'top-contributors') return this.filteredTopContributors;
    if (tabKey === 'security-deposits') return this.filteredSecurityDeposits;
    return [];
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

  overview: SecretaryRevenueOverview = {
    summary_kpis: {
      total_revenue_collected: 444424.46,
      net_excise_revenue_collected: 414424.46,
      total_active_balance: 1228683461.0,
      total_security_deposit_fd: 30000.0,
      top_contributors_count: 15
    },
    revenue_heads: [
      { head_name: 'Excise Duty Wallet', head_of_account: '0039-00-105-45-01', total_credit: 38450000.0, total_debit: 213824.48, current_balance: 814577699.7, total_paid_to_excise: 213824.48, accounts_count: 10 },
      { head_name: 'Additional Excise Duty Wallet', head_of_account: '0039-00-102-45-01', total_credit: 10654952.0, total_debit: 53456.12, current_balance: 220000000.0, total_paid_to_excise: 53456.12, accounts_count: 10 },
      { head_name: 'Hologram Procurement', head_of_account: '0039-00-800-45-01', total_credit: 15350000.0, total_debit: 105000.0, current_balance: 63335000.0, total_paid_to_excise: 105000.0, accounts_count: 10 },
      { head_name: 'Education Cess', head_of_account: '0045-00-112-45-03', total_credit: 10470000.0, total_debit: 143.86, current_balance: 10489256.49, total_paid_to_excise: 143.86, accounts_count: 10 },
      { head_name: 'License Fees', head_of_account: '0039-00-800-45-02', total_credit: 418505.0, total_debit: 42000.0, current_balance: 110183505.0, total_paid_to_excise: 42000.0, accounts_count: 14 },
      { head_name: 'Security Deposit (FD)', head_of_account: '8443-00-103-45-01', total_credit: 288000.0, total_debit: 30000.0, current_balance: 10098000.0, total_paid_to_excise: 30000.0, accounts_count: 14 }
    ],
    top_contributors: [
      { rank: 1, tier_badge: 'Tier 1 Top Contributor', user_id: 'AS01AF8001', licensee_name: 'sam', manufacturing_unit: 'ABC Distilleries Limited', category: 'Manufacturing', sub_category: 'Distillery', total_revenue_contributed: 21306100.0, total_fd_amount: 30000.0, current_balance: 19935390.2, wallets_count: 4, updated_at: '2026-07-15', month: '07', financial_year: '2026-2027' },
      { rank: 2, tier_badge: 'Tier 1 Top Contributor', user_id: 'LP01D54001', licensee_name: 'Lahang Spirits Private Limited', manufacturing_unit: 'Lahag Spirits Private Limited', category: 'Manufacturing', sub_category: 'Distillery', total_revenue_contributed: 17240000.0, total_fd_amount: 25000.0, current_balance: 13832900.0, wallets_count: 3, updated_at: '2026-07-20', month: '07', financial_year: '2026-2027' },
      { rank: 3, tier_badge: 'Tier 1 Top Contributor', user_id: 'MF01E99001', licensee_name: 'Ms Mayall And Fraser Pvt Ltd', manufacturing_unit: 'Ms Mayall & Fraser Pvt Ltd', category: 'Manufacturing', sub_category: 'Distillery', total_revenue_contributed: 15000000.0, total_fd_amount: 25000.0, current_balance: 9986342.7, wallets_count: 5, updated_at: '2026-08-01', month: '08', financial_year: '2026-2027' },
      { rank: 4, tier_badge: 'Tier 2 Contributor', user_id: 'SL057A1001', licensee_name: 'Sikkim Distilleries Limited', manufacturing_unit: 'Sikkim Distillery Limited', category: 'Manufacturing', sub_category: 'Distillery', total_revenue_contributed: 11430001.0, total_fd_amount: 30000.0, current_balance: 2637100.0, wallets_count: 4, updated_at: '2026-08-05', month: '08', financial_year: '2026-2027' },
      { rank: 5, tier_badge: 'Tier 2 Contributor', user_id: 'JD01135001', licensee_name: 'Jane R Doe', manufacturing_unit: 'Doe Breweries Limited', category: 'Manufacturing', sub_category: 'Brewery', total_revenue_contributed: 1905000.0, total_fd_amount: 30000.0, current_balance: 1397800.0, wallets_count: 4, updated_at: '2026-08-10', month: '08', financial_year: '2026-2027' },
      { rank: 6, tier_badge: 'Tier 2 Contributor', user_id: 'DD01881001', licensee_name: 'Sikkim Himalayan Bottlers Pvt Ltd', manufacturing_unit: 'Gangtok Central Spirits Depot', category: 'Distributor', sub_category: 'Distributor', total_revenue_contributed: 1650000.0, total_fd_amount: 25000.0, current_balance: 1450000.0, wallets_count: 3, updated_at: '2026-08-12', month: '08', financial_year: '2026-2027' }
    ],
    security_deposits: [
      { licensee_id: 'NA/1102/2026-27/0001', user_id: 'MS02BAD001', licensee_name: 'Diwakar Sharma', manufacturing_unit: 'DEF Retails', category: 'Retail', sub_category: 'Retailer', fd_credit_amount: 7000.0, fd_current_balance: 2000.0, status: 'Verified & Locked FD', updated_at: '2026-07-15', month: '07', financial_year: '2026-2027' },
      { licensee_id: 'FD-2026-002', user_id: 'SL057A1001', licensee_name: 'Sikkim Distilleries Limited', manufacturing_unit: 'Sikkim Distillery Limited', category: 'Manufacturing', sub_category: 'Distillery', fd_credit_amount: 30000.0, fd_current_balance: 10000.0, status: 'Verified & Locked FD', updated_at: '2026-08-05', month: '08', financial_year: '2026-2027' },
      { licensee_id: 'FD-2026-003', user_id: 'JD01135001', licensee_name: 'Jane R Doe', manufacturing_unit: 'Doe Breweries Limited', category: 'Manufacturing', sub_category: 'Brewery', fd_credit_amount: 30000.0, fd_current_balance: 5000.0, status: 'Verified & Locked FD', updated_at: '2026-08-10', month: '08', financial_year: '2026-2027' },
      { licensee_id: 'FD-2026-004', user_id: 'MF01E99001', licensee_name: 'Ms Mayall And Fraser Pvt Ltd', manufacturing_unit: 'Ms Mayall & Fraser Pvt Ltd', category: 'Manufacturing', sub_category: 'Distillery', fd_credit_amount: 25000.0, fd_current_balance: 5000.0, status: 'Verified & Locked FD', updated_at: '2026-08-01', month: '08', financial_year: '2026-2027' },
      { licensee_id: 'FD-2026-005', user_id: 'YL018FD001', licensee_name: 'Yuksom Breweries Limited', manufacturing_unit: 'Yuksom Breweries Limited', category: 'Manufacturing', sub_category: 'Brewery', fd_credit_amount: 25000.0, fd_current_balance: 0.0, status: 'Verified & Locked FD', updated_at: '2026-08-12', month: '08', financial_year: '2026-2027' },
      { licensee_id: 'FD-2026-006', user_id: 'SE01E22001', licensee_name: 'sam test excise', manufacturing_unit: 'brew test', category: 'Manufacturing', sub_category: 'Brewery', fd_credit_amount: 26000.0, fd_current_balance: 26000.0, status: 'Verified & Locked FD', updated_at: '2026-08-14', month: '08', financial_year: '2026-2027' }
    ]
  };

  constructor(
    private secretaryService: SecretaryService,
    private location: Location,
    private router: Router
  ) {}

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  ngOnInit(): void {
    this.loadRevenueData();
  }

  loadRevenueData(): void {
    this.isLoading = true;
    this.secretaryService.getRevenueOverview().subscribe({
      next: (res) => {
        if (res && res.revenue_heads && res.revenue_heads.length > 0) {
          const processedHeads: any[] = [];
          res.revenue_heads.forEach((h: any) => {
            if (h.head_name === 'Excise/Additional Duty') {
              processedHeads.push({
                head_name: 'Excise Duty Wallet',
                total_credit: (h.total_credit || 0) * 0.78,
                total_debit: (h.total_debit || 0) * 0.77,
                current_balance: (h.current_balance || 0) * 0.78,
                total_paid_to_excise: (h.total_debit || 0) * 0.77,
                accounts_count: h.accounts_count || 10
              });
              processedHeads.push({
                head_name: 'Additional Excise Duty Wallet',
                total_credit: (h.total_credit || 0) * 0.22,
                total_debit: (h.total_debit || 0) * 0.23,
                current_balance: (h.current_balance || 0) * 0.22,
                accounts_count: h.accounts_count || 10
              });
            } else {
              processedHeads.push(h);
            }
          });

          if (!processedHeads.some((item: any) => item.head_name === 'Additional Excise Duty Wallet')) {
            const exciseHead = processedHeads.find((item: any) => item.head_name === 'Excise Duty Wallet');
            if (exciseHead) {
              const c = exciseHead.total_credit || 0;
              const d = exciseHead.total_debit || 0;
              const b = exciseHead.current_balance || 0;
              exciseHead.total_credit = c * 0.78;
              exciseHead.total_debit = d * 0.77;
              exciseHead.current_balance = b * 0.78;

              processedHeads.splice(1, 0, {
                head_name: 'Additional Excise Duty Wallet',
                total_credit: c * 0.22,
                total_debit: d * 0.23,
                current_balance: b * 0.22,
                accounts_count: exciseHead.accounts_count || 10
              });
            }
          }

          this.overview = {
            ...res,
            revenue_heads: processedHeads
          };
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
    this.currentPageMap[tab] = 1;
  }

  clearFilters(): void {
    this.selectedFinancialYear = '2026-2027';
    this.selectedMonth = 'all';
    this.selectedCategoryFilter = 'all';
    this.searchQuery = '';
  }

  get isFilterActive(): boolean {
    return (
      (this.selectedFinancialYear !== '2026-2027' && this.selectedFinancialYear !== '') ||
      this.selectedMonth !== 'all' ||
      this.selectedCategoryFilter !== 'all' ||
      !!this.searchQuery.trim()
    );
  }

  /**
   * Filtered Revenue Heads for Overview Tab
   */
  get filteredRevenueHeads(): SecretaryRevenueHeadItem[] {
    let list = this.overview?.revenue_heads || [];

    if (this.isFilterActive && this.filteredTopContributors.length === 0 && this.filteredSecurityDeposits.length === 0) {
      return list.map(h => ({
        ...h,
        total_credit: 0,
        totalCredit: 0,
        total_debit: 0,
        totalDebit: 0,
        current_balance: 0,
        currentBalance: 0,
        total_paid_to_excise: 0,
        accounts_count: 0,
        accountsCount: 0
      }));
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(h => (h.head_name || h.headName || '').toLowerCase().includes(q));
    }
    return list;
  }

  /**
   * Filtered Top Revenue Contributors (filtered by FY, Month, Category, Search)
   */
  get filteredTopContributors(): SecretaryTopContributorItem[] {
    let list = this.overview?.top_contributors || [];

    if (this.selectedFinancialYear && this.selectedFinancialYear !== '2026-2027') {
      list = list.filter(i => (i.financial_year || '2026-2027') === this.selectedFinancialYear);
    }

    if (this.selectedMonth && this.selectedMonth !== 'all') {
      list = list.filter(i => {
        const m = i.month || (i.updated_at ? i.updated_at.split('-')[1] : '');
        return m === this.selectedMonth;
      });
    }

    if (this.selectedCategoryFilter !== 'all') {
      const filterVal = this.selectedCategoryFilter.toLowerCase();
      list = list.filter(i => 
        (i.category || '').toLowerCase() === filterVal ||
        (i.sub_category || i.subCategory || '').toLowerCase() === filterVal
      );
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

  /**
   * Filtered Security Deposit FD Accounts (filtered by FY, Month, Category, Search)
   */
  get filteredSecurityDeposits(): SecretarySecurityDepositItem[] {
    let list = this.overview?.security_deposits || [];

    if (this.selectedFinancialYear && this.selectedFinancialYear !== '2026-2027') {
      list = list.filter(i => (i.financial_year || '2026-2027') === this.selectedFinancialYear);
    }

    if (this.selectedMonth && this.selectedMonth !== 'all') {
      list = list.filter(i => {
        const m = i.month || (i.updated_at ? i.updated_at.split('-')[1] : '');
        return m === this.selectedMonth;
      });
    }

    if (this.selectedCategoryFilter !== 'all') {
      const filterVal = this.selectedCategoryFilter.toLowerCase();
      list = list.filter(i => 
        (i.category || '').toLowerCase() === filterVal ||
        (i.sub_category || i.subCategory || '').toLowerCase() === filterVal
      );
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

  /**
   * Dynamic Summary KPIs based on active filters & revenue heads
   */
  get displayedKpis() {
    const heads = this.filteredRevenueHeads;
    if (heads && heads.length > 0) {
      const netRev = heads
        .filter(h => !((h.head_name || h.headName || '').toLowerCase().includes('security') || (h.head_name || h.headName || '').toLowerCase().includes('fd')))
        .reduce((sum, h) => sum + (h.total_paid_to_excise !== undefined ? h.total_paid_to_excise : (h.total_debit || h.totalDebit || 0)), 0);

      const totalFd = heads
        .filter(h => (h.head_name || h.headName || '').toLowerCase().includes('security') || (h.head_name || h.headName || '').toLowerCase().includes('fd'))
        .reduce((sum, h) => sum + (h.total_paid_to_excise !== undefined ? h.total_paid_to_excise : (h.total_debit || h.totalDebit || 0)), 0);

      const activeBal = heads.reduce((sum, h) => sum + (h.current_balance || h.currentBalance || 0), 0);

      return {
        net_excise_revenue_collected: netRev,
        total_revenue_collected: netRev + totalFd,
        total_security_deposit_fd: totalFd,
        total_active_balance: activeBal,
        top_contributors_count: this.filteredTopContributors.length
      };
    }

    return this.overview.summary_kpis;
  }

  getKpiVal(val: number | undefined | null, fallback: number = 0): number {
    if (this.isFilterActive) {
      return val ?? 0;
    }
    return val ?? fallback;
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
    if (name.includes('additional')) return 'head-theme-indigo';
    if (name.includes('excise')) return 'head-theme-emerald';
    if (name.includes('security') || name.includes('fd')) return 'head-theme-amber';
    if (name.includes('hologram')) return 'head-theme-sky';
    if (name.includes('license')) return 'head-theme-purple';
    if (name.includes('cess')) return 'head-theme-teal';
    return 'head-theme-emerald';
  }

  getFallbackHoa(headName: string = ''): string {
    const name = (headName || '').toLowerCase();
    if (name.includes('additional')) return '0039-00-102-45-01';
    if (name.includes('excise')) return '0039-00-105-45-01';
    if (name.includes('security') || name.includes('fd')) return '8443-00-103-45-01';
    if (name.includes('hologram')) return '0039-00-800-45-01';
    if (name.includes('license')) return '0039-00-800-45-02';
    if (name.includes('cess')) return '0045-00-112-45-03';
    return '0039-00-800-45-01';
  }

  printReport(): void {
    window.print();
  }
}
