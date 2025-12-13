import { Account } from "./account.model";
import { District } from "./district.model";
import { LicenseCategory } from "./license-category.model";
import { LicenseType } from "./license-type.model";
import { PoliceStation } from "./policestation.model";
import { Subdivision } from "./subdivision.model";

/**
 * Transaction Model
 */
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

/**
 * Objection Model
 */
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

/**
 * License Application Model
 * This interface uses snake_case to match backend serializer exactly
 * Use this for API requests/responses
 */
export interface LicenseApplication {
  // Read-only fields (returned by backend)
  application_id?: string;
  current_stage?: string;
  is_approved?: boolean;
  transactions?: Transaction[];
  latest_transaction?: any;
  objections?: Objection[];

  // Step 1: Select License
  excise_district?: number;           // ID of District (ForeignKey)
  license_category?: number;          // ID of LicenseCategory (ForeignKey)
  license_sub_category?: number;
  excise_subdivision?: number;        // ID of Subdivision (ForeignKey)
  license?: string;

  // Step 2: Key Info
  license_type?: number;              // ID of LicenseType (ForeignKey)
  establishment_name?: string;
  location_district?: number;
  site_type?: string;
  mobile_number?: number;             // Integer (not string)
  email?: string;
  license_no?: number;                // Integer (not string)
  initial_grant_date?: string;        // Date in YYYY-MM-DD format
  renewed_from?: string;              // Date in YYYY-MM-DD format
  valid_up_to?: string;               // Date in YYYY-MM-DD format
  yearly_license_fee?: string;
  license_nature?: string;
  functioning_status?: string;
  mode_of_operation?: string;

  // Step 3: Address/Site Details
  site_district?: number;             // ID of District (ForeignKey)
  site_subdivision?: number;          // ID of Subdivision (ForeignKey)
  police_station?: number;            // ID of PoliceStation (ForeignKey)
  location_category?: string;
  location_name?: string;
  ward_name?: string;
  business_address?: string;
  road_name?: string;
  pin_code?: number;                  // Integer (not string)
  latitude?: number;                  // Float
  longitude?: number;                 // Float
  construction_type?: string;
  length?: number;
  breadth?: number;
  site_owned?: string;
  noc_obtained?: string;
  trade_license_covered?: string;

  // Step 4: Unit Details (only if license_type = Company)
  company_name?: string;
  company_address?: string;
  company_pan?: string;
  company_cin?: string;
  incorporation_date?: string;        // Date in YYYY-MM-DD format
  company_phone_number?: number;      // Integer (not string)
  company_email?: string;

  // Step 5: Applicant/Member Details
  status?: string;
  applicant_name?: string;
  member_name?: string;
  father_husband_name?: string;
  nationality?: string;
  gender?: string;
  pan?: string;
  applicant_mobile_number?: number;   // Integer (not string)
  member_mobile_number?: number;      // Integer (not string)
  applicant_email?: string;
  member_email?: string;
  dob?: string;                       // Date in YYYY-MM-DD format

  // Document
  photo?: File;                       // File upload

  // Additional backend fields
  print_count?: number;
  is_print_fee_paid?: boolean;
  is_fee_calculated?: boolean;
  is_license_category_updated?: boolean;
}

/**
 * License Application Display Model
 * This interface uses camelCase for frontend display purposes
 * Use this for binding to Angular forms and displaying data
 */
export interface LicenseApplicationDisplay {
  // Read-only fields
  applicationId?: string;
  currentStage?: string;
  isApproved?: boolean;
  transactions?: Transaction[];
  latestTransaction?: any;
  objections?: Objection[];

  // Step 1: Select License
  exciseDistrict?: District | number;
  licenseCategory?: LicenseCategory | number;
  licenseSubCategory?: number;
  exciseSubdivision?: Subdivision | number;
  license?: string;

  // Step 2: Key Info
  licenseType?: LicenseType | number;
  establishmentName?: string;
  locationDistrict?: number;
  siteType?: string;
  mobileNumber?: number;
  email?: string;
  licenseNo?: number;
  initialGrantDate?: string;
  renewedFrom?: string;
  validUpTo?: string;
  yearlyLicenseFee?: string;
  licenseNature?: string;
  functioningStatus?: string;
  modeOfOperation?: string;

  // Step 3: Address/Site Details
  siteDistrict?: District | number;
  siteSubdivision?: Subdivision | number;
  policeStation?: PoliceStation | number;
  locationCategory?: string;
  locationName?: string;
  wardName?: string;
  businessAddress?: string;
  roadName?: string;
  pinCode?: number;
  latitude?: number;
  longitude?: number;
  constructionType?: string;
  length?: number;
  breadth?: number;
  siteOwned?: string;
  nocObtained?: string;
  tradeLicenseCovered?: string;

  // Step 4: Unit Details
  companyName?: string;
  companyAddress?: string;
  companyPan?: string;
  companyCin?: string;
  incorporationDate?: string;
  companyPhoneNumber?: number;
  companyEmail?: string;

  // Step 5: Applicant/Member Details
  status?: string;
  applicantName?: string;
  memberName?: string;
  fatherHusbandName?: string;
  nationality?: string;
  gender?: string;
  pan?: string;
  applicantMobileNumber?: number;
  memberMobileNumber?: number;
  applicantEmail?: string;
  memberEmail?: string;
  dob?: string;

  // Document
  photo?: File;

  // Additional fields
  printCount?: number;
  isPrintFeePaid?: boolean;
  isFeeCalculated?: boolean;
  isLicenseCategoryUpdated?: boolean;
}

/**
 * Utility class to convert between camelCase and snake_case
 */
export class LicenseApplicationMapper {
  
  /**
   * Convert camelCase to snake_case
   */
  static toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase();
  }

  /**
   * Convert snake_case to camelCase
   */
  static toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  }

  /**
   * Convert LicenseApplicationDisplay (camelCase) to LicenseApplication (snake_case)
   * Use this before sending data to backend
   */
  static toBackendFormat(display: LicenseApplicationDisplay): Partial<LicenseApplication> {
    const backend: any = {};

    for (const [key, value] of Object.entries(display)) {
      if (value === undefined || value === null) continue;

      const snakeKey = this.toSnakeCase(key);

      // Extract IDs from objects for ForeignKey fields
      if (typeof value === 'object' && value !== null && !(value instanceof File) && !(value instanceof Date)) {
        if ('id' in value) {
          backend[snakeKey] = value.id;
        } else if ('districtCode' in value) {
          backend[snakeKey] = value.districtCode;
        } else if ('subdivisionCode' in value) {
          backend[snakeKey] = value.subdivisionCode;
        } else if ('policeStationCode' in value) {
          backend[snakeKey] = value.policeStationCode;
        } else {
          backend[snakeKey] = value;
        }
      } else {
        backend[snakeKey] = value;
      }
    }

    return backend as Partial<LicenseApplication>;
  }

  /**
   * Convert LicenseApplication (snake_case) to LicenseApplicationDisplay (camelCase)
   * Use this when receiving data from backend
   */
  static toDisplayFormat(backend: LicenseApplication): Partial<LicenseApplicationDisplay> {
    const display: any = {};

    for (const [key, value] of Object.entries(backend)) {
      if (value === undefined || value === null) continue;
      const camelKey = this.toCamelCase(key);
      display[camelKey] = value;
    }

    return display as Partial<LicenseApplicationDisplay>;
  }
}