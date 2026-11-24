// district.model.ts
export class District {
  id?: number;
  config_id?: number;
  district!: string;
  district_name?: string;
  districtName?: string;
  districtCode!: number;  // 🔴 This is a number (e.g., 101)
  district_code?: number;
  stateCode!: number;
  state!: string;
  isActive!: boolean;
  multiple_site_enquiry?: boolean;
  multipleSiteEnquiry?: boolean;
  site_enquiry_officers_count?: number;
  siteEnquiryOfficersCount?: number;
  officers_count?: number;
  site_enquiry_officers?: any[];
  siteEnquiryOfficers?: any[];
  officers?: any[];
}