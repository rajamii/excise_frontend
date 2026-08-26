import { Component, OnDestroy, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
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
export class SecretaryRevenueComponent implements OnInit, OnDestroy {
  isLoading = false;
  loadError = '';
  private loadingTimeoutId: ReturnType<typeof setTimeout> | null = null;

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
      .reduce((sum, h) => sum + this.getHeadPaidAmount(h), 0);
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

  private readonly fallbackRevenueHeads: SecretaryRevenueHeadItem[] = [
    ['Excise Duty Wallet', '0039-00-105-45-01'],
    ['Additional Excise Duty Wallet', '0039-00-102-45-01'],
    ['Hologram Procurement', '0039-00-800-45-01'],
    ['Education Cess', '0045-00-112-45-03'],
    ['License Fees', '0039-00-800-45-02'],
    ['Security Deposit (FD)', '8443-00-103-45-01']
  ].map(([head_name, head_of_account]) => ({
    head_name,
    head_of_account,
    total_credit: 0,
    total_debit: 0,
    current_balance: 0,
    total_paid_to_excise: 0,
    accounts_count: 0
  }));

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
      total_revenue_collected: 0,
      net_excise_revenue_collected: 0,
      total_active_balance: 0,
      total_security_deposit_fd: 0,
      top_contributors_count: 0
    },
    revenue_heads: this.fallbackRevenueHeads,
    top_contributors: [],
    security_deposits: []
  };

  constructor(
    private secretaryService: SecretaryService,
    private location: Location,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  ngOnInit(): void {
    this.loadRevenueData();
  }

  ngOnDestroy(): void {
    this.clearLoadingTimeout();
  }

  loadRevenueData(): void {
    this.isLoading = true;
    this.loadError = '';
    this.clearLoadingTimeout();
    this.loadingTimeoutId = setTimeout(() => {
      this.ngZone.run(() => {
        if (!this.isLoading) return;
        this.overview = this.getFallbackRevenueOverview();
        this.loadError = 'Revenue API is taking too long. Showing available revenue heads with zero values.';
        this.isLoading = false;
        this.cdr.detectChanges();
      });
    }, 16000);

    this.secretaryService.getRevenueOverview().subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.clearLoadingTimeout();
          this.overview = this.normalizeRevenueOverview(res);
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.clearLoadingTimeout();
          console.error('Failed to load Secretary Revenue overview:', err);
          this.overview = this.getFallbackRevenueOverview();
          this.loadError = 'Unable to load live revenue data. Showing available revenue heads with zero values.';
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  private clearLoadingTimeout(): void {
    if (this.loadingTimeoutId) {
      clearTimeout(this.loadingTimeoutId);
      this.loadingTimeoutId = null;
    }
  }

  private getFallbackRevenueOverview(): SecretaryRevenueOverview {
    return {
      summary_kpis: {
        total_revenue_collected: 0,
        net_excise_revenue_collected: 0,
        total_active_balance: 0,
        total_security_deposit_fd: 0,
        top_contributors_count: 0
      },
      revenue_heads: this.fallbackRevenueHeads,
      top_contributors: [],
      security_deposits: []
    };
  }

  private normalizeRevenueOverview(res?: SecretaryRevenueOverview | null): SecretaryRevenueOverview {
    const response = res || this.getFallbackRevenueOverview();
    const responseHeads = Array.isArray(response.revenue_heads) ? response.revenue_heads : [];
    const responseHeadMap = new Map<string, SecretaryRevenueHeadItem>();

    responseHeads.forEach(head => {
      const headName = this.normalizeHeadName(head.head_name || head.headName || '');
      if (headName) {
        responseHeadMap.set(headName, head);
      }
    });

    const normalizedHeads = this.fallbackRevenueHeads.map(fallbackHead => {
      const fallbackName = fallbackHead.head_name || fallbackHead.headName || '';
      const liveHead = responseHeadMap.get(this.normalizeHeadName(fallbackName));
      return this.normalizeRevenueHead({ ...fallbackHead, ...(liveHead || {}) });
    });

    responseHeads.forEach(head => {
      const headName = this.normalizeHeadName(head.head_name || head.headName || '');
      const alreadyIncluded = normalizedHeads.some(existing => this.normalizeHeadName(existing.head_name || existing.headName || '') === headName);
      if (!alreadyIncluded) {
        normalizedHeads.push(this.normalizeRevenueHead(head));
      }
    });

    const totalFd = normalizedHeads
      .filter(head => this.isSecurityDepositHead(head.head_name || head.headName || ''))
      .reduce((sum, head) => sum + this.getHeadPaidAmount(head), 0);
    const netRevenue = normalizedHeads
      .filter(head => !this.isSecurityDepositHead(head.head_name || head.headName || ''))
      .reduce((sum, head) => sum + this.getHeadPaidAmount(head), 0);
    const activeBalance = normalizedHeads.reduce((sum, head) => sum + this.readAmount(head.current_balance, head.currentBalance), 0);

    return {
      summary_kpis: {
        total_revenue_collected: this.readAmount(response.summary_kpis?.total_revenue_collected, netRevenue + totalFd),
        net_excise_revenue_collected: this.readAmount(response.summary_kpis?.net_excise_revenue_collected, netRevenue),
        total_active_balance: this.readAmount(response.summary_kpis?.total_active_balance, activeBalance),
        total_security_deposit_fd: this.readAmount(response.summary_kpis?.total_security_deposit_fd, totalFd),
        top_contributors_count: Number(response.summary_kpis?.top_contributors_count || (response.top_contributors || []).length || 0)
      },
      revenue_heads: normalizedHeads,
      top_contributors: Array.isArray(response.top_contributors) ? response.top_contributors : [],
      security_deposits: Array.isArray(response.security_deposits) ? response.security_deposits : []
    };
  }

  private normalizeRevenueHead(head: SecretaryRevenueHeadItem): SecretaryRevenueHeadItem {
    const headName = head.head_name || head.headName || '';
    const totalDebit = this.readAmount(head.total_paid_to_excise, head.total_debit, head.totalDebit);
    const totalCredit = this.readAmount(head.total_credit, head.totalCredit);
    const currentBalance = this.readAmount(head.current_balance, head.currentBalance);

    return {
      ...head,
      head_name: headName,
      head_of_account: head.head_of_account || head.headOfAccount || this.getFallbackHoa(headName),
      total_credit: totalCredit,
      totalCredit,
      total_debit: totalDebit,
      totalDebit: totalDebit,
      total_paid_to_excise: totalDebit,
      current_balance: currentBalance,
      currentBalance,
      accounts_count: Number(head.accounts_count ?? head.accountsCount ?? 0),
      accountsCount: Number(head.accounts_count ?? head.accountsCount ?? 0),
      application_fee_paid: head.application_fee_paid === undefined ? undefined : this.readAmount(head.application_fee_paid),
      billdesk_paid_total: head.billdesk_paid_total === undefined ? undefined : this.readAmount(head.billdesk_paid_total),
      fd_saved_amount: head.fd_saved_amount === undefined ? undefined : this.readAmount(head.fd_saved_amount)
    };
  }

  private normalizeHeadName(headName: string): string {
    return String(headName || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private isSecurityDepositHead(headName: string): boolean {
    const normalizedName = this.normalizeHeadName(headName);
    return normalizedName.includes('security') || normalizedName.includes('fd');
  }

  private readAmount(...values: Array<number | string | null | undefined>): number {
    for (const value of values) {
      if (value === null || value === undefined || value === '') {
        continue;
      }
      const amount = Number(value);
      if (Number.isFinite(amount)) {
        return amount;
      }
    }
    return 0;
  }

  setTab(tab: 'overview' | 'top-contributors' | 'security-deposits', event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.activeTab === tab) {
      return;
    }
    this.activeTab = tab;
    this.currentPageMap[tab] = 1;
    this.cdr.detectChanges();
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
        .reduce((sum, h) => sum + this.getHeadPaidAmount(h), 0);

      const totalFd = heads
        .filter(h => (h.head_name || h.headName || '').toLowerCase().includes('security') || (h.head_name || h.headName || '').toLowerCase().includes('fd'))
        .reduce((sum, h) => sum + this.getHeadPaidAmount(h), 0);

      const activeBal = heads.reduce((sum, h) => sum + this.readAmount(h.current_balance, h.currentBalance), 0);

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

  getHeadDebitAmount(head: SecretaryRevenueHeadItem): number {
    return this.readAmount(head.total_debit, head.totalDebit, head.total_paid_to_excise);
  }

  getHeadPaidAmount(head: SecretaryRevenueHeadItem): number {
    return this.readAmount(head.total_paid_to_excise, head.total_debit, head.totalDebit);
  }

  trackByHeadName(_: number, head: SecretaryRevenueHeadItem): string {
    return this.normalizeHeadName(head.head_name || head.headName || '');
  }

  trackByContributor(_: number, item: SecretaryTopContributorItem): string {
    return String(item.user_id || item.userId || item.licensee_name || item.licenseeName || item.rank || '');
  }

  trackBySecurityDeposit(_: number, item: SecretarySecurityDepositItem): string {
    return String(item.licensee_id || item.licenseeId || item.user_id || item.userId || '');
  }

  getHeadUtilizationLabel(headName: string = ''): string {
    const normalizedName = headName.toLowerCase();
    if (normalizedName.includes('security') || normalizedName.includes('fd')) {
      return 'Verified FD Amount Saved:';
    }
    if (normalizedName.includes('license')) {
      return 'License/Application Fees Paid:';
    }
    return 'Wallet Amount Paid to Excise:';
  }

  getHeadPaidLabel(headName: string = ''): string {
    const normalizedName = headName.toLowerCase();
    if (normalizedName.includes('security') || normalizedName.includes('fd')) {
      return 'Security Deposit (FD) Saved:';
    }
    if (normalizedName.includes('license')) {
      return 'Total License Fees Received:';
    }
    return 'Total Paid to Excise Dept:';
  }

  printReport(): void {
    window.print();
  }
}
