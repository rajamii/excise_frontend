import { Component, OnDestroy, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MaterialModule } from '../../../shared/material.module';
import { LicenseApplicationService } from '../../../core/services/license-application.service';

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
  readonly terms = signal<string[]>([]);

  readonly termsFirstPage = signal<string[]>([]);
  readonly termsRemaining = signal<string[]>([]);

  private passportObjectUrl: string | null = null;
  private qrObjectUrl: string | null = null;

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
      this.queryAppId.set(params.get('applicationId') || '');
      this.queryAppType.set(params.get('type') || '');
      this.returnUrl.set(params.get('returnUrl') || '');

      this.loadFinalLicense();
    });
  }

  get requestedFor(): string {
    const appType = this.queryAppType();
    if (!appType) return 'license-renewal';
    return appType;
  }

  private loadFinalLicense(): void {
    const applicationId = this.queryAppId();
    if (!applicationId) return;

    this.loading.set(true);
    this.error.set('');
    this.licenseTitle.set('');
    this.terms.set([]);
    this.termsFirstPage.set([]);
    this.termsRemaining.set([]);

    const appType = (this.queryAppType() || '').toLowerCase();
    const req$ =
      appType === 'new-license'
        ? this.licenseAppService.getNewFinalLicenseData(applicationId)
        : this.licenseAppService.getOldFinalLicenseData(applicationId);

    req$.subscribe({
      next: (data: Partial<FinalLicenseTemplateData> | any) => {
        this.licenseTitle.set(String(data?.licenseTitle || data?.license_title || ''));

        const incomingTerms = Array.isArray(data?.terms) ? data.terms : [];
        const normalizedTerms = incomingTerms
          .map((t: any) => String(t || '').trim())
          .filter((t: string) => !!t);
        this.terms.set(normalizedTerms);
        this.termsFirstPage.set(normalizedTerms.slice(0, 11));
        this.termsRemaining.set(normalizedTerms.slice(11));

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

        if (data?.qrCodeDataUrl) {
          this.qrCodeUrl.set(String(data.qrCodeDataUrl));
          this.qrStatus.set('QR: embedded');
        } else {
          this.loadQrCode();
        }

        if (data?.passportPhotoDataUrl) {
          this.templateData.update(current => ({
            ...current,
            passportPhotoUrl: String(data.passportPhotoDataUrl)
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
        this.terms.set([]);
        this.termsFirstPage.set([]);
        this.termsRemaining.set([]);
        this.loading.set(false);
      }
    });
  }

  private loadPassportPhoto(): void {
    const applicationId = this.queryAppId();
    if (!applicationId) return;

    if (this.passportObjectUrl) {
      URL.revokeObjectURL(this.passportObjectUrl);
      this.passportObjectUrl = null;
    }

    const appType = (this.queryAppType() || '').toLowerCase();
    const req$ =
      appType === 'new-license'
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
    const applicationId = this.queryAppId();
    if (!applicationId) return;

    if (this.qrObjectUrl) {
      URL.revokeObjectURL(this.qrObjectUrl);
      this.qrObjectUrl = null;
    }

    const appType = (this.queryAppType() || '').toLowerCase();
    const req$ =
      appType === 'new-license'
        ? this.licenseAppService.getNewFinalLicenseQrCode(applicationId)
        : this.licenseAppService.getOldFinalLicenseQrCode(applicationId);

    req$.subscribe({
      next: (blob: Blob) => {
        this.qrObjectUrl = URL.createObjectURL(blob);
        this.qrCodeUrl.set(this.qrObjectUrl || '');
        this.qrStatus.set('QR: loaded');
      },
      error: (err: any) => {
        const status = err?.status ? `(${err.status})` : '';
        this.qrStatus.set(`QR: failed ${status}`.trim());
        this.qrCodeUrl.set('');
      }
    });
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
    window.print();
  }

  ngOnDestroy(): void {
    if (this.passportObjectUrl) URL.revokeObjectURL(this.passportObjectUrl);
    if (this.qrObjectUrl) URL.revokeObjectURL(this.qrObjectUrl);
  }
}
