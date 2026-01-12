import { Transaction, Objection } from './license-application.model';

export type ApplicationType = 'existing' | 'new';

export interface UnifiedApplication {
  applicationId: string;
  applicationType: ApplicationType;

  // Workflow
  currentStage: string;
  currentStageName?: string;
  isApproved: boolean;

  // Display fields (filled from either model)
  licenseTypeName?: string;
  licenseCategoryName?: string;
  licenseSubCategoryName?: string;
  establishmentName: string;

  applicantName?: string;
  memberName?: string;
  fatherHusbandName?: string;
  dob?: string;
  gender?: string;

  mobileNumber: string | number;
  email: string;

  siteDistrictName?: string;
  siteSubdivisionName?: string;
  policeStationName?: string;
  pinCode?: string | number;

  // Only exists in old license app
  siteEnquiry?: any;

  // Keep raw response for forms / special handling
  raw: any;

  // Relations
  transactions: Transaction[];
  objections: Objection[];
}