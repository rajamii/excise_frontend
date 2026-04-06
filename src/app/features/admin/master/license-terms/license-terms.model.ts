export interface LicenseFormTermRow {
  id: number;
  licensee_cat_code: number;
  licensee_scat_code: number;
  sl_no: number;
  license_terms: string;
}

export interface LicenseFormTermsResponse {
  licensee_cat_code: number;
  licensee_scat_code: number;
  terms: LicenseFormTermRow[];
}

