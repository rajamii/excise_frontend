/**
 * New License Application Model
 * Maps to Django backend NewLicenseApplication model
 */
export interface NewLicenseApplication {
  // System fields (read-only)
  applicationId?: string;
  currentStage?: string;
  isApproved?: boolean;
  printCount?: number;
  isPrintFeePaid?: boolean;
  isFeeCalculated?: boolean;
  isLicenseCategoryUpdated?: boolean;
  yearlyLicenseFee?: string;
  createdAt?: string;
  updatedAt?: string;

  // Step 1: License Type Selection
  licenseType: number; // Foreign key ID

  // Step 2: Basic Information
  licenseCategory: number; // Foreign key ID
  licenseSubCategory: number; // Foreign key ID
  establishmentName: string;
  locationDistrict: number; // Foreign key ID
  siteType: 'New' | 'Existing';

  // Step 3: Applicant Details
  status: 'Single' | 'Married' | 'Divorced';
  applicantName: string;
  fatherHusbandName: string;
  nationality: string;
  gender: 'Male' | 'Female';
  pan: string;
  applicantMobileNumber: number | string;
  applicantEmail: string;
  photo?: File | string; // File for upload, string for URL

  // Step 4: Site Details
  siteSubdivision: number; // Foreign key ID
  policeStation: number; // Foreign key ID
  locationCategory: string;
  locationName: string;
  wardName: string;
  businessAddress: string;
  roadName: string;
  pinCode: number | string;
  latitude?: number | string;
  longitude?: number | string;
  constructionType: string;
  length?: number | string;
  breadth?: number | string;
  siteOwned: 'Yes' | 'No';
  nocObtained: 'Yes' | 'No';
  tradeLicenseCovered: 'Yes' | 'No';

  // Step 5: Company Details (conditional - only if licenseType is Company)
  companyName?: string;
  companyAddress?: string;
  companyPan?: string;
  companyCin?: string;
  incorporationDate?: string;
  companyPhoneNumber?: number | string;
  companyEmail?: string;

  // Site Documents (optional based on requirements)
  aadharCard?: File | string;
  sikkimCertificate?: File | string;
  birthProof?: File | string;
  nocLandlord?: File | string;
  tradeLicense?: File | string;

  // Related data (populated by backend)
  licenseTypeName?: string;
  licenseCategoryName?: string;
  licenseSubCategoryName?: string;
  locationDistrictName?: string;
  siteSubdivisionName?: string;
  policeStationName?: string;
  transactions?: NewLicenseTransaction[];
  latestTransaction?: NewLicenseTransaction;
}

/**
 * Transaction model for New License Application
 */
export interface NewLicenseTransaction {
  id?: number;
  licenseApplication: string;
  performedBy?: any;
  forwardedBy?: any;
  forwardedTo?: any;
  stage: string;
  remarks?: string;
  timestamp: string;
}

/**
 * Objection model for New License Application
 */
export interface NewLicenseObjection {
  id?: number;
  application: string;
  fieldName: string;
  remarks: string;
  raisedBy?: any;
  isResolved: boolean;
  raisedOn: string;
  resolvedOn?: string;
}

/**
 * Site Enquiry Report model
 */
export interface NewLicenseSiteEnquiryReport {
  id?: number;
  application: string;
  
  // Traditional place
  hasTraditionalPlace: boolean;
  traditionalPlaceDistance?: number;
  traditionalPlaceName?: string;
  traditionalPlaceNature?: string;
  traditionalPlaceConstruction?: 'rcc' | 'wooden_structure' | 'temporary';
  
  // Educational institution
  hasEducationalInstitution: boolean;
  educationalInstitutionDistance?: number;
  educationalInstitutionName?: string;
  educationalInstitutionNature?: string;
  
  // Hospital
  hasHospital: boolean;
  hospitalDistance?: number;
  hospitalName?: string;
  
  // Taxi stand
  hasTaxiStand: boolean;
  taxiStandName?: string;
  taxiStandDistance?: number;
  
  // Shop details
  shopConstructionType: 'rcc' | 'wooden_structure' | 'temporary';
  isInterconnectedWithShops: boolean;
  interconnectivityRemarks?: string;
  hasExciseShopsNearby: boolean;
  nearbyExciseShopCount?: number;
  nearbyExciseShopsRemarks?: string;
  
  // Location
  isOnHighway: boolean;
  highwayName?: string;
  latitude?: number;
  longitude?: number;
  shopImageDocument: File | string;
  
  // Size verification
  isShopSizeCorrect: boolean;
  shopSizeRemarks?: string;
  
  // Document verification
  hasIdProof: boolean;
  idProofComments?: string;
  hasAgeProof: boolean;
  ageProofComments?: string;
  hasNocFromLandlord: boolean;
  nocComments?: string;
  hasOwnershipProof: boolean;
  ownershipProofComments?: string;
  hasTradeLicense: boolean;
  tradeLicenseComments?: string;
  
  // Worker information
  proposesBarmanOrSalesman: boolean;
  workerProposalComments?: string;
  workerDocsValid: boolean;
  workerDocsComments?: string;
  
  // Recommendation
  licenseRecommendation: boolean;
  recommendationComments?: string;
  enquiryOfficerComments?: string;
  additionalEnquiryOfficerComments?: string;
  specialRemarks?: string;
  reportingPlace?: string;
  
  createdAt?: string;
}

/**
 * Dashboard counts for New License Application
 */
export interface NewLicenseDashboardCount {
  pending?: number;
  approved?: number;
  rejected?: number;
  applied?: number; // For licensee role
}

/**
 * Applications grouped by status
 */
export interface NewLicenseApplicationsByStatus {
  pending?: NewLicenseApplication[];
  approved?: NewLicenseApplication[];
  rejected?: NewLicenseApplication[];
  applied?: NewLicenseApplication[]; // For licensee role
}