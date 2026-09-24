export interface LicenseSubcategory {
  id?: number;
  description?: string;
  category?: number;
  categoryName?: string;
  dryDayFeeType?: string | null;
  dry_day_fee_type?: string | null;
  isActive?: boolean;
  is_active?: boolean;
  allowCompanyRegistration?: boolean;
  allow_company_registration?: boolean;
  allowCompanyCollaboration?: boolean;
  allow_company_collaboration?: boolean;
  allowSalesmanBarman?: boolean;
  allow_salesman_barman?: boolean;
  allowLabelRegistration?: boolean;
  allow_label_registration?: boolean;
}
