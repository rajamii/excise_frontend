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

  resetForm(): void {
    this.cartons = [];
    this.selectedEstablishment = null;
    this.saveSuccess = false;
    this.saveError = '';
  }
}
