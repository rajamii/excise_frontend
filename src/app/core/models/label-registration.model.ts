export interface LabelRegistrationLicenseeDetails {
  applicationYear: string;
  licenseeName: string;
  licenseNumber: string;
  licenseType: string;
  establishmentName: string;
  contactPerson: string;
  contactNumber: string;
  emailAddress: string;
  premisesAddress: string;
}

export interface LabelRegistrationProductDetails {
  brandName: string;
  labelName: string;
  liquorCategory: string;
  labelType: string;
  abvStrength: number;
  netContentMl: number;
  originState: string;
  ingredients: string;
  declarationText: string;
  barcode: string;
  shelfLifeMonths: number;
}

export interface LabelRegistrationPackagingItem {
  sizeMl: number;
  packagingType: string;
  unitsPerCase: number;
  mrp: number;
}

export interface LabelRegistrationPackagingDetails {
  packagingRows: LabelRegistrationPackagingItem[];
  marketDistricts: string[];
  proposedLaunchDate: string;
  annualProjectedSales: number;
  remarks?: string;
}

export interface LabelRegistrationDocuments {
  undertaking: File;
  brandAuthorization: File;
  labelArtworkFront: File;
  labelArtworkBack?: File;
  labAnalysisReport: File;
  trademarkCertificate?: File;
}

export interface LabelRegistrationSubmission {
  applicationId: string;
  status: string;
  submittedAt: string;
  mode: 'online' | 'local';
}
