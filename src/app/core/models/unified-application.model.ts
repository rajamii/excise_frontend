export interface UnifiedApplication {
  type: 'license-renewal' | 'new-license' | 'salesman-barman' | 'company-registration' | 'label-registration' | 'special-permit';
  applicationId: string;
  currentStage: string;
  currentStageName?: string;
  isApproved: boolean;

  establishmentName?: string | null;
  applicantFullName: string;
  mobileNumber?: string | number;
  email?: string;
  licenseCategoryName?: string;
  siteDistrictName?: string;

  transactions: any[];
  raw: any; // full original object
}
