// license.model.ts - Licensee Interface
// 🔴 CRITICAL: Backend actually returns camelCase (from your logs)
// But keeping snake_case aliases for compatibility

export interface Licensee {
  // Primary identifiers (backend returns camelCase)
  id: string;                      // "LIC/101/2025-26/0001"
  licenseeId?: string;             // Backend returns this in camelCase
  licensee_id?: string;            // Keep for compatibility
  
  // Establishment details
  establishmentName?: string;      // Backend returns camelCase
  establishment_name?: string;     // Keep for compatibility
  
  // Category and location
  licenseCategory?: string;        // Backend returns camelCase
  license_category?: string;       // Keep for compatibility
  
  district?: string;               // Both versions
  districtCode?: number;           // Backend returns camelCase  
  district_code?: number;          // Keep for compatibility
  
  status?: string;
}

export class License {
  // select license
  application_id!: string;
  exciseDistrict!: string;
  licenseCategory!: string;
  exciseSubDivision!: string;
  license!: string;

  // key info
  licenseType!: string;  
  establishmentName!: string;
  mobileNumber!: number;
  emailId!: string;
  licenseNo?: number;
  initialGrantDate?: string;
  renewedFrom?: string;
  validUpTo?: string;
  yearlyLicenseFee?: string;
  licenseNature!: string;
  functioningStatus!: string;
  modeofOperation!: string;  

  // address
  siteSubDivision!: string;
  policeStation!: string;
  locationCategory!: string;
  locationName!: string;
  wardName!: string;
  businessAddress!: string;
  roadName!: string;
  pinCode!: number;
  latitude?: string;
  longitude?: string;

  // unit details (only if licenseType = 'Company')
  companyName!: string;
  companyAddress!: string;
  companyPan!: string;
  companyCin!: string;
  incorporationDate!: string;
  companyPhoneNumber!: number;
  companyEmailId!: string;

  // member details
  status!: string;
  memberName!: string;
  fatherHusbandName!: string;
  nationality!: string;
  gender!: string;
  pan!: number;
  memberMobileNumber!: number;
  memberEmailId!: string;

  // document
  photo!: File;

  print_count?: number;
}