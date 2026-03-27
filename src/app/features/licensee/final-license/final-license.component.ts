import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MaterialModule } from '../../../shared/material.module';

type FinalLicenseTemplateData = {
  licenseNumber: string;
  licenseeName: string;
  fatherOrHusbandName: string;
  kindOfShop: string;
  addressOfBusiness: string;
  district: string;
  modeOfOperation: string;
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
export class FinalLicenseComponent {
  private readonly queryAppId = signal<string>('');
  private readonly queryAppType = signal<string>('');
  private readonly returnUrl = signal<string>('');

  readonly templateData = computed<FinalLicenseTemplateData>(() => ({
    licenseNumber: this.queryAppId() || '03/2022/0038',
    licenseeName: 'CHANDA LIMBOO',
    fatherOrHusbandName: 'KASHI RAJ LIMBOO',
    kindOfShop: 'Foreign Liquor Retail Shop',
    addressOfBusiness:
      'TINGZEY, Pin - 737116, P.S - Mangan P.S., Sub Division - Mangan, Block - Mangan, GPU - Manganthak, W.4, Tingzey',
    district: 'Mangan',
    modeOfOperation: 'Self',
    licenseFee: 'Rs. 5,000/-',
    transactionRef: 'W/2025/000000037505',
    transactionDate: '20/03/2025',
    validFrom: '01/04/2025',
    validTo: '20/03/2026',
    generatedOn: '17/03/2026'
  }));

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
    private readonly router: Router
  ) {
    this.route.queryParamMap.subscribe(params => {
      this.queryAppId.set(params.get('applicationId') || '');
      this.queryAppType.set(params.get('type') || '');
      this.returnUrl.set(params.get('returnUrl') || '');
    });
  }

  get requestedFor(): string {
    const appType = this.queryAppType();
    if (!appType) return 'license-renewal';
    return appType;
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
}
