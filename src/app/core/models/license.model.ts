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

export interface Licensee {
  id: string;                // license_id
  licensee_id: string;       // same as id – keep for backward compat
  establishment_name: string;
  license_category: string;  // "Individual", "Company", …
  district: string;
  district_code: number;     // NOTE: number, not string
  status: string;
}
