export interface CompanyCollaborationMember {
  member_name: string;
  designation?: string;
  member_address?: string;
  contact_number?: string;
  email?: string;
}

export interface CompanyCollaborationBrandOwner {
  id: number | string;
  brand_owner_code: string;
  company_name: string;
  company_address?: string;
  location?: string;
  status?: string;
  brand_count?: number;
  pan_no?: string;
  office_address?: string;
  factory_address?: string;
  mobile?: string;
  email?: string;
  members?: CompanyCollaborationMember[];
}

export interface CompanyCollaborationBrand {
  id: number;
  brand_code: string;
  brand_name: string;
  category: string;
  type: string;
  strength: number;
  sizes: string[];
  brand_owner_code?: string;
  status?: string;
  kind?: string;
  selectedSizes?: string[];
}

export interface CompanyCollaborationBottlerDetails {
  financialYear: string;
  brandOwner: string | number;
  brandOwnerCode?: string;
  brandOwnerName?: string;
  brandOwnerAddress?: string;
  brandOwnerPan?: string;
  brandOwnerOfficeAddress?: string;
  brandOwnerFactoryAddress?: string;
  brandOwnerMobile?: string;
  brandOwnerEmail?: string;
  brandOwnerMembers?: CompanyCollaborationMember[];
}

export interface CompanyCollaborationCompanyDetails {
  financialYear?: string;
  applicationDate?: string;
  applicationId?: string;
  bottlerId?: string | number;
  bottlerName?: string;
  bottlerAddress?: string;
  licenseeName?: string;
  licenseeAddress?: string;
  contactPerson?: string;
  contactNumber?: string;
  emailAddress?: string;
  licenseNumber?: string;
  licenseType?: string;
  establishmentType?: string;
  businessRegNumber?: string;
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

