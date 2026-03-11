export interface CompanyCollaborationBrandOwner {
  id: string | number;
  brand_owner_code: string;
  company_name: string;
  company_address: string;
  location: string;
  status: string;
  brand_count?: number;
}

export interface CompanyCollaborationBrand {
  id: string | number;
  brand_code: string;
  brand_name: string;
  category: string;
  type: string;
  strength: number | null;
  sizes: string[];
  brand_owner_code?: string;
  status?: string;
}

export interface CompanyCollaborationBottlerDetails {
  financialYear: string;
  brandOwner: string | number;
  brandOwnerCode?: string;
  brandOwnerName?: string;
  brandOwnerAddress?: string;
}

export interface CompanyCollaborationCompanyDetails {
  licenseeName: string;
  licenseeAddress: string;
  contactPerson: string;
  contactNumber: string;
  emailAddress: string;
  licenseNumber: string;
  licenseType: string;
  establishmentType: string;
  businessRegNumber: string;
}

export interface CompanyCollaborationFeeStructure {
  applicationFee: number;
  collaborationFee: number;
  securityDeposit: number;
}

export interface CompanyCollaborationOverviewSummary {
  totalBrands: number;
  totalAmount: number;
  applicationDate: string;
  selectedBrands: CompanyCollaborationBrand[];
}

export interface CompanyCollaborationSubmission {
  applicationId: string;
  status: string;
  submittedAt: string;
  mode: 'online' | 'local';
  totalAmount: number;
  collaborationId?: string;
}

export const COMPANY_COLLAB_STORAGE_KEYS = {
  bottlerDetails: 'companyCollabBottlerDetails',
  companyDetails: 'companyCollabCompanyDetails',
  selectedBrandIds: 'companyCollabSelectedBrandIds',
  selectedBrands: 'companyCollabSelectedBrands',
  feeStructure: 'companyCollabFeeStructure',
  overviewSummary: 'companyCollabOverviewSummary',
  submission: 'companyCollabSubmission'
} as const;

