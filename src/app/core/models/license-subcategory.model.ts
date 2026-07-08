export interface LicenseSubcategory {
  id?: number;
  description?: string;
  category?: number;      // category id from backend
  categoryName?: string;  // category name from backend
  dry_day_fee_type?: string | null;
}
