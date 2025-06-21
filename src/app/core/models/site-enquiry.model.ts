export class SiteEnquiryFormModel {

  hasTraditionalPlace!: boolean;
  traditionalPlaceDistance?: number; // in feet
  traditionalPlaceName?: string;
  traditionalPlaceNature?: string;
  traditionalPlaceConstruction?: 'RCC' | 'Wooden Structure' | 'Temporary';

  hasEducationalInstitution!: boolean;
  educationalInstitutionDistance?: number; // in feet
  educationalInstitutionName?: string;
  educationalInstitutionNature?: string;

  hasHospital!: boolean;
  hospitalDistance?: number; // in feet
  hospitalName?: string;

  hasTaxiStand!: boolean;
  taxiStandDistance?: number; // in feet
  taxiStandName?: string;

  isInterconnectedWithShops!: boolean;
  interconnectivityRemarks?: string;

  enquiryOfficerComments?: string;

  shopConstructionType!: 'RCC' | 'Wooden Structure' | 'Temporary';

  hasExciseShopsNearby!: boolean;
  nearbyExciseShopCount?: number;
  nearbyExciseShopsRemarks?: string;

  isOnHighway!: boolean;
  highwayName?: string;

  shopImageDocument!: File;

  latitude?: string;
  longitude?: string;

  isShopSizeCorrect!: boolean;
  shopSizeRemarks?: string;

  additionalEnquiryOfficerComments?: string;

  hasIdProof!: boolean;
  idProofComments?: string;

  hasAgeProof!: boolean;
  ageProofComments?: string;

  hasNocFromLandlord!: boolean;
  nocComments?: string;

  hasOwnershipProof!: boolean;
  ownershipProofComments?: string;

  hasTradeLicense!: boolean;
  tradeLicenseComments?: string;

  proposesBarmanOrSalesman!: boolean;
  workerProposalComments?: string;

  workerDocsValid!: boolean;
  workerDocsComments?: string;

  licenseRecommendation!: boolean;
  recommendationComments?: string;

  specialRemarks!: string;
  reportingPlace?: string;
}
