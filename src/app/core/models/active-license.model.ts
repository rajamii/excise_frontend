export interface ActiveLicense {
  id: string;
  licenseeId: string;
  establishmentName: string;
  license_category?: string;
  district?: string;
  district_code?: string;
  valid_up_to?: string;
  mode_of_operation?: string;
}

