import { Account } from "./account.model";
import { District } from "./district.model";
import { LicenseCategory } from "./license-category.model";
import { LicenseSubcategory } from "./license-subcategory.model";
import { PoliceStation } from "./policestation.model";
import { Subdivision } from "./subdivision.model";
export class LicenseApplication {
  // select license
  applicationId!: string;
  exciseDistrict!: District;
  licenseCategory!: LicenseCategory;
  licenseSubCategory!: LicenseSubcategory;
  exciseSubdivision!: Subdivision;
  license!: string;

  // key info
  licenseType!: string;  
  establishmentName!: string;
  mobileNumber!: number;
  email!: string;
  licenseNo?: number;
  initialGrantDate?: string;
  renewedFrom?: string;
  validUpTo?: string;
  yearlyLicenseFee?: string;
  licenseNature!: string;
  functioningStatus!: string;
  modeOfOperation!: string;  

  // address
  siteSubdivision!: Subdivision;
  policeStation!: PoliceStation;
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
  companyEmail!: string;

  // member details
  status!: string;
  memberName!: string;
  fatherHusbandName!: string;
  nationality!: string;
  gender!: string;
  pan!: number;
  memberMobileNumber!: number;
  memberEmail!: string;

  // document
  photo!: File;

  // transactions
  currentStage!: string;
  isApproved!: boolean;
  printCount: number = 0;
  // Related models
  objections?: Objection[];
  transactions?: Transaction[];
}

export class Transaction {
  id!: number;
  licenseApplication!: string | LicenseApplication;
  performedBy!: number | any;
  forwardedBy!: number | any;
  forwardedTo!: number | any;
  stage!: string;
  remarks?: string;
  timestamp!: string; 
}

export class Objection {
  id?: number;
  application!: string; // or LicenseApplication if full object is returned
  fieldName!: string;
  remarks!: string;
  raisedBy!: Account | null;
  isResolved!: boolean;
  raisedOn!: string;
  resolvedOn?: string | null;
}