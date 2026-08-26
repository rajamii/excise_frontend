export interface DistributorPermitLineItem {
  id?: number;
  brandId?: number;
  brandMasterId?: number;
  brandName?: string;
  brand_name?: string;
  sizeMl: number;
  size_ml?: number;
  piecesPerCase?: number;
  pieces_per_case?: number;
  cases: number;
  edpPerCase?: number;
  edp_per_case?: number;
  importPassFeePerCase?: number;
  import_pass_fee_per_case?: number;
  mrpPerBottle?: number;
  mrp_per_bottle?: number;
  additionalEdPerCase?: number;
  additional_ed_per_case?: number;
  educationCessPerCase?: number;
  education_cess_per_case?: number;
  totalImport?: number;
  total_import?: number;
  totalEducationCess?: number;
  total_education_cess?: number;
  totalAdditionalEd?: number;
  total_additional_ed?: number;
  bulkLitres?: number;
  bulk_litres?: number;
  permitNumber?: string;
  permit_number?: string;
}

export interface DistributorPermitApplication {
  referenceNo?: string;
  reference_no?: string;
  applicantName?: string;
  applicant_name?: string;
  supplierCompanyName: string;
  supplier_company_name?: string;
  logisticsPartner?: string;
  logistics_partner?: string;
  sourceAddress: string;
  source_address?: string;
  origin?: string;
  destination?: string;
  routeDetails?: string;
  route_details?: string;
  declarationAccepted: boolean;
  declaration_accepted?: boolean;
  status?: string;
  officerRemarks?: string;
  officer_remarks?: string;
  submittedAt?: string;
  submitted_at?: string;
  createdAt?: string;
  created_at?: string;
  lineItems: DistributorPermitLineItem[];
  line_items?: DistributorPermitLineItem[];
  permitWiseDetails?: any[];
  permit_wise_details?: any[];
  brandCount?: number;
  totalCases?: number;
  totalImportValue?: number;
  totalEducationCess?: number;
  totalAdditionalEd?: number;
  totalBulkLitres?: number;
  [key: string]: any;
}

export interface DistributorSupplier {
  id: number;
  supplier_master_name?: string;
  supplierMasterName?: string;
  supplier_name?: string;
  company_name: string;
  companyName?: string;
  post?: string;
  address: string;
  route_details?: string;
  routeDetails?: string;
  state?: string;
  is_active?: boolean;
}

export interface DistributorBrandMaster {
  brandId: number;
  brandName: string;
  sizeMl: number;
  piecesPerCase: number;
  edpPerCase: number;
  importPassFeePerCase: number;
  mrpPerBottle: number;
  additionalEdPerCase: number;
  educationCessPerCase: number;
  supplierId?: number;
  supplierName?: string;
}
