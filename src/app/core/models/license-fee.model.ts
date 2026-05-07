export interface LicenseFee {
  id: number;
  // snake_case (original interface)
  license_category?: number;
  license_category_name?: string;
  license_subcategory?: number;
  license_subcategory_name?: string;
  location_code?: number;
  location_description?: string;
  district_name?: string;
  license_fee?: number | string;
  security_amount?: number | string;
  renewal_amount?: number | string;
  late_fee?: number | string;
  is_active?: boolean;
  created_by?: number;
  created_by_username?: string;
  operation_date?: string;
  // camelCase (returned by DRF camelCase renderer)
  licenseCategory?: number;
  licenseCategoryName?: string;
  licenseSubcategory?: number;
  licenseSubcategoryName?: string;
  locationCode?: number;
  locationDescription?: string;
  districtName?: string;
  licenseFee?: number | string;
  securityAmount?: number | string;
  renewalAmount?: number | string;
  lateFee?: number | string;
  isActive?: boolean;
  createdBy?: number;
  createdByUsername?: string;
  operationDate?: string;
}