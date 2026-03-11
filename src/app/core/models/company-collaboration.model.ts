// ─── Company Member (shown in Company step table) ────────────────────────────
export interface CompanyCollaborationMember {
  member_name: string;
  designation: string;
  member_address: string;
  contact_number: string;
  email: string;
}

// ─── Brand Owner (Collaborating Company) ─────────────────────────────────────
export interface CompanyCollaborationBrandOwner {
  id: string | number;
  brand_owner_code: string;
  company_name: string;
  pan_no: string;
  office_address: string;
  factory_address: string;
  mobile: string;
  email: string;
  location: string;
  status: string;
  brand_count?: number;
  members: CompanyCollaborationMember[];
}

// ─── Brand ───────────────────────────────────────────────────────────────────
export interface CompanyCollaborationBrand {
  id: string | number;
  brand_code: string;
  brand_name: string;
  category: string;
  kind?: string;
  type: string;
  strength: number | null;
  sizes: string[];
  /** Only the pack sizes the user actually checked during brand selection. */
  selectedSizes?: string[];
  brand_owner_code?: string;
  status?: string;
}

// ─── Step 1: Bottler Details (licensee / distillery — auto-fetched) ───────────
// Stored under COMPANY_COLLAB_STORAGE_KEYS.companyDetails
export interface CompanyCollaborationCompanyDetails {
  financialYear: string;       // auto-computed, read-only
  applicationId: string;       // "NEW" until submitted, read-only
  applicationDate: string;     // today's date, read-only
  bottlerId: string | number;  // selected from dropdown
  bottlerName: string;         // auto-filled
  bottlerAddress: string;      // auto-filled
}

// ─── Step 2: Collaborating Company Details ────────────────────────────────────
// Stored under COMPANY_COLLAB_STORAGE_KEYS.bottlerDetails
export interface CompanyCollaborationBottlerDetails {
  financialYear: string;
  brandOwner: string | number;
  brandOwnerCode: string;
  brandOwnerName: string;
  brandOwnerPan: string;
  brandOwnerOfficeAddress: string;
  brandOwnerFactoryAddress: string;
  brandOwnerMobile: string;
  brandOwnerEmail: string;
  brandOwnerMembers: CompanyCollaborationMember[];
}

// ─── Fee Structure ────────────────────────────────────────────────────────────
export interface CompanyCollaborationFeeStructure {
  applicationFee: number;
  collaborationFee: number;
  securityDeposit: number;
}

// ─── Overview / Submission ────────────────────────────────────────────────────
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

// ─── Session Storage Keys ─────────────────────────────────────────────────────
export const COMPANY_COLLAB_STORAGE_KEYS = {
  bottlerDetails:   'companyCollabBottlerDetails',   // Step 2 – Company
  companyDetails:   'companyCollabCompanyDetails',   // Step 1 – Bottler
  selectedBrandIds: 'companyCollabSelectedBrandIds',
  selectedBrands:   'companyCollabSelectedBrands',
  feeStructure:     'companyCollabFeeStructure',
  overviewSummary:  'companyCollabOverviewSummary',
  submission:       'companyCollabSubmission'
} as const;
