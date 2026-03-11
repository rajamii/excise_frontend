export interface LabelRegistrationLicenseeDetails {
  applicationYear: string;
  applicantType: string;
  liquorCategory: string;
  applicationDate: string;
  registrationValidFrom: string;
  registrationValidUpTo: string;
}

export interface LabelRegistrationProductDetails {
  // Manufacturer
  bottlerOrigin: string;
  bottlerState?: string;
  bottlerName: string;
  bottlerAddress: string;

  // Brand owner
  brandOwnerType: string;
  brandOwnerCode?: string;
  brandOwnerName: string;
  brandOwnerAddress: string;

  // Brand
  liquorKind: string;
  liquorType: string;
  brandCode?: string;
  brandName: string;

  // Strength
  allowedStrength: number;
  strengthValue: number;
  strengthUnit: string;
}

export interface LabelRegistrationPackagingItem {
  measureValueMl: number;
  packageType: string;
  purposeSale: string;
  bottlesPerCase: number;
  edpPerCase: number;
  mrpPerBottle: number;
  exciseDutyPerCase?: number;
  bottlingFeePerCase?: number;
  importPerCase?: number;
  exportPerCase?: number;
  mrpRange?: string;
}

export interface LabelRegistrationPackagingDetails {
  packagingRows: LabelRegistrationPackagingItem[];
}

export interface LabelRegistrationSubmission {
  applicationId: string;
  status: string;
  submittedAt: string;
  mode: 'online' | 'local';
}
