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
  owner_type?: string;
  brand_owner_licensee_id_no?: string;
  members?: CompanyCollaborationMember[];
}

export interface CompanyCollaborationBrand {
  id: number | string;
  brand_code: string;
  brand_name: string;
  category: string;
  kind?: string;
  type: string;
  brand_owner_code?: string;
  status?: string;
  // Raw FK IDs for reliable filtering
  liquorCatCode?: number;
  liquorKindId?: number;
  liquorTypeId?: number;
  pack_sizes?: { product_id: number; value: number; unit: string; label: string }[];
  selected_sizes?: string[]; // E.g., ['750 Ml', '375 Ml']
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
}

export interface LiquorCategory {
  liquorCatCode: number;
  liquorCatDesc: string;
  liquorCatAbbr: string;
}

export interface LiquorKind {
  id: number;
  liquorCatCode: number;
  liquorKindCode: number;
  liquorKindDesc: string;
  liquorKindAbbr: string;
}

export interface LiquorType {
  id: number;
  liquorCatCode: number;
  liquorKindId: number;
  liquorTypeCode: number;
  liquorTypeDesc: string;
}

export const COMPANY_COLLAB_STORAGE_KEYS = {  bottlerDetails: 'companyCollabBottlerDetails',
  companyDetails: 'companyCollabCompanyDetails',
  selectedBrandIds: 'companyCollabSelectedBrandIds',
  selectedBrands: 'companyCollabSelectedBrands',
  feeStructure: 'companyCollabFeeStructure',
  overviewSummary: 'companyCollabOverviewSummary',
  submission: 'companyCollabSubmission'
} as const;

