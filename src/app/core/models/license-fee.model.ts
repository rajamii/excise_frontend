export interface LicenseFee {
  id: number;
  license_category: number;
  license_category_name?: string;
  license_subcategory: number;
  license_subcategory_name?: string;
  location_code: number;
  location_description?: string;
  district_name?: string;
  license_fee: number;
  security_amount: number;
  renewal_amount: number;
  late_fee: number;
  is_active: boolean;
  created_by?: number;
  created_by_username?: string;
  operation_date?: string;
}