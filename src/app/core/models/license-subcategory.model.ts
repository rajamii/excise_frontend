export interface LicenseSubcategory {
  id?: number;
  description?: string;
  category?: number;      // category id from backend
  categoryName?: string;  // category name from backend
  dryDayFeeType?: string | null;   // camelCase — djangorestframework_camel_case converts dry_day_fee_type
  dry_day_fee_type?: string | null; // snake_case fallback for payloads
}
