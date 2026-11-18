import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import Swal from 'sweetalert2';

export interface Roll {
  from_serial: string;
  to_serial: string;
}

export interface Carton {
  carton_number: string;
  type: string;
  num_rolls: number;
  rolls: Roll[];
}

@Component({
  selector: 'app-hologram-procurement-updation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hologram-procurement-updation.component.html',
  styleUrls: ['./hologram-procurement-updation.component.scss']
})
export class HologramProcurementUpdationComponent implements OnInit {
  establishments: any[] = [];
  selectedEstablishment: any = null;
  isLoading = false;
  isSaving = false;
  saveSuccess = false;
  saveError = '';
  manualEntries: any[] = [];

  // Active Tab: 'hologram' for hologram rolls entry, 'wallet' for establishment wallets
  activeTab: 'hologram' | 'wallet' = 'hologram';

  // Wallets state
  wallets: any[] = [];
  walletTransactions: any[] = [];
  allWalletTransactions: any[] = [];
  txFilter: 'single_window' | 'all' = 'single_window';
  totalWalletBalance: number = 0;
  isLoadingWallets = false;
  isCreditingWallet = false;
  walletError = '';

  // Credit Wallet Modal state
  showCreditModal = false;
  selectedWalletForCredit: any = null;
  creditForm = {
    wallet_type: '',
    amount: null as number | null,
    remarks: '',
    previewTxnId: ''
  };

  // Quick amount suggestions (INR)
  readonly quickAmounts: number[] = [10000, 25000, 50000, 100000, 500000];

  // Form for adding cartons
  cartons: Carton[] = [];

  // Filter / Search for establishments
  searchTerm = '';

  // Default type options
  readonly typeOptions: string[] = ['LOCAL', 'EXPORT', 'DEFENCE'];

  // Base API endpoint
  private readonly apiBaseUrl = `${environment.apiBaseUrl ? environment.apiBaseUrl.replace(/\/+$/, '') : ''}/transactional/supply_chain/hologram-procurement-updation`;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadEstablishments();
    this.loadManualEntries();
  }

  loadEstablishments(): void {
    this.isLoading = true;
    this.http.get<any>(`${this.apiBaseUrl}/establishments/`).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (Array.isArray(res)) {
          this.establishments = res;
        } else if (res && Array.isArray(res.results)) {
          this.establishments = res.results;
        } else if (res && Array.isArray(res.data)) {
          this.establishments = res.data;
        } else if (res && Array.isArray(res.establishments)) {
          this.establishments = res.establishments;
        } else {
          this.establishments = [];
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Failed to load establishments:', err);
      }
    });
  }

  loadManualEntries(): void {
    this.http.get<any>(`${this.apiBaseUrl}/entries/`).subscribe({
      next: (res) => {
        if (Array.isArray(res)) {
          this.manualEntries = res;
        } else if (res && Array.isArray(res.results)) {
          this.manualEntries = res.results;
        } else if (res && Array.isArray(res.data)) {
          this.manualEntries = res.data;
        } else if (res && Array.isArray(res.entries)) {
          this.manualEntries = res.entries;
        } else {
          this.manualEntries = [];
        }
      },
      error: (err) => {
        console.error('Failed to load manual entries:', err);
      }
    });
  }

  selectEstablishment(est: any): void {
    this.selectedEstablishment = est;
    this.saveSuccess = false;
    this.saveError = '';
    if (this.cartons.length === 0) {
      this.addCarton();
    }
    if (this.activeTab === 'wallet' && est) {
      this.loadEstablishmentWallets(est);
    }
  }

  addCarton(): void {
    const defaultRollsCount = 5;
    const initialRolls: Roll[] = [];
    for (let i = 0; i < defaultRollsCount; i++) {
      initialRolls.push({ from_serial: '', to_serial: '' });
    }
    this.cartons.push({
      carton_number: '',
      type: 'LOCAL',
      num_rolls: defaultRollsCount,
      rolls: initialRolls
    });
  }

  removeCarton(index: number): void {
    if (index >= 0 && index < this.cartons.length) {
      this.cartons.splice(index, 1);
    }
  }

  generateRolls(cartonIndex: number): void {
    const carton = this.cartons[cartonIndex];
    if (!carton) return;

    const numRolls = parseInt(String(carton.num_rolls), 10);
    if (isNaN(numRolls) || numRolls <= 0) {
      this.saveError = `Please enter a valid number of rolls for Carton #${cartonIndex + 1}.`;
      return;
    }
    this.saveError = '';

    const rolls: Roll[] = [];
    for (let i = 0; i < numRolls; i++) {
      if (carton.rolls && carton.rolls[i]) {
        rolls.push(carton.rolls[i]);
      } else {
        rolls.push({ from_serial: '', to_serial: '' });
      }
    }
    carton.rolls = rolls;
  }

  addRoll(cartonIndex: number): void {
    const carton = this.cartons[cartonIndex];
    if (!carton) return;

    if (!carton.rolls) {
      carton.rolls = [];
    }

    carton.rolls.push({ from_serial: '', to_serial: '' });
    carton.num_rolls = carton.rolls.length;
  }

  onFromSerialChange(roll: Roll): void {
    if (!roll.from_serial) return;
    const from = parseInt(String(roll.from_serial).trim(), 10);
    if (!isNaN(from) && from > 0 && (!roll.to_serial || String(roll.to_serial).trim() === '')) {
      roll.to_serial = String(from + 20000 - 1);
    }
  }

  getRollSuffix(carton: Carton, index: number): string {
    const box = (carton.carton_number || '').trim();
    if (!box) return `Roll ${index + 1}`;
    if ((carton.rolls?.length || 0) <= 1) return box;
    const suffix = String.fromCharCode(97 + (index % 26));
    return `${box}(${suffix})`;
  }

  removeRoll(cartonIndex: number, rollIndex: number): void {
    const carton = this.cartons[cartonIndex];
    if (!carton || !carton.rolls) return;

    if (rollIndex >= 0 && rollIndex < carton.rolls.length) {
      carton.rolls.splice(rollIndex, 1);
      carton.num_rolls = carton.rolls.length;
    }
  }

  calculateTotalHolograms(): number {
    if (!this.cartons) return 0;
    return this.cartons.reduce((sum, carton) => {
      return sum + (carton.rolls || []).reduce((rSum, roll) => {
        const from = parseInt(String(roll.from_serial), 10);
        const to = parseInt(String(roll.to_serial), 10);
        if (!isNaN(from) && !isNaN(to) && to >= from) {
          return rSum + (to - from + 1);
        }
        return rSum;
      }, 0);
    }, 0);
  }

  calculateTotalRolls(): number {
    if (!this.cartons) return 0;
    return this.cartons.reduce((sum, carton) => sum + (carton.rolls?.length || 0), 0);
  }

  getRollHolograms(roll: Roll): number {
    const from = parseInt(String(roll.from_serial), 10);
    const to = parseInt(String(roll.to_serial), 10);
    if (!isNaN(from) && !isNaN(to) && to >= from) {
      return to - from + 1;
    }
    return 0;
  }

  getCartonHolograms(carton: Carton): number {
    if (!carton.rolls) return 0;
    return carton.rolls.reduce((sum, roll) => sum + this.getRollHolograms(roll), 0);
  }

  isRollValid(roll: Roll): boolean {
    if (roll.from_serial === null || roll.from_serial === undefined || String(roll.from_serial).trim() === '') {
      return false;
    }
    if (roll.to_serial === null || roll.to_serial === undefined || String(roll.to_serial).trim() === '') {
      return false;
    }
    const from = parseInt(String(roll.from_serial).trim(), 10);
    const to = parseInt(String(roll.to_serial).trim(), 10);
    return !isNaN(from) && !isNaN(to) && from > 0 && to >= from;
  }

  canSave(): boolean {
    if (!this.selectedEstablishment) return false;
    if (!this.cartons || this.cartons.length === 0) return false;
    for (const carton of this.cartons) {
      if (!carton.carton_number || !carton.carton_number.trim()) return false;
      if (!carton.rolls || carton.rolls.length === 0) return false;
      for (const roll of carton.rolls) {
        if (!this.isRollValid(roll)) return false;
      }
    }
    return true;
  }

  saveEntry(): void {
    if (this.isSaving) return;

    if (!this.selectedEstablishment) {
      Swal.fire({
        icon: 'warning',
        title: 'Select Establishment',
        text: 'Please select a distillery or brewery first.',
        confirmButtonColor: '#0f4c5c'
      });
      return;
    }

    if (!this.cartons || this.cartons.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Cartons Added',
        text: 'Please add at least one carton with rolls.',
        confirmButtonColor: '#0f4c5c'
      });
      return;
    }

    for (let cIdx = 0; cIdx < this.cartons.length; cIdx++) {
      const carton = this.cartons[cIdx];
      const boxName = carton.carton_number?.trim();
      if (!boxName) {
        Swal.fire({
          icon: 'warning',
          title: 'Missing Box Number',
          text: `Please enter Box Number for Carton #${cIdx + 1}.`,
          confirmButtonColor: '#0f4c5c'
        });
        return;
      }

      if (!carton.rolls || carton.rolls.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'No Rolls in Carton',
          text: `Carton "${boxName}" has no rolls. Click "⚡ Generate Rolls" or "+ Add Roll" to add rolls.`,
          confirmButtonColor: '#0f4c5c'
        });
        return;
      }

      for (let rIdx = 0; rIdx < carton.rolls.length; rIdx++) {
        const roll = carton.rolls[rIdx];
        const rollName = this.getRollSuffix(carton, rIdx);

        if (!roll.from_serial || String(roll.from_serial).trim() === '' || !roll.to_serial || String(roll.to_serial).trim() === '') {
          Swal.fire({
            icon: 'warning',
            title: 'Incomplete Serial Range',
            text: `Please enter both From Serial and To Serial for ${rollName} in Carton "${boxName}".`,
            confirmButtonColor: '#0f4c5c'
          });
          return;
        }

        const from = parseInt(String(roll.from_serial).trim(), 10);
        const to = parseInt(String(roll.to_serial).trim(), 10);

        if (isNaN(from) || isNaN(to) || from <= 0) {
          Swal.fire({
            icon: 'warning',
            title: 'Invalid Serial Number',
            text: `Serial numbers must be positive numbers for ${rollName}.`,
            confirmButtonColor: '#0f4c5c'
          });
          return;
        }

        if (to < from) {
          Swal.fire({
            icon: 'warning',
            title: 'Invalid Serial Range',
            text: `For ${rollName}, To Serial (${to}) cannot be less than From Serial (${from}).`,
            confirmButtonColor: '#0f4c5c'
          });
          return;
        }
      }
    }

    // Check for internal serial range overlap before submitting
    const allRollsWithRanges: { label: string; from: number; to: number }[] = [];
    for (const carton of this.cartons) {
      for (let rIdx = 0; rIdx < carton.rolls.length; rIdx++) {
        const roll = carton.rolls[rIdx];
        const label = this.getRollSuffix(carton, rIdx);
        const from = parseInt(String(roll.from_serial).trim(), 10);
        const to = parseInt(String(roll.to_serial).trim(), 10);

        for (const existing of allRollsWithRanges) {
          if (Math.max(from, existing.from) <= Math.min(to, existing.to)) {
            Swal.fire({
              icon: 'error',
              title: 'Overlapping Serial Numbers',
              html: `Roll <strong>"${label}"</strong> (${from} – ${to}) overlaps with Roll <strong>"${existing.label}"</strong> (${existing.from} – ${existing.to}).<br><br>Each roll must have unique, non-overlapping serial numbers.`,
              confirmButtonColor: '#dc2626'
            });
            return;
          }
        }
        allRollsWithRanges.push({ label, from, to });
      }
    }

    this.isSaving = true;
    this.saveSuccess = false;
    this.saveError = '';

    const licenseeId = this.selectedEstablishment.id ?? this.selectedEstablishment.licensee_id;
    const estName = this.getEstablishmentName(this.selectedEstablishment);
    const totalRolls = this.calculateTotalRolls();
    const totalHolograms = this.calculateTotalHolograms();

    const payload = {
      licensee_id: licenseeId,
      cartons: this.cartons.map(c => ({
        carton_number: c.carton_number.trim(),
        type: c.type,
        rolls: c.rolls.map(r => ({
          from_serial: String(r.from_serial).trim(),
          to_serial: String(r.to_serial).trim()
        }))
      }))
    };

    this.http.post<any>(`${this.apiBaseUrl}/save/`, payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.saveSuccess = true;
        this.saveError = '';

        // Reset the form and empty Enter Carton Details box
        this.cartons = [];
        this.selectedEstablishment = null;

        // Reload data
        this.loadManualEntries();
        this.loadEstablishments();

        Swal.fire({
          icon: 'success',
          title: 'Stock Updated Successfully!',
          html: `<strong>${totalRolls} roll(s)</strong> (${totalHolograms.toLocaleString()} holograms) have been added directly to <strong>${estName}</strong>'s Hologram Inventory.`,
          confirmButtonColor: '#10b981'
        });
      },
      error: (err) => {
        this.isSaving = false;
        this.saveSuccess = false;
        const msg = err?.error?.detail || err?.error?.message || err?.error?.error || err?.message || 'Failed to save inventory entry. Please verify details and try again.';
        this.saveError = typeof msg === 'string' ? msg : JSON.stringify(msg);

        Swal.fire({
          icon: 'error',
          title: 'Cannot Save to Inventory',
          text: this.saveError,
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }

  get filteredEstablishments(): any[] {
    if (!this.searchTerm || !this.searchTerm.trim()) {
      return this.establishments;
    }
    const term = this.searchTerm.toLowerCase().trim();
    return this.establishments.filter(est => {
      const name = this.getEstablishmentName(est).toLowerCase();
      const code = this.getEstablishmentCode(est).toLowerCase();
      const type = this.getEstablishmentType(est).toLowerCase();
      return name.includes(term) || code.includes(term) || type.includes(term);
    });
  }

  getEstablishmentName(est: any): string {
    if (!est) return '';
    return est.manufacturing_unit_name || est.name || est.establishment_name || est.licensee_name || est.unit_name || `Establishment #${est.id || ''}`;
  }

  getEstablishmentCode(est: any): string {
    if (!est) return '';
    return est.licensee_id || est.license_number || est.license_no || est.reference_number || est.ref_no || est.code || '';
  }

  getEstablishmentType(est: any): string {
    if (!est) return '';
    return est.license_type || est.type || est.unit_type || est.category || '';
  }

  isSelectedEstablishment(est: any): boolean {
    if (!this.selectedEstablishment || !est) return false;
    const currentId = this.selectedEstablishment.id ?? this.selectedEstablishment.licensee_id;
    const estId = est.id ?? est.licensee_id;
    return currentId !== undefined && currentId === estId;
  }

  selectedEntryForDetails: any = null;

  openDetailsModal(entry: any): void {
    this.selectedEntryForDetails = entry;
  }

  closeDetailsModal(): void {
    this.selectedEntryForDetails = null;
  }

  getEntryRefNo(entry: any): string {
    if (!entry) return '---';
    return entry.refNo || entry.ref_no || entry.referenceNo || entry.reference_no || ('MANUAL/1101/' + (entry.id || '---'));
  }

  getEntryEstName(entry: any): string {
    if (!entry) return 'Establishment';
    return entry.establishmentName || entry.establishment_name || entry.manufacturingUnit || entry.manufacturing_unit || entry.licenseeName || entry.licensee_name || entry.establishment || 'Establishment';
  }

  getEntryLicenseNo(entry: any): string {
    if (!entry) return '';
    return entry.licenseNumber || entry.license_number || entry.licenseNo || entry.license_no || '';
  }

  getEntryTotalHolograms(entry: any): number {
    if (!entry) return 0;
    const val = entry.totalHolograms ?? entry.total_holograms ?? entry.totalQty ?? entry.total_qty ?? entry.quantity;
    if (val !== undefined && val !== null && !isNaN(Number(val))) {
      const num = Number(val);
      if (num > 0) return num;
    }
    const rolls = this.getEntryRolls(entry);
    if (rolls && rolls.length > 0) {
      return rolls.reduce((sum, r) => sum + this.getRollCount(r), 0);
    }
    return 0;
  }

  getEntryTotalRolls(entry: any): number {
    if (!entry) return 0;
    const rolls = this.getEntryRolls(entry);
    if (rolls && rolls.length > 0) {
      return rolls.length;
    }
    return entry.totalRolls ?? entry.total_rolls ?? entry.rollsCount ?? entry.rolls_count ?? 0;
  }

  getEntryCartonsCount(entry: any): number {
    if (!entry) return 1;
    if (entry.cartonsCount !== undefined && entry.cartonsCount !== null) return entry.cartonsCount;
    if (entry.cartons_count !== undefined && entry.cartons_count !== null) return entry.cartons_count;
    const grouped = this.getGroupedCartons(entry);
    return grouped.length > 0 ? grouped.length : 1;
  }

  getEntryDate(entry: any): string {
    if (!entry) return '';
    return entry.createdAt || entry.created_at || entry.date || entry.created_on || '';
  }

  getEntryRolls(entry: any): any[] {
    if (!entry) return [];
    if (entry.rolls && Array.isArray(entry.rolls) && entry.rolls.length > 0) {
      return entry.rolls;
    }
    const rawCartons = entry.cartonDetails || entry.carton_details;
    if (rawCartons && Array.isArray(rawCartons) && rawCartons.length > 0) {
      return rawCartons;
    }
    return [];
  }

  getRollCode(roll: any, index: number = 0): string {
    if (!roll) return `Roll ${index + 1}`;
    return roll.cartonNumber || roll.carton_number || roll.cartoonNumber || roll.cartoon_number || `Roll ${index + 1}`;
  }

  getRollFromSerial(roll: any): string {
    if (!roll) return '—';
    const s = roll.fromSerial ?? roll.from_serial ?? roll.from;
    return s !== undefined && s !== null && s !== '' ? String(s) : '—';
  }

  getRollToSerial(roll: any): string {
    if (!roll) return '—';
    const s = roll.toSerial ?? roll.to_serial ?? roll.to;
    return s !== undefined && s !== null && s !== '' ? String(s) : '—';
  }

  getRollCount(roll: any): number {
    if (!roll) return 0;
    const c = roll.totalCount ?? roll.total_count ?? roll.numberOfHolograms ?? roll.count;
    if (c !== undefined && c !== null && !isNaN(Number(c)) && Number(c) > 0) {
      return Number(c);
    }
    const from = parseInt(this.getRollFromSerial(roll), 10);
    const to = parseInt(this.getRollToSerial(roll), 10);
    if (!isNaN(from) && !isNaN(to) && to >= from) {
      return to - from + 1;
    }
    return 0;
  }

  getRollAvailable(roll: any): number {
    if (!roll) return 0;
    const a = roll.available ?? roll.availableCount ?? roll.available_qty;
    if (a !== undefined && a !== null && !isNaN(Number(a))) {
      return Number(a);
    }
    return this.getRollCount(roll);
  }

  getRollType(roll: any): string {
    if (!roll) return 'LOCAL';
    return roll.type || this.selectedEntryForDetails?.type || 'LOCAL';
  }

  getRollStatus(roll: any): string {
    if (!roll) return 'AVAILABLE';
    return roll.status || 'AVAILABLE';
  }

  getGroupedCartons(entry: any): Array<{ cartonName: string; type: string; totalHolograms: number; rolls: any[] }> {
    const rolls = this.getEntryRolls(entry);
    if (!rolls || rolls.length === 0) return [];

    const map = new Map<string, { cartonName: string; type: string; totalHolograms: number; rolls: any[] }>();

    for (let i = 0; i < rolls.length; i++) {
      const roll = rolls[i];
      const rollCode = this.getRollCode(roll, i);
      let baseCartonName = rollCode;
      const suffixMatch = rollCode.match(/^(.*?)\([a-zA-Z0-9]+\)$/);
      if (suffixMatch && suffixMatch[1]) {
        baseCartonName = suffixMatch[1].trim();
      }

      if (!map.has(baseCartonName)) {
        map.set(baseCartonName, {
          cartonName: baseCartonName,
          type: this.getRollType(roll),
          totalHolograms: 0,
          rolls: []
        });
      }

      const group = map.get(baseCartonName)!;
      group.rolls.push(roll);
      group.totalHolograms += this.getRollCount(roll);
    }

    return Array.from(map.values());
  }

  resetForm(): void {
    this.cartons = [];
    this.selectedEstablishment = null;
    this.saveSuccess = false;
    this.saveError = '';
  }

  switchTab(tab: 'hologram' | 'wallet'): void {
    this.activeTab = tab;
    if (tab === 'wallet' && this.selectedEstablishment) {
      this.loadEstablishmentWallets(this.selectedEstablishment);
    }
  }

  openWalletTabFor(est: any, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectEstablishment(est);
    this.switchTab('wallet');
  }

  loadEstablishmentWallets(est?: any): void {
    const target = est || this.selectedEstablishment;
    if (!target) return;

    const lid = target.licensee_id || target.license_number || target.id;
    if (!lid) return;

    this.isLoadingWallets = true;
    this.walletError = '';

    // Fetch with all=true to get both singleWindowTransactions and allTransactions
    this.http.get<any>(`${this.apiBaseUrl}/wallets/?licensee_id=${encodeURIComponent(lid)}&all=true`).subscribe({
      next: (res) => {
        this.isLoadingWallets = false;
        this.wallets = res?.wallets || [];
        this.totalWalletBalance = res?.totalWalletBalance ?? res?.total_wallet_balance ?? 0;
        
        const swTxs = res?.singleWindowTransactions ?? res?.single_window_transactions;
        const allTxs = res?.allTransactions ?? res?.all_transactions ?? res?.transactions ?? [];

        if (Array.isArray(swTxs)) {
          this.walletTransactions = swTxs;
        } else {
          // Filter single window transactions
          this.walletTransactions = allTxs.filter((tx: any) =>
            tx.isSingleWindow ||
            tx.is_single_window ||
            (tx.transactionId || tx.transaction_id || '').toLowerCase().startsWith('admin_') ||
            (tx.transactionId || tx.transaction_id || '').toLowerCase().startsWith('single_window') ||
            (tx.sourceModule || tx.source_module || '').toLowerCase() === 'single_window'
          );
        }

        this.allWalletTransactions = allTxs;

        // Update establishment's cached balance in the list
        if (target) {
          target.total_wallet_balance = this.totalWalletBalance;
          target.totalWalletBalance = this.totalWalletBalance;
          target.wallets_count = this.wallets.length;
          target.walletsCount = this.wallets.length;
        }
      },
      error: (err) => {
        this.isLoadingWallets = false;
        const msg = err?.error?.error || err?.error?.detail || err?.message || 'Failed to load establishment wallets.';
        this.walletError = msg;
        console.error('Failed to load wallets:', err);
      }
    });
  }

  get displayedTransactions(): any[] {
    return this.txFilter === 'single_window' ? this.walletTransactions : this.allWalletTransactions;
  }

  setTxFilter(filter: 'single_window' | 'all'): void {
    this.txFilter = filter;
  }

  getWalletTypeCode(w: any): string {
    if (!w) return '';
    if (typeof w === 'string') return w.trim().toLowerCase();
    const code = w.wallet_type || w.walletType || w.code || w.type || '';
    return String(code).trim().toLowerCase();
  }

  openCreditModal(wallet?: any): void {
    this.selectedWalletForCredit = wallet || (this.wallets && this.wallets[0]) || null;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const rnd = Math.floor(100 + Math.random() * 900);

    const defaultType = this.getWalletTypeCode(this.selectedWalletForCredit) || this.getWalletTypeCode(this.wallets[0]) || 'hologram';

    this.creditForm = {
      wallet_type: defaultType,
      amount: null,
      remarks: '',
      previewTxnId: `admin_${ts}_${rnd}`
    };
    this.showCreditModal = true;
  }

  closeCreditModal(): void {
    this.showCreditModal = false;
    this.selectedWalletForCredit = null;
    this.creditForm = {
      wallet_type: '',
      amount: null,
      remarks: '',
      previewTxnId: ''
    };
  }

  setQuickAmount(amount: number): void {
    this.creditForm.amount = (this.creditForm.amount || 0) + amount;
  }

  submitCreditWallet(): void {
    if (this.isCreditingWallet) return;

    if (!this.selectedEstablishment) {
      Swal.fire({
        icon: 'warning',
        title: 'Select Establishment',
        text: 'Please select an establishment first.',
        confirmButtonColor: '#0f4c5c'
      });
      return;
    }

    const wType = this.getWalletTypeCode(this.creditForm.wallet_type);
    if (!wType || wType === 'undefined' || wType === 'null') {
      Swal.fire({
        icon: 'warning',
        title: 'Select Wallet',
        text: 'Please choose which wallet to credit.',
        confirmButtonColor: '#0f4c5c'
      });
      return;
    }

    const amt = Number(this.creditForm.amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Amount',
        text: 'Please enter a valid amount greater than zero.',
        confirmButtonColor: '#0f4c5c'
      });
      return;
    }

    this.isCreditingWallet = true;
    const lid = this.selectedEstablishment.licensee_id || this.selectedEstablishment.license_number || this.selectedEstablishment.id;
    const estName = this.getEstablishmentName(this.selectedEstablishment);

    const payload = {
      licensee_id: lid,
      licenseeId: lid,
      wallet_type: wType,
      walletType: wType,
      amount: amt,
      remarks: this.creditForm.remarks || ''
    };

    this.http.post<any>(`${this.apiBaseUrl}/wallets/credit/`, payload).subscribe({
      next: (res) => {
        this.isCreditingWallet = false;
        const txnId = res?.transaction_id || res?.transactionId || this.creditForm.previewTxnId;
        const walletName = res?.wallet_name || res?.walletName || this.getWalletName(wType);

        this.closeCreditModal();
        this.loadEstablishmentWallets(this.selectedEstablishment);
        this.loadEstablishments();

        Swal.fire({
          icon: 'success',
          title: 'Wallet Credited Successfully!',
          html: `
            <div style="text-align: left; font-size: 14px; line-height: 1.6;">
              <p style="margin: 0 0 8px;"><strong>Establishment:</strong> ${estName}</p>
              <p style="margin: 0 0 8px;"><strong>Wallet:</strong> ${walletName}</p>
              <p style="margin: 0 0 8px;"><strong>Amount Added:</strong> <span style="color: #10b981; font-weight: bold; font-size: 16px;">₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></p>
              <div style="background: #f1f5f9; border-radius: 6px; padding: 10px; margin-top: 12px;">
                <span style="font-size: 12px; color: #64748b; display: block;">Transaction Reference ID:</span>
                <code style="font-size: 13px; font-weight: bold; color: #0f4c5c;">${txnId}</code>
              </div>
              <p style="font-size: 12px; color: #64748b; margin-top: 8px;"><em>This transaction was performed via Single Window and is recorded in user transaction history.</em></p>
            </div>
          `,
          confirmButtonColor: '#10b981',
          confirmButtonText: 'Done'
        });
      },
      error: (err) => {
        this.isCreditingWallet = false;
        const msg = err?.error?.error || err?.error?.detail || err?.message || 'Failed to credit wallet. Please try again.';
        Swal.fire({
          icon: 'error',
          title: 'Credit Failed',
          text: msg,
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }

  getWalletName(type: any): string {
    const key = this.getWalletTypeCode(type);
    const map: Record<string, string> = {
      'excise': 'Excise / Additional Duty',
      'additional_excise': 'Additional Excise Duty',
      'education_cess': 'Education Cess',
      'hologram': 'Hologram Fee',
      'security_deposit': 'Security Deposit',
      'license_fee': 'License Fees'
    };
    return map[key] || (key ? key.replace(/_/g, ' ').toUpperCase() : 'Wallet');
  }

  getWalletIcon(type: any): string {
    const key = this.getWalletTypeCode(type);
    const map: Record<string, string> = {
      'excise': '🍷',
      'additional_excise': '🍷',
      'education_cess': '🎓',
      'hologram': '🏷️',
      'security_deposit': '🔒',
      'license_fee': '📄'
    };
    return map[key] || '💳';
  }

  getWalletBadgeClass(type: any): string {
    const key = this.getWalletTypeCode(type);
    const map: Record<string, string> = {
      'excise': 'hpu__wcard-badge--excise',
      'additional_excise': 'hpu__wcard-badge--excise',
      'education_cess': 'hpu__wcard-badge--cess',
      'hologram': 'hpu__wcard-badge--hologram',
      'security_deposit': 'hpu__wcard-badge--security',
      'license_fee': 'hpu__wcard-badge--fee'
    };
    return map[key] || 'hpu__wcard-badge--default';
  }
}
