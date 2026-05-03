// ================================================================================================
// FILE: core/models/license-application.model.ts
// COMPLETE CORRECTED VERSION
// ================================================================================================

/**
 * Main License Application interface
 * Note: Backend uses snake_case, so we define properties accordingly
 */
export interface LicenseApplication {
  // Primary identifier - MUST match backend field name
  application_id: string;

  // Application basic info
  license?: string;
  licenseName?: string;
  license_type?: string;
  licenseTypeName?: string;
  license_category?: number;
  licenseCategoryName?: string;
  license_sub_category?: number;
  licenseSubCategoryName?: string;
  establishment?: string;
  establishment_name?: string;
  site_type?: string;
  existing_site_license?: string;

  // Contact information
  mobile_number?: string;
  email?: string;

  // License details
  license_no?: string;
  initial_grant_date?: string;
  renewed_from?: string;
  valid_up_to?: string;
  yearly_license_fee?: number;
  license_nature?: string;
  functioning_status?: string;
  mode_of_operation?: string;

  // Location information
  excise_district?: number;
  excise_district_name?: string;
  excise_subdivision?: number;
  excise_subdivision_name?: string;
  site_subdivision?: string;
  police_station?: number;
  police_station_name?: string;
  location_category?: string;
  location_name?: string;
  ward_name?: string;
  business_address?: string;
  road_name?: string;
  pin_code?: string;
  latitude?: string;
  longitude?: string;

  // Company/Unit details
  company_name?: string;
  company_address?: string;
  company_pan?: string;
  company_cin?: string;
  incorporation_date?: string;
  company_phone_number?: string;
  company_email?: string;

  // Member details
  status?: string;
  member_name?: string;
  aadhaar?: string;
  sikkim_subject?: string | boolean;
  father_husband_name?: string;
  nationality?: string;
  gender?: string;
  pan?: string;
  member_mobile_number?: string;
  member_email?: string;
  photo?: string;

  // Applicant eligibility
  coi_rc_ss?: string;
  has_sikkim_certificate?: string;
  has_excise_license?: string;
  existing_license_category_id?: number | string;
  existing_license_no?: string;
  family_excise_license?: string;
  family_license_category_id?: number | string;
  family_license_no?: string;
  criminal_conviction?: string;
  marital_status?: string;
  residential_status?: string;
  present_address?: string;
  permanent_address?: string;

  // Workflow status
  current_stage?: string;
  current_stageName?: string;
  submitted_by?: string;
  submitted_byName?: string;

  // Timestamps
  created_at?: string;
  updated_at?: string;
  submitted_at?: string;

  // Additional metadata
  remarks?: string;
  fee_amount?: number;
  is_fee_calculated?: boolean;
  parcha?: string;
  trade_license?: string;
  trade_license_covered?: string;
  member_pass_photo?: string;
  member_aadhaar_card?: string;
  member_residential_certificate?: string;
  member_dob_proof?: string;

  // Additional properties from errors
  print_count?: number;
  transactions?: Transaction[];
}

/**
 * Transaction interface
 */
export interface Transaction {
  id?: number;
  application?: string;
  amount?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Objection interface
 */
export interface Objection {
  id?: number;
  application?: string;
  fieldName: string;
  remarks: string;
  raisedBy?: string;
  raisedByName?: string;
  raisedAt?: string;
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  resolvedByName?: string;
}

/**
 * Application Movement/History interface
 */
export interface ApplicationMovement {
  id?: number;
  application?: string;
  from_stage?: string;
  from_stageName?: string;
  to_stage?: string;
  to_stageName?: string;
  moved_by?: string;
  moved_byName?: string;
  moved_at?: string;
  remarks?: string;
  action?: string;
}

/**
 * Dashboard Statistics interface
 */
export interface DashboardStats {
  pending: number;
  approved: number;
  rejected: number;
  under_review: number;
  total: number;
}

/**
 * Application Filter interface
 */
export interface ApplicationFilter {
  application_id?: string;
  licenseType?: string;
  exciseDistrict?: number;
  exciseSubdivision?: number;
  current_stage?: string;
  submitted_by?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

/**
 * Utility type for handling field name variations
 * Use this when you're unsure which naming convention the data uses
 */
export type FlexibleLicenseApplication = LicenseApplication & {
  // Camel case alternatives (in case backend changes)
  applicationId?: string;
  id?: string;
  app_id?: string;
};

/**
 * Helper function to safely get application ID from any naming variation
 * @param app - Application object that might use different field names
 * @returns The application ID or undefined
 */
export function getApplicationId(app: any): string | undefined {
  return app?.application_id ||
    app?.applicationId ||
    app?.id ||
    app?.app_id;
}

/**
 * Helper function to check if an application has a valid ID
 * @param app - Application object to check
 * @returns true if application has a valid ID
 */
export function hasValidApplicationId(app: any): boolean {
  const id = getApplicationId(app);
  return !!id && id !== 'undefined' && id !== 'null';
}

/**
 * Type guard to check if an object is a valid LicenseApplication
 * @param obj - Object to check
 * @returns true if object is a valid LicenseApplication
 */
export function isLicenseApplication(obj: any): obj is LicenseApplication {
  return obj && hasValidApplicationId(obj);
}
