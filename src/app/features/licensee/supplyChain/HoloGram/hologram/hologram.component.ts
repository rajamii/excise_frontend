import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

interface HologramFormData {
  refNo: string;
  date: string;
  companyName: string;
  localQtyLakh: number | null;
  exportQtyLakh: number | null;
  defenceQtyLakh: number | null;
}

@Component({
  selector: 'app-hologram',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hologram.component.html',
  styleUrls: ['./hologram.component.scss']
})
export class HologramComponent {
  Math = Math;
  currentYear = new Date().getFullYear();
  errorMessage = '';
  showPreview = false;
  submittedData?: HologramFormData;

  formData: HologramFormData = {
    refNo: '',
    date: '',
    companyName: 'Yuksom Breweries Ltd.',
    // Prefill sample data so the user can see how inputs look
    localQtyLakh: 15,
    exportQtyLakh: 0,
    defenceQtyLakh: 0
  };

  private isBrowser = false;

  constructor(private router: Router, private route: ActivatedRoute, @Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    const today = new Date();
    this.formData.date = today.toISOString().split('T')[0];
    this.generateRefNumber();
    // If a ref is provided, load and show its preview
    if (this.isBrowser) {
      const ref = this.route.snapshot.queryParamMap.get('ref');
      if (ref) {
        const list: HologramFormData[] = JSON.parse(localStorage.getItem('hologramRequests') || '[]');
        const found = list.find(r => r.refNo === ref);
        if (found) {
          this.submittedData = found;
          this.showPreview = true;
          setTimeout(() => {
            document.getElementById('hologramPrintSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 25);
        }
      }
    }
  }

  generateRefNumber(): void {
    const seq = this.getNextSequenceNumber();
    const yy = String(new Date().getFullYear()).slice(-2);
    // Sequential reference number starting at 1, not incremented until submit
    this.formData.refNo = `YB/${seq}/BREW/${yy}`;
  }

  private getNextSequenceNumber(): number {
    const key = 'hologramRefSeqNext';
    const raw = this.isBrowser ? localStorage.getItem(key) : null;
    const parsed = raw ? parseInt(raw, 10) : 1;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }

  private incrementSequenceNumber(): void {
    if (!this.isBrowser) return;
    const key = 'hologramRefSeqNext';
    const curr = this.getNextSequenceNumber();
    localStorage.setItem(key, String(curr + 1));
  }

  clearForm(): void {
    // Reset fields without advancing sequence; regenerate current next ref no
    const today = new Date();
    this.formData = {
      refNo: '',
      date: today.toISOString().split('T')[0],
      companyName: this.formData.companyName || 'Yuksom Breweries Ltd.',
      localQtyLakh: null,
      exportQtyLakh: null,
      defenceQtyLakh: null
    };
    this.generateRefNumber();
    this.errorMessage = '';
    this.showPreview = false;
    this.submittedData = undefined;
  }

  get totalQtyLakh(): number {
    const l = this.formData.localQtyLakh || 0;
    const e = this.formData.exportQtyLakh || 0;
    const d = this.formData.defenceQtyLakh || 0;
    return l + e + d;
  }

  validateForm(): boolean {
    if (!this.formData.date) {
      this.errorMessage = 'Please select date';
      return false;
    }
    if (!this.formData.companyName?.trim()) {
      this.errorMessage = 'Please enter company name';
      return false;
    }
    if (!this.formData.localQtyLakh && !this.formData.exportQtyLakh && !this.formData.defenceQtyLakh) {
      this.errorMessage = 'Enter at least one quantity (in lakh)';
      return false;
    }
    this.errorMessage = '';
    return true;
  }

  saveDraft(): void {
    alert('Draft saved (frontend only).');
  }

  submitForm(): void {
    if (!this.validateForm()) {
      return;
    }
    // Ask for confirmation / declaration before forwarding
    const confirmed = window.confirm('Declaration: After you click OK, this letter will be forwarded to the Commissioner. Do you want to proceed?');
    if (!confirmed) {
      return;
    }
    // Lock the submitted data for preview/print and mark as submitted
    this.submittedData = { ...this.formData };
    this.showPreview = true;
    // Persist to list as forwarded
    if (this.isBrowser) {
      const key = 'hologramRequests';
      const list: HologramFormData[] = JSON.parse(localStorage.getItem(key) || '[]');
      list.unshift({ ...this.submittedData });
      localStorage.setItem(key, JSON.stringify(list));
    }
    // Scroll preview into view for user visibility
    setTimeout(() => {
      document.getElementById('hologramPrintSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 25);

    // Only after successful submit, advance the sequence for the next request
    this.incrementSequenceNumber();
    // Do not overwrite fields used in the preview; regenerate ref for next entry but
    // keep current input values visible until the user edits/clears
    this.formData.refNo = `YB/${this.getNextSequenceNumber()}/BREW/${String(new Date().getFullYear()).slice(-2)}`;

    // Show success message
    alert('Hologram requisition submitted successfully! You can now view and print the letter below.');
  }

  openPrintPreview(): void {
    const printable = document.getElementById('hologramPrintSection')?.innerHTML || '';
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => (el as HTMLElement).outerHTML)
      .join('');
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) return;
    win.document.open();
    const ref = this.submittedData?.refNo || this.formData.refNo;
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>Hologram Requisition - ${ref}</title>
          ${styles}
          <style>
            @page { size: A4; margin: 12mm; }
            body { background: #fff; }
            .no-print { display:none !important; }
            .printable-content, .printable-content * { visibility: visible !important; }
          </style>
        </head>
        <body>
          ${printable}
        </body>
      </html>`);
    win.document.close();
    win.onload = () => {
      win.focus();
      win.print();
      win.close();
    };
  }

  goBack(): void {
    this.router.navigate(['/dev-supply-chain']);
  }
}
