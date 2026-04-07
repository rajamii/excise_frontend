import { Component, OnDestroy, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MaterialModule } from '../../../shared/material.module';
import { LicenseApplicationService } from '../../../core/services/license-application.service';
import { catchError, firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

type FinalLicenseTemplateData = {
  licenseNumber: string;
  licenseTitle?: string;
  licenseeName: string;
  fatherOrHusbandName: string;
  kindOfShop: string;
  addressOfBusiness: string;
  district: string;
  modeOfOperation: string;
  passportPhotoUrl: string;
  licenseFee: string;
  transactionRef: string;
  transactionDate: string;
  validFrom: string;
  validTo: string;
  generatedOn: string;
};

type TermsPage = {
  start: number;
  items: string[];
};

@Component({
  selector: 'app-final-license',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './final-license.component.html',
  styleUrl: './final-license.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class FinalLicenseComponent implements OnDestroy {
  private readonly queryAppId = signal<string>('');
  private readonly queryAppType = signal<string>('');
  private readonly returnUrl = signal<string>('');

  readonly loading = signal<boolean>(false);
  readonly error = signal<string>('');
  readonly qrCodeUrl = signal<string>('');
  readonly photoStatus = signal<string>('');
  readonly qrStatus = signal<string>('');
  readonly licenseTitle = signal<string>('');
  readonly validationCode = signal<string>('');
  readonly validatedViaCode = signal<boolean>(false);
  readonly validationPdfUrl = signal<string>('');
  readonly terms = signal<string[]>([]);
  readonly termsPages = signal<TermsPage[]>([{ start: 1, items: [] }]);
  readonly commSignOk = signal<boolean>(true);
  readonly commSignUrl = 'assets/comm_sign.jpg';
  readonly printing = signal<boolean>(false);

  private readonly resolvedApiType = signal<'new-license' | 'license-renewal' | ''>('');

  private passportObjectUrl: string | null = null;
  private qrObjectUrl: string | null = null;
  private termsPaginating = false;

  readonly templateData = signal<FinalLicenseTemplateData>({
    licenseNumber: '',
    licenseeName: '',
    fatherOrHusbandName: '',
    kindOfShop: '',
    addressOfBusiness: '',
    district: '',
    modeOfOperation: '',
    passportPhotoUrl: '',
    licenseFee: '',
    transactionRef: '',
    transactionDate: '',
    validFrom: '',
    validTo: '',
    generatedOn: ''
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly licenseAppService: LicenseApplicationService
  ) {
    this.route.queryParamMap.subscribe(params => {
      const rawAppId = String(params.get('applicationId') || '').trim();
      const normalizedAppId = rawAppId.replace(/^\s*val\s*[:\-]?\s*/i, '').trim();
      this.queryAppId.set(normalizedAppId);

      const incomingType = String(params.get('type') || '').trim();
      const inferredType = this.inferApiTypeFromId(normalizedAppId);
      // If the URL has a mismatched type (common when passing NLI/.. with license-renewal),
      // prefer the inferred type so we hit the correct final-license endpoint.
      if (inferredType && incomingType && incomingType.toLowerCase() !== inferredType) {
        this.queryAppType.set(inferredType);
      } else if (inferredType && !incomingType) {
        this.queryAppType.set(inferredType);
      } else {
        this.queryAppType.set(incomingType);
      }
      this.returnUrl.set(params.get('returnUrl') || '');

      this.loadFinalLicense();
    });
  }

  private inferApiTypeFromId(applicationId: string): 'new-license' | 'license-renewal' | '' {
    const id = String(applicationId || '').trim().toUpperCase();
    if (!id) return '';

    // Application-id prefixes
    if (id.startsWith('NLI/')) return 'new-license';
    if (id.startsWith('LIC/')) return 'license-renewal';

    // License-id prefixes (sometimes used by mistake in the query param)
    if (id.startsWith('NA/')) return 'new-license';
    if (id.startsWith('LA/')) return 'license-renewal';

    return '';
  }

  get requestedFor(): string {
    const appType = this.queryAppType();
    if (!appType) return 'license-renewal';
    return appType;
  }

  private get isNewLicense(): boolean {
    const q = (this.queryAppType() || '').toLowerCase();
    if (q === 'new-license') return true;
    if (q) return false;
    return this.resolvedApiType() === 'new-license';
  }

  private loadFinalLicense(): void {
    const applicationId = this.queryAppId();
    if (!applicationId) return;

    this.loading.set(true);
    this.error.set('');
    this.licenseTitle.set('');
    this.validationCode.set('');
    this.validatedViaCode.set(false);
    this.validationPdfUrl.set('');
    this.terms.set([]);
    this.termsPages.set([{ start: 1, items: [] }]);

    const appType = (this.queryAppType() || '').toLowerCase();
    const newReq$ = this.licenseAppService.getNewFinalLicenseData(applicationId);
    const oldReq$ = this.licenseAppService.getOldFinalLicenseData(applicationId);

    let req$ = oldReq$;
    if (appType === 'new-license') {
      this.resolvedApiType.set('new-license');
      req$ = newReq$;
    } else if (appType) {
      this.resolvedApiType.set('license-renewal');
      req$ = oldReq$;
    } else {
      this.resolvedApiType.set('new-license');
      req$ = newReq$.pipe(
        catchError(() => {
          this.resolvedApiType.set('license-renewal');
          return oldReq$;
        })
      );
    }

    req$.subscribe({
      next: (data: Partial<FinalLicenseTemplateData> | any) => {
        this.licenseTitle.set(String(data?.licenseTitle || data?.license_title || ''));
        this.validationCode.set(String(data?.validationCode || data?.validation_code || ''));
        this.validatedViaCode.set(Boolean(data?.validatedViaCode || data?.validated_via_code));
        this.validationPdfUrl.set(String(data?.validationPdfUrl || data?.validation_pdf_url || ''));

        const incomingTerms = Array.isArray(data?.terms) ? data.terms : [];
        const normalizedTerms = incomingTerms
          .map((t: any) => String(t || '').trim())
          .filter((t: string) => !!t);
        this.terms.set(normalizedTerms);
        this.termsPages.set([{ start: 1, items: normalizedTerms }]);
        void this.paginateTermsToPages();

        this.templateData.update(current => ({
          ...current,
          licenseNumber: String(data?.licenseNumber || data?.license_id || current.licenseNumber || applicationId),
          licenseeName: String(data?.licenseeName || current.licenseeName || ''),
          fatherOrHusbandName: String(data?.fatherOrHusbandName || current.fatherOrHusbandName || ''),
          kindOfShop: String(data?.kindOfShop || current.kindOfShop || ''),
          addressOfBusiness: String(data?.addressOfBusiness || current.addressOfBusiness || ''),
          district: String(data?.district || current.district || ''),
          modeOfOperation: String(data?.modeOfOperation || current.modeOfOperation || ''),
          passportPhotoUrl: '',
          licenseFee: String(data?.licenseFee || current.licenseFee || ''),
          transactionRef: String(data?.transactionRef || current.transactionRef || ''),
          transactionDate: String(data?.transactionDate || current.transactionDate || ''),
          validFrom: String(data?.validFrom || current.validFrom || ''),
          validTo: String(data?.validTo || current.validTo || ''),
          generatedOn: String(data?.generatedOn || current.generatedOn || '')
        }));

        const embeddedQr = this.extractEmbeddedQrDataUrl(data);
        if (embeddedQr) {
          this.qrCodeUrl.set(embeddedQr);
          this.qrStatus.set('QR: embedded');
        } else {
          this.loadQrCode();
        }

        const embeddedPhoto = this.extractEmbeddedPhotoDataUrl(data);
        if (embeddedPhoto) {
          this.templateData.update(current => ({
            ...current,
            passportPhotoUrl: embeddedPhoto
          }));
          this.photoStatus.set('Photo: embedded');
        } else {
          this.photoStatus.set(data?.passportPhotoExists === false ? 'Photo: missing file' : '');
          this.loadPassportPhoto();
        }
        this.loading.set(false);
      },
      error: (err: any) => {
        const msg = err?.error?.detail || err?.error?.error || err?.message || 'Failed to load license details.';
        this.error.set(String(msg));
        this.licenseTitle.set('');
        this.validationCode.set('');
        this.validatedViaCode.set(false);
        this.validationPdfUrl.set('');
        this.terms.set([]);
        this.termsPages.set([{ start: 1, items: [] }]);
        this.loading.set(false);
      }
    });
  }

  private extractEmbeddedQrDataUrl(data: any): string {
    return String(data?.qrCodeDataUrl || data?.qr_code_data_url || '').trim();
  }

  private extractEmbeddedPhotoDataUrl(data: any): string {
    return String(data?.passportPhotoDataUrl || data?.passport_photo_data_url || '').trim();
  }

  downloadPdf(): void {
    const directUrl = (this.validationPdfUrl() || '').trim();
    if (directUrl) {
      window.location.href = directUrl;
      return;
    }
    const code = (this.validationCode() || '').trim();
    if (!code) return;
    const url = `${environment.apiBaseUrl}/transactional/validate/license/pdf/?code=${encodeURIComponent(code)}`;
    window.location.href = url;
  }

  onCommSignError(): void {
    this.commSignOk.set(false);
  }

  private loadPassportPhoto(): void {
    const applicationId = this.queryAppId();
    if (!applicationId) return;

    if (this.passportObjectUrl) {
      URL.revokeObjectURL(this.passportObjectUrl);
      this.passportObjectUrl = null;
    }

    const req$ = this.isNewLicense
      ? this.licenseAppService.getNewFinalLicensePassportPhoto(applicationId)
      : this.licenseAppService.getOldFinalLicensePassportPhoto(applicationId);

    req$.subscribe({
      next: (blob: Blob) => {
        this.passportObjectUrl = URL.createObjectURL(blob);
        this.templateData.update(current => ({
          ...current,
          passportPhotoUrl: this.passportObjectUrl || ''
        }));
        this.photoStatus.set('Photo: loaded');
      },
      error: (err: any) => {
        const status = err?.status ? `(${err.status})` : '';
        this.templateData.update(current => ({ ...current, passportPhotoUrl: '' }));
        this.photoStatus.update(s => s || `Photo: failed ${status}`.trim());
      }
    });
  }

  private loadQrCode(): void {
    void this.loadQrCodeAsync();
  }

  private async loadQrCodeAsync(): Promise<void> {
    const applicationId = this.queryAppId();
    if (!applicationId) return;

    if (this.qrObjectUrl) {
      URL.revokeObjectURL(this.qrObjectUrl);
      this.qrObjectUrl = null;
    }

    // Clear the previous (possibly revoked) object URL immediately so repeated prints
    // don't race and render a blank/broken QR in the print preview.
    this.qrCodeUrl.set('');
    this.qrStatus.set('QR: loading');

    const req$ = this.isNewLicense
      ? this.licenseAppService.getNewFinalLicenseQrCode(applicationId)
      : this.licenseAppService.getOldFinalLicenseQrCode(applicationId);

    try {
      const blob = await firstValueFrom(req$);
      this.qrObjectUrl = URL.createObjectURL(blob);
      this.qrCodeUrl.set(this.qrObjectUrl || '');
      this.qrStatus.set('QR: loaded');
    } catch (err: any) {
      const status = err?.status ? `(${err.status})` : '';
      this.qrStatus.set(`QR: failed ${status}`.trim());
      this.qrCodeUrl.set('');
    }
  }

  goBack(): void {
    const backTo = this.returnUrl();
    if (backTo) {
      this.router.navigateByUrl(backTo);
      return;
    }

    this.router.navigate(['/dashboard']);
  }

  print(): void {
    void this.printWithLoader();
  }

  private async rotateVerificationForPrint(): Promise<boolean> {
    const applicationId = this.queryAppId();
    if (!applicationId) return false;

    const req$ = this.isNewLicense
      ? this.licenseAppService.printNewLicense(applicationId)
      : this.licenseAppService.printLicense(applicationId);

    try {
      const resp: any = await firstValueFrom(req$);

      const newValidationCode = String(resp?.validationCode || resp?.validation_code || '').trim();
      const newValidationUrl = String(resp?.validationPdfUrl || resp?.validation_pdf_url || '').trim();
      if (newValidationCode) this.validationCode.set(newValidationCode);
      if (newValidationUrl) this.validationPdfUrl.set(newValidationUrl);

      // Prefer embedded QR from final-license payload (supports both camelCase/snake_case backends).
      // Fallback to the QR image endpoint if payload doesn't contain it.
      const refreshed = await this.refreshEmbeddedQrFromFinalLicense();
      if (!refreshed) {
        await this.loadQrCodeAsync();
      }
    } catch (err: any) {
      const msg = err?.error?.detail || err?.error?.error || err?.message || 'Failed to prepare print.';
      this.error.set(String(msg));
      // If printing is blocked by business rules (e.g. not approved yet),
      // still allow the user to open the browser print dialog for preview.
      if (Number(err?.status) === 403) {
        const low = String(msg || '').toLowerCase();
        if (low.includes('not approved') || low.includes('print limit') || low.includes('fee')) return false;
      }
      throw err;
    }

    return true;
  }

  private async refreshEmbeddedQrFromFinalLicense(): Promise<boolean> {
    const applicationId = this.queryAppId();
    if (!applicationId) return false;

    const req$ = this.isNewLicense
      ? this.licenseAppService.getNewFinalLicenseData(applicationId)
      : this.licenseAppService.getOldFinalLicenseData(applicationId);

    try {
      const data: any = await firstValueFrom(req$);
      const embeddedQr = this.extractEmbeddedQrDataUrl(data);
      if (!embeddedQr) return false;
      this.qrCodeUrl.set(embeddedQr);
      this.qrStatus.set('QR: embedded');
      return true;
    } catch {
      return false;
    }
  }

  private async waitForLicenseLoad(timeoutMs: number): Promise<void> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      if (!this.loading()) return;
      await new Promise(resolve => window.setTimeout(resolve, 120));
    }
  }

  private async printWithLoader(): Promise<void> {
    if (this.printing()) return;

    this.printing.set(true);
    document.body.classList.add('print-prep');

    const cleanup = () => {
      document.body.classList.remove('print-prep');
      window.removeEventListener('afterprint', cleanup);
      void this.paginateTermsToPages();
    };

    window.addEventListener('afterprint', cleanup);

    const failSafe = window.setTimeout(() => {
      this.printing.set(false);
      cleanup();
    }, 20000);

    try {
      // Try to rotate verification token for printing. If policy blocks it (403),
      // still proceed with printing a preview using the currently loaded QR/link.
      await this.rotateVerificationForPrint();

      await this.waitForNextFrame();
      await this.waitForNextFrame();
      await this.paginateTermsToPages();
      await this.waitForTemplateAssets(7000);
      await this.waitForAssets(7000);

      // Hide loader once everything is ready, then trigger print.
      this.printing.set(false);
      await this.waitForNextFrame();
      await this.waitForNextFrame();
      window.print();
    } finally {
      window.clearTimeout(failSafe);
    }
  }

  private async paginateTermsToPages(): Promise<void> {
    if (this.termsPaginating) return;
    this.termsPaginating = true;

    try {
      // Let Angular paint the terms once before we start measuring.
      await this.waitForNextFrame();
      await this.waitForNextFrame();

      let pages = this.normalizeTermsPages(this.termsPages());

      for (let guard = 0; guard < 800; guard++) {
        await this.waitForNextFrame();

        const pageEls = Array.from(document.querySelectorAll<HTMLElement>('section.page.terms-page'));
        if (!pageEls.length) break;

        let moved = false;

        for (let i = 0; i < pageEls.length; i++) {
          const el = pageEls[i];
          if (!pages[i]) pages[i] = { start: 1, items: [] };

          // Move terms to the next page until the current page fits.
          while (el.scrollHeight > el.clientHeight + 1 && pages[i].items.length > 0) {
            if (!pages[i + 1]) pages[i + 1] = { start: 1, items: [] };
            const last = pages[i].items.pop();
            if (!last) break;
            pages[i + 1].items.unshift(last);
            pages = this.normalizeTermsPages(pages);
            this.termsPages.set(pages);
            moved = true;
            await this.waitForNextFrame();
          }

          // If even with zero terms it overflows, there's nothing we can paginate here.
          if (el.scrollHeight > el.clientHeight + 1 && pages[i].items.length === 0) {
            break;
          }
        }

        if (!moved) break;
      }
    } finally {
      this.termsPaginating = false;
    }
  }

  private normalizeTermsPages(pages: TermsPage[]): TermsPage[] {
    const cleaned = pages.map(p => ({ start: 1, items: Array.isArray(p.items) ? [...p.items] : [] }));
    // Keep at least one page so the UI stays stable.
    const nonEmpty = cleaned.some(p => p.items.length) ? cleaned.filter(p => p.items.length) : [{ start: 1, items: [] }];

    let start = 1;
    return nonEmpty.map(p => {
      const out = { start, items: p.items };
      start += p.items.length;
      return out;
    });
  }

  private waitForNextFrame(): Promise<void> {
    return new Promise(resolve => window.requestAnimationFrame(() => resolve()));
  }

  private async waitForAssets(timeoutMs: number): Promise<void> {
    const timeout = new Promise<void>(resolve => window.setTimeout(resolve, timeoutMs));

    const fontReady = (document as any).fonts?.ready instanceof Promise ? (document as any).fonts.ready : Promise.resolve();

    const images = Array.from(document.querySelectorAll('img'));
    const imagePromises = images.map(img => {
      const anyImg = img as any;
      if (typeof anyImg.decode === 'function') {
        return anyImg.decode().catch(() => undefined);
      }

      if (img.complete) return Promise.resolve();

      return new Promise<void>(resolve => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      });
    });

    await Promise.race([Promise.all([fontReady, ...imagePromises]).then(() => undefined), timeout]);
  }

  private async waitForTemplateAssets(timeoutMs: number): Promise<void> {
    const startedAt = Date.now();

    const isQrReady = () => {
      const status = (this.qrStatus() || '').toLowerCase();
      return !!this.qrCodeUrl() || status.includes('loaded') || status.includes('embedded') || status.includes('failed');
    };

    const isPhotoReady = () => {
      const status = (this.photoStatus() || '').toLowerCase();
      return (
        !!this.templateData().passportPhotoUrl ||
        status.includes('loaded') ||
        status.includes('embedded') ||
        status.includes('missing') ||
        status.includes('failed')
      );
    };

    while (Date.now() - startedAt < timeoutMs) {
      if (!this.loading() && isQrReady() && isPhotoReady()) return;
      await new Promise(resolve => window.setTimeout(resolve, 120));
    }
  }

  ngOnDestroy(): void {
    if (this.passportObjectUrl) URL.revokeObjectURL(this.passportObjectUrl);
    if (this.qrObjectUrl) URL.revokeObjectURL(this.qrObjectUrl);
  }
}
