import { Account } from "./account.model";
import { District } from "./district.model";
import { LicenseCategory } from "./license-category.model";
import { PoliceStation } from "./policestation.model";
import { Subdivision } from "./subdivision.model";

// Define Transaction and Objection classes FIRST
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
  application!: string;
  fieldName!: string;
  remarks!: string;
  raisedBy!: Account | null;
  isResolved!: boolean;
  raisedOn!: string;
  resolvedOn?: string | null;
}

// Now define LicenseApplication that uses them
export class LicenseApplication {
  // select license
  applicationId!: string;
  exciseDistrict!: District;
  licenseCategory!: LicenseCategory;
  licenseSubCategory?: number;
  exciseSubdivision!: Subdivision;
  license!: string;

  // key info
  licenseType!: string;
  establishmentName!: string;
  locationDistrict?: number;
  siteType?: string;
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

  // address/site details
  siteDistrict!: District;
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
  constructionType?: string;
  length?: number;
  breadth?: number;
  siteOwned?: string;
  nocObtained?: string;
  tradeLicenseCovered?: string;

  // unit details (only if licenseType = 'Company')
  companyName!: string;
  companyAddress!: string;
  companyPan!: string;
  companyCin!: string;
  incorporationDate!: string;
  companyPhoneNumber!: number;
  companyEmail!: string;

  // applicant details (changed from member details)
  status!: string;
  applicantName?: string;
  memberName!: string;
  fatherHusbandName!: string;
  nationality!: string;
  gender!: string;
  pan!: number;
  applicantMobileNumber?: number;
  memberMobileNumber!: number;
  applicantEmail?: string;
  memberEmail!: string;
  dob!: string;

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