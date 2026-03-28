import { Component, OnDestroy, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MaterialModule } from '../../../shared/material.module';
import { LicenseApplicationService } from '../../../core/services/license-application.service';

type FinalLicenseTemplateData = {
  licenseNumber: string;
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

  readonly terms = [
    'The License shall remain valid from the period shown on this License.',
    'The licensee shall sell Liquor during the strength of this license. The procurement of Liquor shall be made only from the sources authorized by the Commissioner of Excise.',
    'The licensee shall operate the sale of Liquor only from the licensed premises for which the License is granted.',
    'The licensee shall not allow any person to sell Liquor under this License, unless the name of such person has been registered as Salesman with the Department.',
    'The licensee shall sell only those brands of Liquor which are Registered with the Department.',
    'That no Liquor shall be sold to any person below the age of 18 years or to School or College students or Army or Police personnel in uniform.',
    'The consumption of liquor in the licensed premises shall not be allowed.',
    'That the licensee shall not open his shop, nor shall effect sales therein before 7 am in Summer and Winter and shall not keep open the shop nor shall effect sale therein after 9 pm in Winter and 10 pm in Summer.',
    'The licensee shall not permit drunkenness, rioting or gambling in the shop.',
    'The licensee shall not during the hours in which his licensed premises is kept open, employ or permit to be employed in the Licensed premises, whether with or without remuneration, a women to assist him in the conduct of such business in any capacity whatsoever.',
    'The licensee shall affix inside his Licensed Premises a Signboard having the following inscription in English languages with size of 2 feet by 4 feet along with copy of this Licence.'
  ];

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

    const appType = (this.queryAppType() || '').toLowerCase();
    const req$ =
      appType === 'new-license'
        ? this.licenseAppService.getNewFinalLicenseData(applicationId)
        : this.licenseAppService.getOldFinalLicenseData(applicationId);

    req$.subscribe({
      next: (data: Partial<FinalLicenseTemplateData> | any) => {
        this.templateData.update(current => ({
          ...current,
          licenseNumber: String(data?.licenseNumber || data?.license_id || current.licenseNumber || applicationId),
          licenseeName: String(data?.licenseeName || current.licenseeName || ''),
          fatherOrHusbandName: String(data?.fatherOrHusbandName || current.fatherOrHusbandName || ''),
          kindOfShop: String(data?.kindOfShop || current.kindOfShop || ''),
          addressOfBusiness: String(data?.addressOfBusiness || current.addressOfBusiness || ''),
          district: String(data?.district || current.district || ''),
          modeOfOperation: String(data?.modeOfOperation || current.modeOfOperation || ''),
          passportPhotoUrl: String(data?.passportPhotoUrl || current.passportPhotoUrl || ''),
          licenseFee: String(data?.licenseFee || current.licenseFee || ''),
          transactionRef: String(data?.transactionRef || current.transactionRef || ''),
          transactionDate: String(data?.transactionDate || current.transactionDate || ''),
          validFrom: String(data?.validFrom || current.validFrom || ''),
          validTo: String(data?.validTo || current.validTo || ''),
          generatedOn: String(data?.generatedOn || current.generatedOn || '')
        }));
        this.loadPassportPhoto();
        this.loadQrCode();
        this.loading.set(false);
      },
      error: (err: any) => {
        const msg = err?.error?.detail || err?.error?.error || err?.message || 'Failed to load license details.';
        this.error.set(String(msg));
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
      },
      error: () => {
        this.templateData.update(current => ({ ...current, passportPhotoUrl: '' }));
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
      },
      error: () => {
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
