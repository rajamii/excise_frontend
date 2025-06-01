export interface SiteEnquiryFormModel {
  locationRestrictions: LocationRestrictions;
  otherEnquiryPoints: OtherEnquiryPoints;
  documentVerification: DocumentVerification;
  metaInfo: MetaInfo;
}

export interface LocationRestrictions {
  hasTraditionalPlace: boolean;
  traditionalPlaceDistance: number; // in feet
  traditionalPlaceName: string;
  traditionalPlaceNature: string;
  traditionalPlaceConstruction: 'RCC' | 'Wooden Structure' | 'Temporary';

  hasEducationalInstitution: boolean;
  educationalInstitutionDistance: number; // in feet
  educationalInstitutionName: string;
  educationalInstitutionNature: string;

  hasHospitalNearby: boolean;
  hospitalDistance: number; // in feet
  hospitalName: string;

  hasTaxiStandNearby: boolean;
  taxiStandName: string;
  taxiStandDistance: number; // in feet

  isInterconnectedWithShops: boolean;
  interconnectedRemarks: string;

  enquiryOfficerComments: string;
}

export interface OtherEnquiryPoints {
  shopConstructionType: 'RCC' | 'Wooden Structure' | 'Temporary';

  hasNearbyExciseShops: boolean;
  numberOfNearbyExciseShops: number;
  nearbyExciseShopsRemarks: string;

  isOnHighway: boolean;
  highwayName: string;

  shopImage?: File;

  geoCoordinates: {
    latitude: string;
    longitude: string;
  };

  isShopSizeCorrect: boolean;
  shopSizeRemarks: string;

  additionalOfficerComments: string;
}

export interface DocumentVerification {
  hasIdentityProof: boolean;
  identityProofComments: string;

  hasAgeProof: boolean;
  ageProofComments: string;

  hasNOCFromLandlord: boolean;
  nocComments: string;

  hasOwnershipProof: boolean;
  ownershipProofComments: string;

  hasTradeLicense: boolean;
  tradeLicenseComments: string;

  proposesBarmanOrSalesman: boolean;
  barmanProposalComments: string;

  barmanDocumentsValid: boolean;
  barmanDocsComments: string;

  licenseRecommendation: boolean;
  recommendationComments: string;
}

export interface MetaInfo {
  specialRemarks: string;
  reportingPlace: string;
}
