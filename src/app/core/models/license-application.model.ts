export class LicenseApplication {
  // select license
  id!: number;
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

  // transactions
  current_stage!: string;
  is_approved!: boolean;
}
