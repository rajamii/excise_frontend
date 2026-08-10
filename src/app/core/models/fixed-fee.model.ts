export interface FixedFee {
  feeCode: string;
  feeDesc: string;
  amount: number | string;
  isActive?: boolean;
  createdDate?: string;
  modifiedDate?: string;

  // snake_case fallbacks if needed from DRF renderer mapping
  fee_code?: string;
  fee_desc?: string;

  licenseCategory?: number | null;
  licenseSubcategory?: number | null;
  mode?: string | null;
  feeType?: string | null;
  licenseCategoryName?: string;
  licenseSubcategoryName?: string;

  license_category?: number | null;
  license_subcategory?: number | null;
  fee_type?: string | null;
  license_category_name?: string;
  license_subcategory_name?: string;
}
