import { Account } from './account.model';
import { District } from './district.model';
import { LicenseCategory } from './license-category.model';
import { LicenseSubcategory } from './license-subcategory.model';
import { LicenseType } from './license-type.model';
import { PoliceStation } from './policestation.model';
import { Road } from './road.model';
import { Role } from './role.model';
import { Subdivision } from './subdivision.model';


export class Transaction {
  id!: number;
  licenseApplication!: string | NewLicenseApplication;
  performedBy!: Account | null;
  forwardedBy!: Role | null;
  forwardedTo!: Role | null;
  stage!: number;
  remarks?: string | null;
  timestamp!: string;
}

export class Objection {
  id?: number;
  application!: string | NewLicenseApplication;
  fieldName!: string;
  remarks!: string;
  raisedBy!: Account | null;
  isResolved!: boolean;
  raisedOn!: string;
  resolvedOn?: string | null;
}

export class NewLicenseApplication {

  applicationId!: number;
  
  //Application Type
  licenseType!: LicenseType;

  //Basic Information
  licenseCategory!: LicenseCategory;
  licenseSubCategory!: LicenseSubcategory;
  establishmentName!: string;
  siteType!: string;

  //Applicant Details
  applicantName!: string;
  fatherHusbandName!: string;
  dob!: string;
  gender!: string;
  nationality!: string;
  residentialStatus!: string;
  presentAddress!: string;
  permanentAddress!: string;
  pan!: string;
  email!: string;
  mobileNumber!: string;
  modeOfOperation!: string;
  hasSikkimCertificate!: boolean;
  hasExciseLicense!: boolean;
  familyExciseLicense!: boolean;
  criminalConviction!: boolean;

  //Site Details
  siteDistrict!: District;
  siteSubdivision!: Subdivision;
  policeStation!: PoliceStation;
  locationCategory!: string;
  locationName!: string;
  wardName!: string;
  businessAddress!: string;
  roadName!: Road;
  pinCode!: number;
  ConstructionType!: string;
  length!: number;
  breadth!: number;
  siteOwned!: boolean;
  nocObtained!: boolean;

  //Company Details
  companyName!: string;
  companyAddress!: string;
  companyPan!: string;
  companyCin!: string;
  incorporationDate!: string;
  companyPhoneNumber!: string;
  companyEmail!: string;

  //document uploads
  passPhoto!: File;
  panCard!: File;
  sikkimCertificate!: File;
  dobProof!: File;
  nocLandlord!: File | null;

  //transactions
  currentStage!: string;
  isApproved!: boolean;
  printCount: number = 0;

  //Related Models
  objections!: Objection[];
  transactions!: Transaction[];
}