import { Component, Inject, PLATFORM_ID, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';

// Services
import { EnaRequisitionService } from '../../../core/services/ena-requisition.service';
import { SupplyChainService } from '../../../features/licensee/supplyChain/services/supplychain.service';
import { HologramDataService } from '../../../features/licensee/supplyChain/services/hologram-data.service';
import { CompanyRegistrationService } from '../../../core/services/company-registration.service';
import { CompanyCollaborationService } from '../../../core/services/company-collaboration.service';
import { SalesmanBarmanRegistrationService } from '../../../core/services/salesman-barman-registration.service';
import { LicenseApplicationService } from '../../../core/services/license-application.service';
import { MasterService } from '../../../core/services/master.service';
import { ActionButtonConfig } from '../../../core/services/action-config.service';
import { LicenseCategory } from '../../../core/models/license-category.model';
import { LicenseFee } from '../../../core/models/license-fee.model';
import { UnifiedActionButtonsComponent } from '../unified-action-buttons/unified-action-buttons.component';
import { UnifiedActionsService } from '../../services/unified-actions.service';
import { SiteEnquiryFormDialogComponent } from '../site-enquiry-form-dialog/site-enquiry-form-dialog.component';
import { RoleService } from '../../../core/services/role.service';
import { UnifiedDashboardService } from '../../../core/services/unified-dashboard.service';
import { Objection } from '../../../core/models/license-application.model';

// Constants
import {
    APPLICATION_TYPES,
    ApplicationType,
    USER_CONTEXTS,
    UserContext,
    WORKFLOW_IDS,
    APPLICATION_TITLES,
    PAGE_TITLES,
    NAVIGATION_ROUTES,
    STATUS_BADGE_CLASSES,
    SUCCESS_STATUS_KEYWORDS,
    WARNING_STATUS_KEYWORDS,
    DANGER_STATUS_KEYWORDS
} from '../../constants/application.constants';
import { environment } from '../../../../environments/environment';

// Components and interfaces

// Dynamic application data interface that works with any backend model
export interface UnifiedApplicationData {
    // Core fields (always present)
    id: string;
    referenceNo: string;
    submissionDate: Date;
    status: string;

    // Workflow fields
    currentStage?: number;
    currentStageName?: string;
    workflowId?: number;
    allowedActions?: string[];
    allowedActionConfigs?: ActionButtonConfig[];

    // Common computed fields (properly typed)
    distilleryName?: string;
    brAmount?: number;
    quantity?: number;
    bulkSpiritType?: string;
    numberOfPermits?: number;
    strengthTo?: number;
    purpose?: string;
    liftedFrom?: string;
    viaRoute?: string;
    checkpostEntry?: string;
    originalPermitNo?: string;
    originalPermitDate?: Date;
    expiryDate?: Date;
    reasonForRevalidation?: string;
    newQuantity?: number;
    newPurpose?: string;
    revalidationAmount?: number;
    cancellationAmount?: number;
    refundAmount?: number;
    refundStatus?: string;
    cancellationReason?: string;
    vehicleNumber?: string;
    driverName?: string;
    fromLocation?: string;
    toLocation?: string;
    transitProducts?: any[];
    localQty?: number;
    exportQty?: number;
    defenceQty?: number;
    totalQty?: number;
    paymentAmount?: string | number;
    hologramType?: string;
    permitType?: string;

    // New license specific fields (explicitly declared for strict template type-checking)
    applicant_name?: string;
    applicantName?: string;
    establishment_name?: string;
    establishmentName?: string;
    father_husband_name?: string;
    fatherHusbandName?: string;
    email?: string;
    mobile_number?: string;
    mobileNumber?: string;
    residential_status?: string;
    residentialStatus?: string;
    mode_of_operation?: string;
    modeOfOperation?: string;
    present_address?: string;
    presentAddress?: string;
    permanent_address?: string;
    permanentAddress?: string;
    has_sikkim_certificate?: string;
    hasSikkimCertificate?: string;
    has_excise_license?: string;
    hasExciseLicense?: string;
    family_excise_license?: string;
    familyExciseLicense?: string;
    criminal_conviction?: string;
    criminalConviction?: string;

    location_category?: string;
    locationCategory?: string;
    location_name?: string;
    locationName?: string;
    ward_name?: string;
    wardName?: string;
    business_address?: string;
    businessAddress?: string;
    road_name?: string;
    roadName?: string;
    pin_code?: string;
    construction_type?: string;
    constructionType?: string;
    length?: string | number;
    breadth?: string | number;
    site_owned?: string;
    siteOwned?: string;
    noc_obtained?: string;
    nocObtained?: string;

    pass_photo?: string;
    passPhoto?: string;
    pan_card?: string;
    panCard?: string;
    sikkim_certificate?: string;
    sikkimCertificate?: string;
    dob_proof?: string;
    dobProof?: string;
    noc_landlord?: string;
    nocLandlord?: string;
    license_type_name?: string;
    licenseTypeName?: string;
    license_type?: string;
    license_category_name?: string;
    licenseCategoryName?: string;
    license_category?: string;
    license_sub_category_name?: string;
    licenseSubCategoryName?: string;
    site_type?: string;
    site_district_name?: string;
    siteDistrictName?: string;
    site_subdivision_name?: string;
    siteSubdivisionName?: string;
    police_station_name?: string;
    policeStationName?: string;
    yearly_license_fee?: string | number;
    yearlyLicenseFee?: string | number;

    // Company specific fields for new-license flow
    company_name?: string;
    company_address?: string;
    company_gst?: string;
    company_phone_number?: string;
    company_email?: string;
    companyAddress?: string;
    companyGst?: string;
    companyPhoneNumber?: string;
    companyEmail?: string;

    // Company registration specific fields
    brandType?: string;
    license?: string;
    applicationYear?: string;
    companyName?: string;
    pan?: string;
    officeAddress?: string;
    country?: string;
    state?: string;
    factoryAddress?: string;
    pinCode?: string | number;
    companyMobileNumber?: string | number;
    companyEmailId?: string;
    memberName?: string;
    memberDesignation?: string;
    memberMobileNumber?: string | number;
    memberEmailId?: string;
    memberAddress?: string;
    paymentId?: string;
    paymentDate?: string | Date;
    paymentRemarks?: string;

    // Salesman/Barman registration specific fields
    role?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    gender?: string;
    dob?: string | Date;
    nationality?: string;
    address?: string;
    aadhaar?: string;
    emailId?: string;
    sikkimSubject?: boolean;
    excise_district?: string;
    exciseDistrict?: string;
    current_stage_name?: string;
    is_approved?: boolean;
    created_at?: string | Date;

    // Transit permit specific fields
    routeDetails?: string;
    checkpostExit?: string;
    driverLicense?: string;
    transporterName?: string;

    // Product/Brand specific fields
    brand?: string;
    sizeML?: number;
    bottleType?: string;
    brandOwner?: string;
    manufacturingUnit?: string;

    // Fee/Tax fields
    educationCess?: number;
    exciseDuty?: number;
    additionalExcise?: number;

    // Hologram specific fields
    hologramSeriesStart?: string;
    hologramSeriesEnd?: string;
    cartoonNumber?: string;

    // Dynamic fields (populated from backend model)
    [key: string]: any;
}

// Service configuration for each application type
interface ServiceConfig {
    service: any;
    listMethod: string;
    detailMethod: string;
    workflowId: number;
    fieldMappings: FieldMapping;
}

// Field mapping configuration for dynamic data extraction
interface FieldMapping {
    id: string[];
    referenceNo: string[];
    submissionDate: string[];
    status: string[];
    currentStage?: string[];
    currentStageName?: string[];
    workflowId?: string[];
    // Common field mappings
    distilleryName?: string[];
    brAmount?: string[];
    quantity?: string[];
    numberOfPermits?: string[];
    purpose?: string[];
    bulkSpiritType?: string[];
    strengthTo?: string[];
    liftedFrom?: string[];
    viaRoute?: string[];
    checkpostEntry?: string[];
    // Revalidation specific
    originalPermitNo?: string[];
    originalPermitDate?: string[];
    expiryDate?: string[];
    reasonForRevalidation?: string[];
    newQuantity?: string[];
    newPurpose?: string[];
    revalidationAmount?: string[];
    // Cancellation specific
    cancellationAmount?: string[];
    refundAmount?: string[];
    refundStatus?: string[];
    cancellationReason?: string[];
    cancelledPermitNumber?: string[];
    cancellationDate?: string[];
    refundProcessedDate?: string[];
    refundApprovedBy?: string[];
    // Transit specific
    vehicleNumber?: string[];
    driverName?: string[];
    driverLicense?: string[];
    fromLocation?: string[];
    toLocation?: string[];
    routeDetails?: string[];
    checkpostExit?: string[];
    transporterName?: string[];
    transitProducts?: string[];
    permitType?: string[];
    brand?: string[];
    sizeML?: string[];
    bottleType?: string[];
    brandOwner?: string[];
    manufacturingUnit?: string[];
    educationCess?: string[];
    exciseDuty?: string[];
    additionalExcise?: string[];
    // Add more as needed dynamically
}

interface SiteEnquiryReportField {
    key: string;
    label: string;
    displayValue: string;
    href?: string;
}

interface ApproveExecutionOptions {
    successMessage?: string;
    failureMessage?: string;
    workflowContextData?: Record<string, any>;
}

interface NewLicenseFeeApprovalDialogData {
    applicationId: string;
    initialLicenseCategoryId?: number | null;
    initialLicenseCategoryName?: string | null;
    initialLicenseSubcategoryId?: number | null;
    initialLicenseSubcategoryName?: string | null;
    initialLocationCode?: string | number | null;
    initialLocationName?: string | null;
    initialDistrictName?: string | null;
}

interface NewLicenseFeeApprovalResult {
    applicationId: string;
    licenseCategoryId: number;
    licenseCategoryName: string;
    licenseSubcategoryId: number;
    licenseSubcategoryName: string;
    locationCode: string;
    locationDescription: string;
    licenseFee: LicenseFee;
}

interface NewLicenseFeeApprovalSubcategoryOption {
    id: number;
    description: string;
    categoryId: number;
}

interface NewLicenseFeeApprovalLocationOption {
    id?: number;
    locationCode: string;
    locationDescription: string;
    districtName?: string;
    isSynthetic?: boolean;
}

interface PendingNewLicenseFeeApproval {
    item: any;
    context: UserContext;
    applicationId: string;
    options?: ApproveExecutionOptions;
}

@Component({
    selector: 'app-unified-supply-chain-view',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, UnifiedActionButtonsComponent],
    templateUrl: './unified-supply-chain-view.component.html',
    styleUrls: ['./unified-supply-chain-view.component.scss']
})
export class UnifiedSupplyChainViewComponent implements OnInit {
    applicationData?: UnifiedApplicationData;
    applicationType: ApplicationType = 'requisition';
    isLoading = false;
    errorMessage = '';
    objections: Objection[] = [];
    private objectionIndex = new Map<string, { hasUnresolved: boolean; hasResolved: boolean }>();

    // Hologram supply order letter (IT Cell after payment)
    supplyOrderLetterOpen = false;
    supplyOrderLetterModel: any | null = null;
    private pendingOpenSupplyLetter = false;

    get hologramSupplierDetails(): any | null {
        const data: any = this.applicationData as any;
        return (data?.supplier_details || data?.supplierDetails) || null;
    }

    // Uploaded documents modal state
    docsModalOpen = false;
    activeDoc: { label: string; url: string; isImage: boolean } | null = null;
    newLicenseUploads: Array<{ label: string; url: string; isImage: boolean }> = [];
    siteEnquiryReportModalOpen = false;
    siteEnquiryReportLoading = false;
    siteEnquiryReportError = '';
    siteEnquiryReport: Record<string, any> | null = null;
    siteEnquiryReportEntries: SiteEnquiryReportField[] = [];
    newLicenseFeeApprovalModalOpen = false;
    newLicenseFeeApprovalOptionsLoading = false;
    newLicenseFeeApprovalFeeLoading = false;
    newLicenseFeeApprovalOptionsError = '';
    newLicenseFeeApprovalFeeError = '';
    newLicenseFeeApprovalCategories: LicenseCategory[] = [];
    newLicenseFeeApprovalAllSubcategories: NewLicenseFeeApprovalSubcategoryOption[] = [];
    newLicenseFeeApprovalFilteredSubcategories: NewLicenseFeeApprovalSubcategoryOption[] = [];
    newLicenseFeeApprovalLocations: NewLicenseFeeApprovalLocationOption[] = [];
    newLicenseFeeApprovalDetails: LicenseFee | null = null;
    pendingNewLicenseFeeApproval: PendingNewLicenseFeeApproval | null = null;
    readonly newLicenseFeeApprovalForm: FormGroup;

    openDocsModal(): void { this.docsModalOpen = true; this.cdr.detectChanges(); }
    closeDocsModal(): void { this.docsModalOpen = false; this.activeDoc = null; this.cdr.detectChanges(); }
    openDocViewer(doc: { label: string; url: string; isImage: boolean }): void {
        const url = this.normalizeDocUrl(doc.url);
        if (!doc.isImage) {
            window.open(url, '_blank', 'noopener');
            return;
        }
        this.activeDoc = {
            ...doc,
            url
        };
        this.cdr.detectChanges();
    }
    closeDocViewer(): void { this.activeDoc = null; this.cdr.detectChanges(); }

    private readonly isBrowser: boolean;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private http: HttpClient,
        private fb: FormBuilder,
        private enaRequisitionService: EnaRequisitionService,
        private supplyChainService: SupplyChainService,
        private hologramDataService: HologramDataService,
        private companyRegistrationService: CompanyRegistrationService,
        private companyCollaborationService: CompanyCollaborationService,
        private salesmanBarmanRegistrationService: SalesmanBarmanRegistrationService,
        private licenseApplicationService: LicenseApplicationService,
        private masterService: MasterService,
        private roleService: RoleService,
        private unifiedActionsService: UnifiedActionsService,
        private unifiedDashboardService: UnifiedDashboardService,
        private dialog: MatDialog,
        private snackBar: MatSnackBar,
        private sanitizer: DomSanitizer,
        private cdr: ChangeDetectorRef,
        @Inject(PLATFORM_ID) platformId: Object
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
        this.newLicenseFeeApprovalForm = this.fb.group({
            licenseCategoryId: [null, Validators.required],
            licenseSubcategoryId: [{ value: null, disabled: true }, Validators.required],
            locationCode: [null, Validators.required]
        });
        this.bindNewLicenseFeeApprovalForm();
    }

    private isOicUser(): boolean {
        const current = this.roleService.getCurrentUser();
        if (!current) return false;

        if (Number(current.roleId) === 7) return true;

        const roleToken = String(current.role?.name || current.role?.displayName || '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
        if (roleToken.includes('officerincharge') || roleToken === 'oic') return true;

        return false;
    }

    // Dynamic service configuration
    private get serviceConfigs(): { [key in ApplicationType]: ServiceConfig } {
        return {
            requisition: {
                service: this.enaRequisitionService,
                listMethod: 'getRequisitions',
                detailMethod: 'getRequisitionById',
                workflowId: WORKFLOW_IDS[APPLICATION_TYPES.REQUISITION],
                fieldMappings: {
                    id: ['id'],
                    referenceNo: ['ourRefNo', 'our_ref_no', 'referenceNo', 'reference_no'],
                    submissionDate: ['requisitionDate', 'requisition_date', 'createdAt', 'created_at', 'submission_date'],
                    status: ['status', 'currentStageName'],
                    currentStage: ['currentStage', 'current_stage'],
                    currentStageName: ['currentStageName', 'current_stage_name'],
                    workflowId: ['workflow', 'workflow_id', 'workflowId'],
                    distilleryName: ['liftedFromDistilleryName', 'lifted_from_distillery_name', 'distillery_name', 'distilleryName'],
                    brAmount: ['paymentAmount', 'payment_amount', 'br_amount', 'brAmount', 'totalbl', 'total_bl', 'grainEnaNumber', 'grain_ena_number'],
                    quantity: ['totalbl', 'total_bl', 'grainEnaNumber', 'grain_ena_number', 'quantity'],
                    numberOfPermits: ['requisitonNumberOfPermits', 'requisition_number_of_permits', 'number_of_permits', 'numberOfPermits'],
                    purpose: ['purposeName', 'purpose_name', 'branchPurpose', 'branch_purpose', 'purpose'],
                    bulkSpiritType: ['bulkSpiritType', 'bulk_spirit_type', 'spirit_type', 'spiritType'],
                    strengthTo: ['strength', 'strength_to', 'strengthTo', 'alcohol_strength', 'alcoholStrength'],
                    liftedFrom: ['liftedFrom', 'lifted_from', 'liftedFromDistilleryName', 'lifted_from_distillery_name'],
                    viaRoute: ['viaRoute', 'via_route', 'route', 'transport_route', 'transportRoute'],
                    checkpostEntry: ['checkPostName', 'checkpost_name', 'checkpost_entry', 'checkpostEntry']
                }
            },
            revalidation: {
                service: this.supplyChainService,
                listMethod: 'getRevalidationData',
                detailMethod: 'getRevalidationDetail',
                workflowId: WORKFLOW_IDS[APPLICATION_TYPES.REVALIDATION],
                fieldMappings: {
                    id: ['id'],
                    referenceNo: ['ourRefNo', 'our_ref_no', 'referenceNo', 'reference_no'],
                    submissionDate: ['requisitionDate', 'requisition_date', 'revalidationDate', 'revalidation_date', 'createdAt', 'created_at'],
                    status: ['status', 'currentStageName'],
                    currentStage: ['currentStage', 'current_stage'],
                    currentStageName: ['currentStageName', 'current_stage_name'],
                    workflowId: ['workflow', 'workflow_id', 'workflowId'],
                    distilleryName: ['distilleryName', 'distillery_name', 'liftedFrom', 'lifted_from'],
                    brAmount: ['totalBl', 'total_bl', 'revalidationBrAmount', 'revalidation_br_amount', 'brAmount', 'br_amount', 'grainEnaNumber', 'grain_ena_number'],
                    quantity: ['totalBl', 'total_bl', 'grainEnaNumber', 'grain_ena_number', 'quantity'],
                    numberOfPermits: ['requisitonNumberOfPermits', 'requisition_number_of_permits', 'number_of_permits', 'numberOfPermits'],
                    purpose: ['branchPurpose', 'branch_purpose', 'purposeName', 'purpose_name', 'purpose'],
                    bulkSpiritType: ['bulkSpiritType', 'bulk_spirit_type', 'spirit_type', 'spiritType'],
                    strengthTo: ['strength', 'strength_to', 'strengthTo', 'alcohol_strength', 'alcoholStrength'],
                    liftedFrom: ['liftedFrom', 'lifted_from', 'distilleryName', 'distillery_name'],
                    viaRoute: ['viaRoute', 'via_route', 'route', 'transport_route', 'transportRoute'],
                    checkpostEntry: ['checkPostName', 'checkpost_name', 'checkpost_entry', 'checkpostEntry', 'state'],
                    // Revalidation specific fields
                    originalPermitNo: ['ourRefNo', 'original_permit_no', 'originalPermitNo', 'permit_no', 'permitNo'],
                    originalPermitDate: ['requisitionDate', 'original_permit_date', 'originalPermitDate', 'permit_date', 'permitDate'],
                    expiryDate: ['revalidationDate', 'expiry_date', 'expiryDate', 'validity_date', 'validityDate'],
                    reasonForRevalidation: ['status', 'reason_for_revalidation', 'reasonForRevalidation', 'revalidation_reason', 'revalidationReason'],
                    newQuantity: ['totalBl', 'new_quantity', 'newQuantity', 'requested_quantity', 'requestedQuantity'],
                    newPurpose: ['branchPurpose', 'new_purpose', 'newPurpose', 'updated_purpose', 'updatedPurpose'],
                    revalidationAmount: ['revalidationBrAmount', 'revalidation_amount', 'revalidationAmount', 'revalidation_fee', 'revalidationFee']
                }
            },
            cancellation: {
                service: this.supplyChainService,
                listMethod: 'getCancellationData',
                detailMethod: 'getCancellationDetail',
                workflowId: WORKFLOW_IDS[APPLICATION_TYPES.CANCELLATION],
                fieldMappings: {
                    id: ['id'],
                    referenceNo: ['ourRefNo', 'our_ref_no', 'referenceNo', 'reference_no'],
                    submissionDate: ['requisitionDate', 'requisition_date', 'cancellationDate', 'cancellation_date', 'createdAt', 'created_at'],
                    status: ['status', 'currentStageName'],
                    currentStage: ['currentStage', 'current_stage'],
                    currentStageName: ['currentStageName', 'current_stage_name'],
                    workflowId: ['workflow', 'workflow_id', 'workflowId'],
                    distilleryName: ['distilleryName', 'distillery_name', 'liftedFrom', 'lifted_from'],
                    brAmount: ['totalCancellationAmount', 'total_cancellation_amount', 'cancellationBrAmount', 'cancellation_br_amount', 'totalBl', 'total_bl'],
                    quantity: ['totalBl', 'total_bl', 'grainEnaNumber', 'grain_ena_number', 'quantity'],
                    numberOfPermits: ['requisitonNumberOfPermits', 'requisition_number_of_permits', 'number_of_permits', 'numberOfPermits'],
                    purpose: ['branchPurpose', 'branch_purpose', 'purposeName', 'purpose_name', 'purpose'],
                    bulkSpiritType: ['bulkSpiritType', 'bulk_spirit_type', 'spirit_type', 'spiritType'],
                    strengthTo: ['strength', 'strength_to', 'strengthTo', 'alcohol_strength', 'alcoholStrength'],
                    liftedFrom: ['liftedFrom', 'lifted_from', 'distilleryName', 'distillery_name'],
                    viaRoute: ['viaRoute', 'via_route', 'route', 'transport_route', 'transportRoute'],
                    checkpostEntry: ['checkPostName', 'checkpost_name', 'checkpost_entry', 'checkpostEntry', 'state'],
                    // Cancellation specific fields
                    cancellationAmount: ['totalCancellationAmount', 'total_cancellation_amount', 'cancellationBrAmount', 'cancellation_br_amount'],
                    refundAmount: ['totalCancellationAmount', 'total_cancellation_amount', 'refund_amount', 'refundAmount'],
                    refundStatus: ['refundStatus', 'refund_status', 'status'],
                    cancellationReason: ['status', 'cancellation_reason', 'cancellationReason', 'reason'],
                    cancelledPermitNumber: ['cancelledPermitNumber', 'cancelled_permit_number'],
                    cancellationDate: ['cancellationDate', 'cancellation_date', 'requisitionDate', 'requisition_date'],
                    refundProcessedDate: ['refundProcessedDate', 'refund_processed_date'],
                    refundApprovedBy: ['refundApprovedBy', 'refund_approved_by'],
                    // Use cancelled_permit_number as originalPermitNo for cancellation
                    originalPermitNo: ['cancelledPermitNumber', 'cancelled_permit_number', 'ourRefNo', 'our_ref_no'],
                    originalPermitDate: ['cancellationEachPermitDate', 'cancellation_each_permit_date', 'requisitionDate', 'requisition_date']
                }
            },
            transit: {
                service: this.supplyChainService,
                listMethod: 'getTransitPermits',
                detailMethod: 'getTransitPermitById',
                workflowId: WORKFLOW_IDS[APPLICATION_TYPES.TRANSIT],
                fieldMappings: {
                    id: ['id'],
                    referenceNo: ['billNo', 'bill_no', 'ourRefNo', 'our_ref_no', 'referenceNo', 'reference_no'],
                    submissionDate: ['date', 'created_at', 'submission_date'],
                    status: ['status', 'currentStageName'],
                    currentStage: ['currentStage', 'current_stage'],
                    currentStageName: ['currentStageName', 'current_stage_name'],
                    workflowId: ['workflow', 'workflow_id', 'workflowId'],
                    distilleryName: ['manufacturingUnitName', 'manufacturing_unit_name', 'distillery_name', 'distilleryName'],
                    brAmount: ['totalAmount', 'total_amount', 'amount'],
                    quantity: ['cases', 'total_quantity', 'totalQuantity', 'quantity'],
                    vehicleNumber: ['vehicleNumber', 'vehicle_number', 'vehicle_no', 'vehicleNo'],
                    driverName: ['driverName', 'driver_name'],
                    driverLicense: ['driverLicenseNo', 'driver_license_no', 'driver_license', 'driverLicense', 'license_no', 'licenseNo'],
                    fromLocation: ['depotAddress', 'depot_address', 'from_location', 'fromLocation', 'source', 'origin'],
                    toLocation: ['toLocation', 'to_location', 'destination', 'dest'],
                    routeDetails: ['viaRoute', 'via_route', 'route_details', 'routeDetails', 'route', 'transport_route', 'transportRoute'],
                    checkpostEntry: ['checkpostEntryName', 'checkpost_entry_name', 'checkpost_entry', 'checkpostEntry', 'entry_checkpost', 'entryCheckpost'],
                    checkpostExit: ['checkpostExitName', 'checkpost_exit_name', 'checkpost_exit', 'checkpostExit', 'exit_checkpost', 'exitCheckpost'],
                    transporterName: ['transporterName', 'transporter_name', 'transporter'],
                    transitProducts: ['products', 'transit_products', 'transitProducts', 'product_list', 'productList'],
                    // Transit specific fields
                    permitType: ['liquorType', 'liquor_type', 'permit_type', 'permitType'],
                    brand: ['brand'],
                    sizeML: ['sizeMl', 'size_ml'],
                    bottleType: ['bottleType', 'bottle_type'],
                    brandOwner: ['brandOwner', 'brand_owner'],
                    manufacturingUnit: ['manufacturingUnitName', 'manufacturing_unit_name'],
                    educationCess: ['totalEducationCess', 'total_education_cess'],
                    exciseDuty: ['totalExciseDuty', 'total_excise_duty'],
                    additionalExcise: ['totalAdditionalExcise', 'total_additional_excise']
                }
            },
            hologram: {
                service: this.hologramDataService,
                listMethod: 'getProcurements',
                detailMethod: 'getProcurement',
                workflowId: WORKFLOW_IDS[APPLICATION_TYPES.HOLOGRAM],
                fieldMappings: {
                    id: ['id'],
                    referenceNo: ['refNo', 'ref_no', 'referenceNo', 'reference_no'],
                    submissionDate: ['date', 'created_at', 'submission_date'],
                    status: ['status'],
                    currentStage: ['currentStage', 'current_stage', 'stageId', 'stage_id'],
                    currentStageName: ['current_stage_name', 'currentStageName'],
                    workflowId: ['workflow', 'workflow_id', 'workflowId'],
                    distilleryName: ['manufacturingUnit', 'manufacturing_unit', 'licenseeName', 'licensee_name'],
                    brAmount: ['paymentAmount', 'payment_amount', 'total_amount', 'totalAmount'],
                    quantity: ['total_requested_quantity', 'localQty', 'local_qty', 'exportQty', 'export_qty', 'defenceQty', 'defence_qty']
                }
            },
            'new-license': {
                service: this,
                listMethod: 'getNewLicenseApplications',
                detailMethod: 'getNewLicenseApplicationById',
                workflowId: WORKFLOW_IDS[APPLICATION_TYPES.NEW_LICENSE],
                fieldMappings: {
                    id: ['application_id', 'applicationId', 'id'],
                    referenceNo: ['application_id', 'applicationId', 'referenceNo', 'reference_no'],
                    submissionDate: ['created_at', 'createdAt', 'updated_at', 'updatedAt'],
                    status: ['current_stage_name', 'currentStageName', 'status'],
                    currentStage: ['current_stage_id', 'currentStageId', 'current_stage', 'currentStage'],
                    currentStageName: ['current_stage_name', 'currentStageName'],
                    workflowId: ['workflow', 'workflow_id', 'workflowId'],
                    distilleryName: ['establishment_name', 'establishmentName', 'applicant_name', 'applicantName'],
                    brAmount: ['yearly_license_fee']
                }
            },
            'license-renewal': {
                service: this,
                listMethod: 'getLicenseRenewalApplications',
                detailMethod: 'getLicenseRenewalApplicationById',
                workflowId: WORKFLOW_IDS[APPLICATION_TYPES.LICENSE_RENEWAL],
                fieldMappings: {
                    id: ['application_id', 'applicationId', 'id'],
                    referenceNo: ['application_id', 'applicationId', 'referenceNo', 'reference_no'],
                    submissionDate: ['created_at', 'createdAt', 'submitted_at', 'submittedAt', 'submitted_on', 'submittedOn'],
                    status: ['current_stage_name', 'currentStageName', 'status'],
                    currentStage: ['current_stage_id', 'currentStageId', 'current_stage', 'currentStage'],
                    currentStageName: ['current_stage_name', 'currentStageName'],
                    workflowId: ['workflow', 'workflow_id', 'workflowId'],
                    distilleryName: ['establishment_name', 'establishmentName', 'applicant_name', 'applicantName'],
                    brAmount: ['yearly_license_fee']
                }
            },
            'company-registration': {
                service: this.companyRegistrationService,
                listMethod: 'getCompanyList',
                detailMethod: 'getCompanyDetail',
                workflowId: WORKFLOW_IDS[APPLICATION_TYPES.COMPANY_REGISTRATION],
                fieldMappings: {
                    id: ['id', 'applicationId', 'application_id'],
                    referenceNo: ['applicationId', 'application_id', 'id'],
                    submissionDate: ['paymentDate', 'payment_date', 'created_at', 'updated_at'],
                    status: ['current_stage_name', 'currentStageName', 'status', 'application_status', 'current_stage', 'currentStage'],
                    currentStage: ['current_stage_id', 'currentStageId', 'current_stage', 'currentStage'],
                    currentStageName: ['current_stage_name', 'currentStageName'],
                    workflowId: ['workflow_id', 'workflowId', 'workflow'],
                    distilleryName: ['companyName', 'company_name'],
                    brAmount: ['paymentAmount', 'payment_amount']
                }
            },
            'company-collaboration': {
                service: this.companyCollaborationService,
                listMethod: 'listCompanyCollaborations',
                detailMethod: 'getCompanyCollaborationDetail',
                workflowId: WORKFLOW_IDS[APPLICATION_TYPES.COMPANY_COLLABORATION],
                fieldMappings: {
                    id: ['application_id', 'applicationId', 'id'],
                    referenceNo: ['application_id', 'applicationId', 'referenceNo', 'reference_no', 'id'],
                    submissionDate: ['created_at', 'createdAt', 'updated_at', 'updatedAt'],
                    status: ['current_stage_name', 'currentStageName', 'status'],
                    currentStage: ['current_stage', 'currentStage', 'current_stage_id', 'currentStageId'],
                    currentStageName: ['current_stage_name', 'currentStageName'],
                    workflowId: ['workflow', 'workflow_id', 'workflowId'],
                    distilleryName: ['licensee_name', 'licenseeName', 'brand_owner_name', 'brandOwnerName'],
                    brAmount: ['total_amount']
                }
            },
            'salesman-barman-registration': {
                service: this.salesmanBarmanRegistrationService,
                listMethod: 'getSalesmanBarmanList',
                detailMethod: 'getSalesmanBarmanDetail',
                workflowId: WORKFLOW_IDS[APPLICATION_TYPES.SALESMAN_BARMAN_REGISTRATION],
                fieldMappings: {
                    id: ['application_id', 'applicationId', 'id'],
                    referenceNo: ['application_id', 'applicationId', 'id'],
                    submissionDate: ['created_at', 'updated_at', 'applicationDate'],
                    status: ['current_stage_name', 'current_stage', 'status'],
                    currentStageName: ['current_stage_name', 'currentStageName'],
                    distilleryName: ['license_category_name', 'licenseCategoryName', 'license_category']
                }
            }
        };
    }

    private get currentServiceConfig(): ServiceConfig {
        return this.serviceConfigs[this.applicationType];
    }

    ngOnInit(): void {
        if (!this.isBrowser) return;

        const params = this.extractRouteParams();
        if (params.ref || params.id) {
            this.applicationType = params.type;
            this.pendingOpenSupplyLetter = Boolean(params.openSupplyLetter);
            this.loadApplicationData(params.ref || '', params.id || '');
        } else {
            this.goBack();
        }
    }

    private extractRouteParams() {
        const type = this.route.snapshot.queryParamMap.get('type') as ApplicationType || 'requisition';
        const ref = this.route.snapshot.paramMap.get('ref') || this.route.snapshot.queryParamMap.get('ref');
        const id = this.route.snapshot.queryParamMap.get('id');
        const openSupplyLetter = String(this.route.snapshot.queryParamMap.get('openSupplyLetter') || '').trim();

        return { type, ref, id, openSupplyLetter };
    }

    private loadApplicationData(refNo: string, id: string): void {
        this.isLoading = true;
        this.errorMessage = '';

        const config = this.currentServiceConfig;

        if (id) {
            this.loadByIdWithFallback(config, id, refNo);
        } else {
            this.loadByReference(config, refNo);
        }
    }

    // New license adapters used by serviceConfigs
    private getNewLicenseApplications(): Observable<any> {
        return this.http.get<any>(`${environment.apiBaseUrl}/transactional/new_license_application/list/`);
    }

    private getNewLicenseApplicationById(id: string): Observable<any> {
        const encodedId = encodeURIComponent(id);
        return this.http.get<any>(`${environment.apiBaseUrl}/transactional/new_license_application/detail/${encodedId}/`);
    }

    private getLicenseRenewalApplications(): Observable<any> {
        return this.http.get<any>(`${environment.apiBaseUrl}/transactional/license_renewal_application/list/`);
    }

    private getLicenseRenewalApplicationById(id: string): Observable<any> {
        const encodedId = encodeURIComponent(id);
        return this.http.get<any>(`${environment.apiBaseUrl}/transactional/license_renewal_application/detail/${encodedId}/`);
    }

    private loadByIdWithFallback(config: ServiceConfig, id: string, refNo: string): void {
        const detailObservable = config.service[config.detailMethod](id);

        detailObservable.subscribe({
            next: (data: any) => {
                if (data) {
                    this.enrichTransitProductsIfNeeded(data, (enriched) => {
                        this.mapApplicationData(enriched, config);
                        this.isLoading = false;
                    });
                } else {
                    this.loadByReference(config, refNo);
                    this.isLoading = false;
                }
            },
            error: (error: any) => {
                this.loadByReference(config, refNo);
                this.isLoading = false;
            }
        });
    }

    private loadByReference(config: ServiceConfig, refNo: string): void {
        const listObservable = config.service[config.listMethod]();

        listObservable.subscribe({
            next: (data: any) => {
                const items = Array.isArray(data) ? data : (data.results || []);

                if (items.length === 0) {
                    this.errorMessage = `No ${this.applicationType} data available.`;
                    this.isLoading = false;
                    return;
                }

                const foundItem = this.findItemByReference(items, refNo, config.fieldMappings.referenceNo);

                if (foundItem) {
                    this.enrichTransitProductsIfNeeded(foundItem, (enriched) => {
                        this.mapApplicationData(enriched, config);
                        this.isLoading = false;
                    });
                } else {
                    this.errorMessage = `${this.applicationType} not found in available data.`;
                    this.isLoading = false;
                }
            },
            error: (err: any) => {
                this.errorMessage = `Could not load ${this.applicationType} details from server.`;
                this.isLoading = false;
            }
        });
    }

    private enrichTransitProductsIfNeeded(apiData: any, done: (enriched: any) => void): void {
        if (this.applicationType !== 'transit') {
            done(apiData);
            return;
        }

        if (!apiData) {
            done(apiData);
            return;
        }

        const existingProducts = this.extractFieldValue(apiData, [
            'products',
            'transit_products',
            'transitProducts',
            'product_list',
            'productList',
        ]);
        if (Array.isArray(existingProducts) && existingProducts.length > 0) {
            done(apiData);
            return;
        }

        const billNo =
            this.extractFieldValue(apiData, ['billNo', 'bill_no', 'ourRefNo', 'our_ref_no', 'referenceNo', 'reference_no']) ||
            '';
        const billNoToken = String(billNo || '').trim();
        if (!billNoToken) {
            done(apiData);
            return;
        }

        // Transit permits can be stored as multiple rows with the same `bill_no` (one row per brand).
        // When loading a single row by `id`, fetch the full set and attach as `products` for the UI.
        this.supplyChainService.getTransitPermits(billNoToken).subscribe({
            next: (rows: any[]) => {
                if (Array.isArray(rows) && rows.length > 0) {
                    done({ ...apiData, products: rows });
                } else {
                    done(apiData);
                }
            },
            error: () => done(apiData),
        });
    }

    private mapApplicationData(apiData: any, config: ServiceConfig): void {
        if (!apiData) {
            return;
        }

        const rawCurrentStage = this.extractFieldValue(apiData, config.fieldMappings.currentStage || [])
            ?? apiData.stage_id
            ?? apiData.stageId;

        const rawWorkflowId = this.extractFieldValue(apiData, config.fieldMappings.workflowId || [])
            ?? apiData.workflow_id
            ?? apiData.workflow;

        const allowedActions = this.extractAllowedActions(apiData);
        const allowedActionConfigs = this.extractAllowedActionConfigs(apiData);

        const mappedData: UnifiedApplicationData = {
            id: this.extractFieldValue(apiData, config.fieldMappings.id)?.toString() || '',
            referenceNo: this.extractFieldValue(apiData, config.fieldMappings.referenceNo)?.toString() || '',
            submissionDate: this.parseDate(this.extractFieldValue(apiData, config.fieldMappings.submissionDate)),
            status: this.extractFieldValue(apiData, config.fieldMappings.status)?.toString() || 'PENDING',
            currentStage: this.parseId(rawCurrentStage),
            currentStageName: this.extractFieldValue(apiData, config.fieldMappings.currentStageName || []),
            workflowId: this.parseId(rawWorkflowId) || config.workflowId,
            allowedActions,
            allowedActionConfigs
        };

        // For workflows where backend often sends generic "PENDING" or a raw stage ID,
        // resolve the real status name for user-facing display.
        if (
            this.applicationType === 'salesman-barman-registration' ||
            this.applicationType === 'company-registration' ||
            this.applicationType === 'company-collaboration'
        ) {
            // Stage ID → human-readable status name mapping
            const stageIdToStatusName: { [key: number]: string } = {
                1: 'applicant_applied', 2: 'level_1', 3: 'level_2', 4: 'level_3', 5: 'level_4', 6: 'level_5',
                7: 'level_1_objection', 8: 'level_2_objection', 9: 'level_3_objection',
                10: 'level_4_objection', 11: 'level_5_objection',
                12: 'approved', 13: 'applicant_applied', 14: 'level_1', 15: 'level_2', 16: 'approved',
                23: 'awaiting_payment', 24: 'rejected_by_level_1', 25: 'rejected_by_level_2',
                26: 'rejected_by_level_3', 27: 'rejected_by_level_4', 28: 'rejected_by_level_5',
                29: 'rejected', 30: 'objection_raised', 31: 'awaiting_payment'
            };

            const rawStatus = String(mappedData.status || '');
            const stageNum = parseInt(rawStatus, 10);

            if (!isNaN(stageNum) && stageIdToStatusName[stageNum]) {
                // Status is a raw numeric stage ID — map it to a name
                mappedData.status = stageIdToStatusName[stageNum];
            } else if (!rawStatus || rawStatus.toUpperCase() === 'PENDING') {
                // Status is empty or generic PENDING — prefer currentStageName if available
                if (mappedData.currentStageName) {
                    mappedData.status = String(mappedData.currentStageName);
                } else if (mappedData.currentStage && stageIdToStatusName[mappedData.currentStage]) {
                    mappedData.status = stageIdToStatusName[mappedData.currentStage];
                }
            }
        }

        Object.keys(apiData).forEach(key => {
            if (!mappedData.hasOwnProperty(key)) {
                mappedData[key] = apiData[key];
            }
        });

        this.addComputedFields(mappedData, apiData, config);

        this.applicationData = mappedData;
        this.resetSiteEnquiryReportState();
        this.calculateNewLicenseUploads();
        this.loadObjectionsForCurrentApplication();
        this.loadWorkflowActions();

        if (this.pendingOpenSupplyLetter) {
            this.pendingOpenSupplyLetter = false;
            if (this.shouldShowSupplyOrderLetterButton()) {
                // Open on next tick so bindings settle (modal uses model computed from applicationData).
                setTimeout(() => this.openSupplyOrderLetter(), 0);
            }
        }
    }

    private canonicalFieldName(value: unknown): string {
        const raw = String(value ?? '').trim();
        if (!raw) return '';
        if (raw.includes('_')) return raw.toLowerCase();
        return raw.replace(/([A-Z])/g, '_$1').toLowerCase();
    }

    private rebuildObjectionIndex(): void {
        this.objectionIndex = new Map();
        for (const obj of this.objections || []) {
            const key = this.canonicalFieldName((obj as any)?.fieldName);
            if (!key) continue;
            const entry = this.objectionIndex.get(key) || { hasUnresolved: false, hasResolved: false };
            if ((obj as any)?.isResolved) entry.hasResolved = true;
            else entry.hasUnresolved = true;
            this.objectionIndex.set(key, entry);
        }
    }

    private loadObjectionsForCurrentApplication(): void {
        const appId = String(this.applicationData?.referenceNo || this.applicationData?.id || '').trim();
        if (!appId) {
            this.objections = [];
            this.rebuildObjectionIndex();
            return;
        }

        this.unifiedDashboardService.getObjections(appId).subscribe({
            next: (data) => {
                this.objections = Array.isArray(data) ? data : [];
                this.rebuildObjectionIndex();
                this.cdr.detectChanges();
            },
            error: () => {
                this.objections = [];
                this.rebuildObjectionIndex();
            }
        });
    }

    hasAnyUnresolvedObjections(): boolean {
        for (const v of this.objectionIndex.values()) {
            if (v.hasUnresolved) return true;
        }
        return false;
    }

    unresolvedObjectionCount(): number {
        let count = 0;
        for (const obj of this.objections || []) {
            if (obj && !(obj as any).isResolved) count += 1;
        }
        return count;
    }

    objectionStateForField(fieldKey: string): 'none' | 'unresolved' | 'resolved' {
        const key = this.canonicalFieldName(fieldKey);
        const entry = this.objectionIndex.get(key);
        if (!entry) return 'none';
        if (entry.hasUnresolved) return 'unresolved';
        if (entry.hasResolved) return 'resolved';
        return 'none';
    }

    objectionStateForDocLabel(label: string): 'none' | 'unresolved' | 'resolved' {
        const byLabel: Record<string, string> = {
            'Passport Photo': 'pass_photo',
            'PAN Card': 'pan_card',
            'Sikkim Certificate': 'sikkim_certificate',
            'DOB Proof': 'dob_proof',
            'NOC from Landlord': 'noc_landlord',
        };
        const key = byLabel[String(label || '').trim()] || '';
        return key ? this.objectionStateForField(key) : 'none';
    }

    objectionStateForAny(fields: string[]): 'none' | 'unresolved' | 'resolved' {
        const list = Array.isArray(fields) ? fields : [];
        let hasResolved = false;
        for (const f of list) {
            const state = this.objectionStateForField(String(f || ''));
            if (state === 'unresolved') return 'unresolved';
            if (state === 'resolved') hasResolved = true;
        }
        return hasResolved ? 'resolved' : 'none';
    }

    private addComputedFields(mappedData: UnifiedApplicationData, apiData: any, config: ServiceConfig): void {
        if (config.fieldMappings.distilleryName) {
            const distilleryName = this.extractFieldValue(apiData, config.fieldMappings.distilleryName);
            mappedData['distilleryName'] = distilleryName || '';
        }

        if (config.fieldMappings.brAmount) {
            const brAmount = this.parseNumericValue(
                this.extractFieldValue(apiData, config.fieldMappings.brAmount)
            );
            mappedData['brAmount'] = brAmount;
        }

        if (config.fieldMappings.quantity) {
            const quantity = this.parseNumericValue(
                this.extractFieldValue(apiData, config.fieldMappings.quantity)
            );
            mappedData['quantity'] = quantity;
        }

        if (config.fieldMappings.numberOfPermits) {
            const numberOfPermits = this.parseNumericValue(
                this.extractFieldValue(apiData, config.fieldMappings.numberOfPermits), 1
            );
            mappedData['numberOfPermits'] = numberOfPermits;
        }

        if (config.fieldMappings.purpose) {
            const purpose = this.extractFieldValue(apiData, config.fieldMappings.purpose);
            mappedData['purpose'] = purpose || '';
        }

        if (config.fieldMappings.bulkSpiritType) {
            const bulkSpiritType = this.extractFieldValue(apiData, config.fieldMappings.bulkSpiritType);
            mappedData['bulkSpiritType'] = bulkSpiritType || '';
        }

        if (config.fieldMappings.strengthTo) {
            const strengthTo = this.extractFieldValue(apiData, config.fieldMappings.strengthTo);
            mappedData['strengthTo'] = strengthTo || '';
        }

        if (config.fieldMappings.liftedFrom) {
            const liftedFrom = this.extractFieldValue(apiData, config.fieldMappings.liftedFrom);
            mappedData['liftedFrom'] = liftedFrom || '';
        }

        if (config.fieldMappings.viaRoute) {
            const viaRoute = this.extractFieldValue(apiData, config.fieldMappings.viaRoute);
            mappedData['viaRoute'] = viaRoute || '';
        }

        if (config.fieldMappings.checkpostEntry) {
            const checkpostEntry = this.extractFieldValue(apiData, config.fieldMappings.checkpostEntry);
            mappedData['checkpostEntry'] = checkpostEntry || '';
        }

        this.addTypeSpecificFields(mappedData, apiData, config);
    }

    /**
     * Add type-specific computed fields
     */
    private addTypeSpecificFields(mappedData: UnifiedApplicationData, apiData: any, config: ServiceConfig): void {
        switch (this.applicationType) {
            case 'requisition':
                mappedData['rejectedByDisplay'] = this.resolveRejectedByDisplay(apiData, mappedData);
                mappedData['cancellationReasonDisplay'] = this.extractFieldValue(apiData, [
                    'cancellationReasonDisplay',
                    'cancellation_reason_display',
                    'cancellation_reason',
                    'cancellationReason',
                    'reason'
                ]) || '';
                break;

            case 'revalidation':
                mappedData['originalPermitNo'] = mappedData.referenceNo;
                mappedData['originalPermitDate'] = mappedData.submissionDate;

                const revalidationTotalBl = this.parseNumericValue(this.extractFieldValue(apiData, ['totalBl', 'total_bl']));
                const revalidationBrAmount = this.parseNumericValue(this.extractFieldValue(apiData, ['revalidationBrAmount', 'revalidation_br_amount']));

                if (revalidationTotalBl > 0) {
                    mappedData['brAmount'] = revalidationTotalBl;
                }

                if (revalidationBrAmount > 0) {
                    mappedData['revalidationAmount'] = revalidationBrAmount;
                } else {
                    mappedData['revalidationAmount'] = 1000;
                }

                const revalidationStatus = mappedData.status || '';
                if (revalidationStatus && revalidationStatus !== 'PENDING' && revalidationStatus.length > 10) {
                    mappedData['reasonForRevalidation'] = revalidationStatus;
                } else {
                    mappedData['reasonForRevalidation'] = 'Permit revalidation requested';
                }

                const revalidationDate = this.extractFieldValue(apiData, ['revalidationDate', 'revalidation_date']);
                if (revalidationDate) {
                    mappedData['expiryDate'] = this.parseDate(revalidationDate);
                }

                mappedData['newQuantity'] = mappedData['quantity'];
                mappedData['newPurpose'] = mappedData['purpose'];

                if (!mappedData['checkpostEntry'] || mappedData['checkpostEntry'] === '') {
                    const revalidationState = this.extractFieldValue(apiData, ['state']);
                    mappedData['checkpostEntry'] = revalidationState ? `${revalidationState} Border` : 'Not specified';
                }
                break;

            case 'cancellation':
                const cancelledPermitNumber = this.extractFieldValue(apiData, ['cancelledPermitNumber', 'cancelled_permit_number']);
                if (cancelledPermitNumber) {
                    mappedData['originalPermitNo'] = cancelledPermitNumber;
                } else {
                    mappedData['originalPermitNo'] = mappedData.referenceNo;
                }

                const cancellationEachPermitDate = this.extractFieldValue(apiData, ['cancellationEachPermitDate', 'cancellation_each_permit_date']);
                if (cancellationEachPermitDate) {
                    mappedData['originalPermitDate'] = this.parseDate(cancellationEachPermitDate);
                } else {
                    mappedData['originalPermitDate'] = mappedData.submissionDate;
                }

                const cancellationTotalAmount = this.parseNumericValue(
                    this.extractFieldValue(apiData, ['totalCancellationAmount', 'total_cancellation_amount'])
                );
                const cancellationBrAmount = this.parseNumericValue(
                    this.extractFieldValue(apiData, ['cancellationBrAmount', 'cancellation_br_amount'])
                );
                const cancellationTotalBl = this.parseNumericValue(this.extractFieldValue(apiData, ['totalBl', 'total_bl']));

                if (cancellationTotalAmount > 0) {
                    mappedData['cancellationAmount'] = cancellationTotalAmount;
                    mappedData['refundAmount'] = cancellationTotalAmount;
                    mappedData['brAmount'] = cancellationTotalAmount;
                } else if (cancellationBrAmount > 0) {
                    mappedData['cancellationAmount'] = cancellationBrAmount;
                    mappedData['refundAmount'] = cancellationBrAmount;
                    mappedData['brAmount'] = cancellationBrAmount;
                } else if (cancellationTotalBl > 0) {
                    mappedData['cancellationAmount'] = cancellationTotalBl;
                    mappedData['refundAmount'] = cancellationTotalBl;
                    mappedData['brAmount'] = cancellationTotalBl;
                }

                const refundProcessedDate = this.extractFieldValue(apiData, ['refundProcessedDate', 'refund_processed_date']);
                if (refundProcessedDate) {
                    mappedData['refundStatus'] = 'PROCESSED';
                } else {
                    mappedData['refundStatus'] = 'PENDING';
                }

                const cancellationStatus = mappedData.status || '';
                if (cancellationStatus && cancellationStatus !== 'PENDING' && cancellationStatus.length > 5) {
                    mappedData['cancellationReason'] = cancellationStatus;
                } else {
                    mappedData['cancellationReason'] = 'Permit cancellation requested';
                }

                mappedData['cancelledPermitNumber'] = cancelledPermitNumber || mappedData.referenceNo;

                if (!mappedData['checkpostEntry'] || mappedData['checkpostEntry'] === '') {
                    const cancellationState = this.extractFieldValue(apiData, ['state']);
                    mappedData['checkpostEntry'] = cancellationState ? `${cancellationState} Border` : 'Not specified';
                }
                break;

            case 'transit':
                mappedData['vehicleNumber'] = this.extractFieldValue(apiData, ['vehicleNumber', 'vehicle_number']);
                mappedData['driverName'] = this.extractFieldValue(apiData, ['driverName', 'driver_name']);
                mappedData['driverLicense'] = this.extractFieldValue(apiData, ['driverLicenseNo', 'driver_license_no', 'driver_license', 'driverLicense']);
                mappedData['fromLocation'] = this.extractFieldValue(apiData, ['depotAddress', 'depot_address', 'from_location', 'fromLocation']);
                mappedData['toLocation'] = this.extractFieldValue(apiData, ['toLocation', 'to_location']);
                mappedData['routeDetails'] = this.extractFieldValue(apiData, ['viaRoute', 'via_route', 'route_details', 'routeDetails']);
                mappedData['checkpostEntry'] = this.extractFieldValue(apiData, ['checkpostEntryName', 'checkpost_entry_name', 'checkpost_entry', 'checkpostEntry']);
                mappedData['checkpostExit'] = this.extractFieldValue(apiData, ['checkpostExitName', 'checkpost_exit_name', 'checkpost_exit', 'checkpostExit']);
                mappedData['transporterName'] = this.extractFieldValue(apiData, ['transporterName', 'transporter_name']);

                mappedData['permitType'] = this.extractFieldValue(apiData, ['liquorType', 'liquor_type', 'permit_type', 'permitType']);
                mappedData['brand'] = this.extractFieldValue(apiData, ['brand']);
                mappedData['sizeML'] = this.parseNumericValue(this.extractFieldValue(apiData, ['sizeMl', 'size_ml']));
                mappedData['bottleType'] = this.extractFieldValue(apiData, ['bottleType', 'bottle_type']);
                mappedData['brandOwner'] = this.extractFieldValue(apiData, ['brandOwner', 'brand_owner']);
                mappedData['manufacturingUnit'] = this.extractFieldValue(apiData, ['manufacturingUnitName', 'manufacturing_unit_name']);

                mappedData['educationCess'] = this.parseNumericValue(this.extractFieldValue(apiData, ['totalEducationCess', 'total_education_cess']));
                mappedData['exciseDuty'] = this.parseNumericValue(this.extractFieldValue(apiData, ['totalExciseDuty', 'total_excise_duty']));
                mappedData['additionalExcise'] = this.parseNumericValue(this.extractFieldValue(apiData, ['totalAdditionalExcise', 'total_additional_excise']));

                const rawTransitProducts = this.extractFieldValue(apiData, [
                    'products',
                    'transit_products',
                    'transitProducts',
                    'product_list',
                    'productList',
                ]);

                if (Array.isArray(rawTransitProducts) && rawTransitProducts.length > 0) {
                    const normalizedProducts = rawTransitProducts
                        .map((p: any, index: number) => {
                            if (!p) return null;

                            const brand = this.extractFieldValue(p, ['brand', 'brand_name', 'brandName']);
                            const sizeML = this.parseNumericValue(
                                this.extractFieldValue(p, ['sizeML', 'size_ml', 'sizeMl', 'ml', 'size'])
                            );
                            const bottleType = this.extractFieldValue(p, ['bottleType', 'bottle_type']);
                            const liquorType = this.extractFieldValue(p, ['liquorType', 'liquor_type', 'permitType', 'permit_type', 'type']);
                            const brandOwner = this.extractFieldValue(p, ['brandOwner', 'brand_owner', 'brandOwnerName', 'brand_owner_name']);
                            const manufacturingUnit = this.extractFieldValue(p, ['manufacturingUnit', 'manufacturing_unit', 'manufacturingUnitName', 'manufacturing_unit_name']);
                            const cases = this.parseNumericValue(
                                this.extractFieldValue(p, ['cases', 'case', 'quantity', 'qty', 'no_of_cases', 'noOfCases'])
                            );

                            // Per-case charges (best-effort); fallback to request totals if missing.
                            const educationCessPerCase = this.parseNumericValue(
                                this.extractFieldValue(p, [
                                    'educationCess',
                                    'education_cess',
                                    'education_cess_per_case',
                                    'educationCessPerCase',
                                    'education_cess_rs_per_case',
                                ]),
                                this.parseNumericValue(mappedData['educationCess'])
                            );
                            const exciseDutyPerCase = this.parseNumericValue(
                                this.extractFieldValue(p, [
                                    'exciseDuty',
                                    'excise_duty',
                                    'excise_duty_per_case',
                                    'exciseDutyPerCase',
                                    'excise_duty_rs_per_case',
                                ]),
                                this.parseNumericValue(mappedData['exciseDuty'])
                            );
                            const additionalExcisePerCase = this.parseNumericValue(
                                this.extractFieldValue(p, [
                                    'additionalExcise',
                                    'additional_excise',
                                    'additional_excise_per_case',
                                    'additionalExcisePerCase',
                                    'additional_excise_duty_rs_per_case',
                                    'additional_excise_duty_per_case',
                                ]),
                                this.parseNumericValue(mappedData['additionalExcise'])
                            );

                            const totalAmount = this.parseNumericValue(
                                this.extractFieldValue(p, ['totalAmount', 'total_amount', 'amount', 'brAmount', 'br_amount']),
                                (educationCessPerCase + exciseDutyPerCase + additionalExcisePerCase) * (cases || 0)
                            );

                            return {
                                id:
                                    this.parseNumericValue(this.extractFieldValue(p, ['id']), Number(mappedData.id) || 0) ||
                                    (Number(mappedData.id) || 0) * 1000 + index,
                                brand,
                                sizeML,
                                bottleType,
                                liquorType: liquorType || mappedData['permitType'],
                                brandOwner,
                                manufacturingUnit,
                                cases,
                                educationCess: educationCessPerCase,
                                exciseDuty: exciseDutyPerCase,
                                additionalExcise: additionalExcisePerCase,
                                totalAmount,
                            };
                        })
                        .filter(Boolean);

                    mappedData['transitProducts'] = normalizedProducts;

                    const totalCases = normalizedProducts.reduce((sum: number, p: any) => sum + (Number(p?.cases || 0) || 0), 0);
                    mappedData['quantity'] = totalCases;
                    mappedData['educationCess'] = normalizedProducts.reduce(
                        (sum: number, p: any) => sum + (Number(p?.educationCess || 0) || 0) * (Number(p?.cases || 0) || 0),
                        0
                    );
                    mappedData['exciseDuty'] = normalizedProducts.reduce(
                        (sum: number, p: any) => sum + (Number(p?.exciseDuty || 0) || 0) * (Number(p?.cases || 0) || 0),
                        0
                    );
                    mappedData['additionalExcise'] = normalizedProducts.reduce(
                        (sum: number, p: any) => sum + (Number(p?.additionalExcise || 0) || 0) * (Number(p?.cases || 0) || 0),
                        0
                    );
                    mappedData['brAmount'] = normalizedProducts.reduce((sum: number, p: any) => sum + (Number(p?.totalAmount || 0) || 0), 0);
                } else {
                    const transitProduct = {
                        id: mappedData.id,
                        brand: mappedData['brand'],
                        sizeML: mappedData['sizeML'],
                        bottleType: mappedData['bottleType'],
                        liquorType: mappedData['permitType'],
                        brandOwner: mappedData['brandOwner'],
                        manufacturingUnit: mappedData['manufacturingUnit'],
                        cases: mappedData['quantity'],
                        educationCess: mappedData['educationCess'],
                        exciseDuty: mappedData['exciseDuty'],
                        additionalExcise: mappedData['additionalExcise'],
                        totalAmount: mappedData['brAmount']
                    };
                    mappedData['transitProducts'] = [transitProduct];
                }

                // Approved / Cancelled by OIC — from serializer method fields
                mappedData['approvedByDisplay'] = this.extractFieldValue(apiData, ['approvedByDisplay', 'approved_by_display']) || '';
                mappedData['cancelledByDisplay'] = this.extractFieldValue(apiData, ['cancelledByDisplay', 'cancelled_by_display']) || '';
                mappedData['cancelledReasonDisplay'] = this.extractFieldValue(apiData, ['cancelledReasonDisplay', 'cancelled_reason_display']) || '';
                break;

            case 'hologram':
                mappedData['localQty'] = this.parseNumericValue(
                    this.extractFieldValue(apiData, ['requested_local_qty', 'localQty', 'local_qty'])
                );
                mappedData['exportQty'] = this.parseNumericValue(
                    this.extractFieldValue(apiData, ['requested_export_qty', 'exportQty', 'export_qty'])
                );
                mappedData['defenceQty'] = this.parseNumericValue(
                    this.extractFieldValue(apiData, ['requested_defence_qty', 'defenceQty', 'defence_qty'])
                );
                mappedData['totalQty'] = this.parseNumericValue(
                    this.extractFieldValue(apiData, ['total_requested_quantity']),
                    (mappedData['localQty'] || 0) + (mappedData['exportQty'] || 0) + (mappedData['defenceQty'] || 0)
                );
                mappedData['quantity'] = mappedData['totalQty'];
                mappedData['paymentAmount'] = this.parseNumericValue(
                    this.extractFieldValue(apiData, ['paymentAmount', 'payment_amount']),
                    (mappedData['totalQty'] || 0) * 0.15
                );
                if (!mappedData['brAmount']) {
                    mappedData['brAmount'] = mappedData['paymentAmount'];
                }
                break;
            case 'new-license':
                mappedData['distilleryName'] =
                    this.extractFieldValue(apiData, ['establishment_name', 'establishmentName']) ||
                    this.extractFieldValue(apiData, ['applicant_name', 'applicantName']) ||
                    'Not specified';
                mappedData['brAmount'] = this.parseNumericValue(
                    this.extractFieldValue(apiData, ['yearly_license_fee', 'yearlyLicenseFee'])
                );
                break;
            case 'company-registration':
                mappedData['distilleryName'] =
                    this.extractFieldValue(apiData, ['companyName', 'company_name']) || 'Not specified';
                mappedData['brAmount'] = this.parseNumericValue(
                    this.extractFieldValue(apiData, ['paymentAmount', 'payment_amount'])
                );
                break;
            case 'company-collaboration':
                const overviewSummary = apiData?.overview_summary ?? apiData?.overviewSummary ?? {};
                const feeStructure = apiData?.fee_structure ?? apiData?.feeStructure ?? {};
                mappedData['distilleryName'] =
                    this.extractFieldValue(apiData, ['licensee_name', 'licenseeName', 'brand_owner_name', 'brandOwnerName']) ||
                    'Not specified';
                mappedData['brAmount'] = this.parseNumericValue(
                    overviewSummary?.totalAmount ??
                    overviewSummary?.total_amount ??
                    feeStructure?.totalAmount ??
                    feeStructure?.total_amount,
                    this.parseNumericValue(feeStructure?.applicationFee) +
                    this.parseNumericValue(feeStructure?.application_fee) +
                    this.parseNumericValue(feeStructure?.collaborationFee) +
                    this.parseNumericValue(feeStructure?.collaboration_fee) +
                    this.parseNumericValue(feeStructure?.collaborationFees) +
                    this.parseNumericValue(feeStructure?.collaboration_fees) +
                    this.parseNumericValue(feeStructure?.securityDeposit) +
                    this.parseNumericValue(feeStructure?.security_deposit)
                );
                break;
            case 'salesman-barman-registration':
                mappedData['distilleryName'] =
                    this.extractFieldValue(apiData, ['license_category_name', 'licenseCategoryName', 'license_category']) ||
                    'Not specified';
                break;
        }
    }

    private findItemByReference(items: any[], refNo: string, referenceFields: string[]): any {
        const decodedRefNo = decodeURIComponent(refNo || '');
        const targetRef = String(refNo || '');
        const decodedTargetRef = String(decodedRefNo || '');

        for (const field of referenceFields) {
            const foundItem = items.find((item: any) =>
                String(item[field] ?? '') === targetRef || String(item[field] ?? '') === decodedTargetRef
            );
            if (foundItem) return foundItem;
        }

        for (const field of referenceFields) {
            const foundItem = items.find((item: any) =>
                String(item[field] ?? '') && (
                    String(item[field] ?? '').includes(targetRef) ||
                    String(item[field] ?? '').includes(decodedTargetRef)
                )
            );
            if (foundItem) return foundItem;
        }

        if (items.length > 0) {
            return items[0];
        }

        return null;
    }

    private parseDate(value: any): Date {
        if (!value) return new Date();
        if (value instanceof Date) return value;

        const parsed = new Date(value);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
    }

    private resolveRejectedByDisplay(apiData: any, mappedData: any): string {
        const directValue = this.extractFieldValue(apiData, [
            'rejectedByDisplay',
            'rejected_by_display',
            'rejectedBy',
            'rejected_by',
            'rejectedByRole',
            'rejected_by_role'
        ]);
        if (this.hasText(directValue)) {
            return String(directValue).trim();
        }

        const stageText = String(
            mappedData?.currentStageName ??
            apiData?.current_stage_name ??
            apiData?.currentStageName ??
            ''
        ).trim();
        const statusText = String(mappedData?.status ?? apiData?.status ?? '').trim();

        return this.extractRejectedByFromStageToken(stageText) || this.extractRejectedByFromStageToken(statusText);
    }

    private extractRejectedByFromStageToken(value: string): string {
        if (!this.hasText(value)) return '';

        const match = String(value).match(/rejected(?:\s*|_|-)?by(?:\s*|_|-)?(.+)$/i);
        if (!match?.[1]) return '';

        const roleToken = String(match[1]).replace(/[_-]+/g, ' ').trim();
        if (!this.hasText(roleToken)) return '';

        return roleToken
            .split(' ')
            .filter(Boolean)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    private extractFieldValue(apiData: any, fieldMappings: string[]): any {
        for (const field of fieldMappings) {
            if (apiData[field] !== undefined && apiData[field] !== null && apiData[field] !== '') {
                return apiData[field];
            }
        }
        return null;
    }

    private parseNumericValue(value: any, defaultValue: number = 0): number {
        if (value === null || value === undefined || value === '') return defaultValue;

        // Handle string numbers
        if (typeof value === 'string') {
            const parsed = parseFloat(value);
            return isNaN(parsed) ? defaultValue : parsed;
        }

        // Handle numeric values
        if (typeof value === 'number') {
            return isNaN(value) ? defaultValue : value;
        }

        // Try to convert other types
        const parsed = parseFloat(value.toString());
        return isNaN(parsed) ? defaultValue : parsed;
    }

    private parseId(value: any): number | undefined {
        if (value === null || value === undefined || value === '') return undefined;
        if (typeof value === 'object' && value !== null) {
            const maybeId = (value as any).id;
            if (maybeId !== undefined && maybeId !== null && maybeId !== '') {
                return this.parseId(maybeId);
            }
        }
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }

    getCompanyCollaborationBrands(): any[] {
        const selectedBrands =
            this.applicationData?.['selected_brands'] ??
            this.applicationData?.['selectedBrands'] ??
            [];
        return Array.isArray(selectedBrands) ? selectedBrands : [];
    }

    getDocumentUrl(value: any): string {
        const raw = String(value || '').trim();
        if (!raw) {
            return '';
        }

        if (/^https?:\/\//i.test(raw)) {
            return raw;
        }

        const baseUrl = String(environment.apiBaseUrl || '').replace(/\/+$/, '');
        const path = raw.replace(/^\/+/, '');
        return `${baseUrl}/${path}`;
    }

    private extractAllowedActions(apiData: any): string[] {
        const actions = apiData?.allowedActions ?? apiData?.allowed_actions ?? [];
        if (!Array.isArray(actions)) return [];
        return actions.map((action: any) => String(action).toUpperCase());
    }

    private extractAllowedActionConfigs(apiData: any): ActionButtonConfig[] {
        const configs = apiData?.allowedActionConfigs ?? apiData?.allowed_action_configs ?? [];
        return Array.isArray(configs) ? configs : [];
    }

    /**
     * Load workflow actions from backend
     * Prepare the data for unified-action-buttons component
     */
    private loadWorkflowActions(): void {
        if (!this.applicationData) return;

        const currentStage = this.parseId(this.applicationData.currentStage ?? (this.applicationData as any).stage_id);
        const workflowId = this.parseId((this.applicationData as any).workflow_id ?? (this.applicationData as any).workflow ?? this.applicationData.workflowId);

        this.applicationData.workflowId = workflowId || this.currentServiceConfig.workflowId;
        this.applicationData.currentStage = currentStage || 1;

        if (!this.applicationData.allowedActionConfigs || this.applicationData.allowedActionConfigs.length === 0) {
            const fallbackConfigs = this.extractAllowedActionConfigs(this.applicationData);
            if (fallbackConfigs.length > 0) {
                this.applicationData.allowedActionConfigs = fallbackConfigs;
            }
        }
    }

    getUserContext(): UserContext {
        const source = this.route.snapshot.queryParamMap.get('source');

        const contextMap: { [key: string]: UserContext } = {
            'commissioner-dashboard': USER_CONTEXTS.COMMISSIONER,
            'commissioner': USER_CONTEXTS.COMMISSIONER,
            'permit-section': USER_CONTEXTS.PERMIT_SECTION,
            'officer-in-charge': USER_CONTEXTS.OFFICER_IN_CHARGE,
            'itcell': USER_CONTEXTS.IT_CELL,
            'it-cell': USER_CONTEXTS.IT_CELL,
            'licensee-dashboard': USER_CONTEXTS.LICENSEE,
            'licensee': USER_CONTEXTS.LICENSEE
        };

        if (source && contextMap[source]) {
            return contextMap[source];
        }

        // Fallback: determine from current URL path
        const currentUrl = this.router.url;
        if (currentUrl.includes('commissioner')) return USER_CONTEXTS.COMMISSIONER;
        if (currentUrl.includes('permit-section')) return USER_CONTEXTS.PERMIT_SECTION;
        if (currentUrl.includes('dashboard') && currentUrl.includes('section=')) return USER_CONTEXTS.LICENSEE;

        return USER_CONTEXTS.LICENSEE; // Default context
    }

    isLicenseeContext(): boolean {
        return this.getUserContext() === USER_CONTEXTS.LICENSEE;
    }

    onUnifiedAction(event: { action: string, item: any }): void {
        const context = this.getUserContext();
        const action = (event.action || '').toUpperCase();

        if (action === 'APPROVE') {
            this.handleApproveWithDynamicPrechecks(event.item, context);
            return;
        }

        if (action === 'FORWARD' && this.isCurrentStageSiteEnquiry()) {
            const applicationId = this.getWorkflowApplicationId(event.item);
            if (!applicationId) {
                this.snackBar.open('Application ID not found for site enquiry.', 'Close', { duration: 4000 });
                return;
            }
            this.openSiteEnquiryAndProcessAction(event.item, context, applicationId, 'FORWARD');
            return;
        }

        if (action === 'UPDATE_ARRIVAL') {
            this.navigateToRequisitionArrivalUpdate(event.item);
            return;
        }

        this.unifiedActionsService.executeAction(action, event.item, this.applicationType, context).subscribe({
            next: (result: any) => {
                const isSuccess = result?.success !== false;
                if (isSuccess) {
                    if (result.message) {
                        this.snackBar.open(result.message, 'Close', { duration: 3000 });
                    }
                    if ([
                        'APPROVE', 'REJECT', 'FORWARD', 'RAISE_OBJECTION', 'VERIFY', 'ISSUE',
                        'COMPLETE', 'ASSIGN_CARTONS', 'PAY',
                        'SUBMITPAYSLIP', 'APPROVEPAYSLIP', 'REJECTPAYSLIP'
                    ].includes(action)) {
                        const currentId = this.applicationData?.id?.toString() || '';
                        const currentRef = this.applicationData?.referenceNo || '';
                        this.loadApplicationData(currentRef, currentId);
                    }
                } else {
                    this.snackBar.open(result.message || 'Action failed', 'Close', { duration: 4000 });
                }
            },
            error: (error: any) => {
                console.error('Action failed:', error);
                this.snackBar.open(this.extractHttpErrorMessage(error, 'Action failed'), 'Close', { duration: 4500 });
            }
        });
    }

    private handleApproveWithDynamicPrechecks(item: any, context: UserContext): void {
        const applicationId = this.getWorkflowApplicationId(item);
        if (!applicationId) {
            this.snackBar.open('Application ID not found for site enquiry.', 'Close', { duration: 4000 });
            return;
        }

        this.http.get<any[]>(`${environment.apiBaseUrl}/auth/${encodeURIComponent(applicationId)}/next-stages/`).subscribe({
            next: (stages: any[]) => {
                if (this.hasApproveSiteEnquiryRequirement(stages)) {
                    this.openSiteEnquiryAndApprove(item, context, applicationId);
                    return;
                }

                this.continueApprovalWithOptionalNewLicenseFeeDialog(item, context, applicationId);
            },
            error: () => {
                if (this.isCurrentStageSiteEnquiry()) {
                    this.openSiteEnquiryAndApprove(item, context, applicationId);
                    return;
                }
                this.continueApprovalWithOptionalNewLicenseFeeDialog(item, context, applicationId);
            }
        });
    }

    private hasApproveSiteEnquiryRequirement(stages: any[]): boolean {
        if (this.applicationType !== 'new-license') {
            return false;
        }
        if (this.isCurrentStageSiteEnquiry()) {
            return true;
        }
        if (!Array.isArray(stages) || stages.length === 0) {
            return false;
        }
        return stages.some((stage: any) => {
            const stageName = String(stage?.name || '').toLowerCase();
            if (stageName.includes('site enquiry') || stageName.includes('site_enquiry') || stageName.includes('site-enquiry')) {
                return this.isApproveLikeStage(stage);
            }
            return this.isApproveLikeStage(stage) && this.isSiteEnquiryCondition(stage?.condition);
        });
    }

    private isApproveLikeStage(stage: any): boolean {
        const action = String(stage?.action || '').toUpperCase().trim();
        const name = String(stage?.name || '').toLowerCase();
        if (action === 'APPROVE' || action === 'FORWARD') {
            return true;
        }
        return name.includes('approved') || name.includes('payment');
    }

    private isSiteEnquiryCondition(condition: any): boolean {
        if (!condition || typeof condition !== 'object') {
            return false;
        }

        if (condition['site_enquiry_required'] === true || condition['requires_site_enquiry'] === true) {
            return true;
        }

        const requiredForm = String(condition['required_form'] || condition['pre_approval_form'] || '').toLowerCase();
        if (requiredForm === 'site_enquiry' || requiredForm === 'site-enquiry') {
            return true;
        }

        const gate = String(condition['approval_gate'] || condition['gate'] || '').toLowerCase();
        return gate === 'site_enquiry' || gate === 'site-enquiry';
    }

    private isCurrentStageSiteEnquiry(): boolean {
        if (this.applicationType !== 'new-license') {
            return false;
        }
        const stageName = String(
            this.applicationData?.currentStageName ??
            (this.applicationData as any)?.current_stage_name ??
            this.applicationData?.status ??
            ''
        ).toLowerCase();

        return stageName.includes('site enquiry') || stageName.includes('site_enquiry') || stageName.includes('site-enquiry');
    }

    private continueApprovalWithOptionalNewLicenseFeeDialog(
        item: any,
        context: UserContext,
        applicationId: string,
        options?: ApproveExecutionOptions
    ): void {
        if (this.shouldOpenNewLicenseFeeApprovalDialog()) {
            this.openNewLicenseFeeApprovalDialogAndApprove(item, context, applicationId, options);
            return;
        }

        this.executeApproveAction(item, context, options);
    }

    get canConfirmNewLicenseFeeApproval(): boolean {
        return this.newLicenseFeeApprovalForm.valid &&
            !!this.newLicenseFeeApprovalDetails &&
            !this.newLicenseFeeApprovalOptionsLoading &&
            !this.newLicenseFeeApprovalFeeLoading;
    }

    get newLicenseFeeApprovalApplicationId(): string {
        return this.pendingNewLicenseFeeApproval?.applicationId ||
            this.applicationData?.referenceNo ||
            this.getCurrentApplicationId() ||
            'Application';
    }

    private openNewLicenseFeeApprovalDialogAndApprove(
        item: any,
        context: UserContext,
        applicationId: string,
        options?: ApproveExecutionOptions
    ): void {
        this.pendingNewLicenseFeeApproval = {
            item,
            context,
            applicationId,
            options
        };

        this.openNewLicenseFeeApprovalModal(this.buildNewLicenseFeeApprovalDialogData(applicationId));
    }

    private executeApproveAction(item: any, context: UserContext, options?: ApproveExecutionOptions): void {
        this.unifiedActionsService.executeAction('APPROVE', item, this.applicationType, context, {
            workflowContextData: options?.workflowContextData
        }).subscribe({
            next: (result: any) => {
                const isSuccess = result?.success !== false;
                if (isSuccess) {
                    const successMessage = options?.successMessage || result?.message;
                    if (successMessage) {
                        this.snackBar.open(successMessage, 'Close', { duration: 3500 });
                    }
                    const currentId = this.applicationData?.id?.toString() || '';
                    const currentRef = this.applicationData?.referenceNo || '';
                    this.loadApplicationData(currentRef, currentId);
                    return;
                }

                this.snackBar.open(
                    result?.message || options?.failureMessage || 'Action failed',
                    'Close',
                    { duration: 4500 }
                );
            },
            error: (error: any) => {
                this.snackBar.open(
                    this.extractHttpErrorMessage(error, options?.failureMessage || 'Action failed'),
                    'Close',
                    { duration: 4500 }
                );
            }
        });
    }

    private shouldOpenNewLicenseFeeApprovalDialog(): boolean {
        if (this.applicationType !== 'new-license') {
            return false;
        }

        // Check role via RoleService first (most reliable)
        if (this.roleService.hasRole(9)) {
            return true;
        }

        // Fallback: check localStorage (covers cases where RoleService hasn't hydrated yet)
        if (this.isBrowser) {
            const storedRoleId = Number(localStorage.getItem('role_id') || 0);
            const storedRoleName = String(localStorage.getItem('role') || '').toLowerCase();

            if (
                storedRoleId === 9 ||
                storedRoleName.includes('joint_commissioner') ||
                storedRoleName.includes('joint commissioner')
            ) {
                return true;
            }
        }

        return false;
    }

    private bindNewLicenseFeeApprovalForm(): void {
        this.newLicenseFeeApprovalForm.get('licenseCategoryId')?.valueChanges.subscribe((categoryId) => {
            const id = this.parseNumericValue(categoryId);
            if (!id) {
                // Category cleared — reset subcategory and location
                const subcategoryControl = this.newLicenseFeeApprovalForm.get('licenseSubcategoryId');
                subcategoryControl?.disable({ emitEvent: false });
                subcategoryControl?.setValue(null, { emitEvent: false });
                this.newLicenseFeeApprovalFilteredSubcategories = [];
                this.newLicenseFeeApprovalLocations = [];
                this.resetNewLicenseFeeApprovalFeeState();
                this.cdr.detectChanges();
                return;
            }
            this.loadAvailableSubcategories(id);
        });

        this.newLicenseFeeApprovalForm.get('licenseSubcategoryId')?.valueChanges.subscribe((subcategoryId) => {
            const categoryId = this.parseNumericValue(this.newLicenseFeeApprovalForm.get('licenseCategoryId')?.value);
            const subId = this.parseNumericValue(subcategoryId);
            if (!categoryId || !subId) {
                this.newLicenseFeeApprovalLocations = [];
                this.resetNewLicenseFeeApprovalFeeState();
                this.cdr.detectChanges();
                return;
            }
            this.loadAvailableLocations(categoryId, subId);
        });

        this.newLicenseFeeApprovalForm.get('locationCode')?.valueChanges.subscribe(() => {
            this.loadNewLicenseFeeApprovalDetailsIfReady();
        });
    }

    cancelNewLicenseFeeApproval(): void {
        this.newLicenseFeeApprovalModalOpen = false;
        this.pendingNewLicenseFeeApproval = null;
        this.resetNewLicenseFeeApprovalState();
        this.cdr.detectChanges();
    }

    confirmNewLicenseFeeApproval(): void {
        if (!this.canConfirmNewLicenseFeeApproval || !this.newLicenseFeeApprovalDetails || !this.pendingNewLicenseFeeApproval) {
            this.newLicenseFeeApprovalForm.markAllAsTouched();
            return;
        }

        const rawValue = this.newLicenseFeeApprovalForm.getRawValue();
        const selectedCategory = this.newLicenseFeeApprovalCategories.find(
            (item) => item.id === Number(rawValue.licenseCategoryId)
        );
        const selectedSubcategory = this.newLicenseFeeApprovalFilteredSubcategories.find(
            (item) => item.id === Number(rawValue.licenseSubcategoryId)
        );
        const selectedLocation = this.newLicenseFeeApprovalLocations.find(
            (item) => item.locationCode === String(rawValue.locationCode ?? '')
        );

        const selection: NewLicenseFeeApprovalResult = {
            applicationId: this.pendingNewLicenseFeeApproval.applicationId,
            licenseCategoryId: Number(rawValue.licenseCategoryId),
            licenseCategoryName: selectedCategory?.licenseCategory || '',
            licenseSubcategoryId: Number(rawValue.licenseSubcategoryId),
            licenseSubcategoryName: selectedSubcategory?.description || '',
            locationCode: String(rawValue.locationCode ?? ''),
            locationDescription: selectedLocation?.locationDescription || '',
            licenseFee: this.newLicenseFeeApprovalDetails
        };

        const pendingApproval = this.pendingNewLicenseFeeApproval;
        this.newLicenseFeeApprovalModalOpen = false;
        this.pendingNewLicenseFeeApproval = null;
        this.resetNewLicenseFeeApprovalState();
        this.cdr.detectChanges();

        this.executeApproveAction(pendingApproval.item, pendingApproval.context, {
            ...pendingApproval.options,
            successMessage: pendingApproval.options?.successMessage || 'Application approved and selected fee linked successfully.',
            failureMessage: pendingApproval.options?.failureMessage || 'Approval failed.',
            workflowContextData: {
                ...(pendingApproval.options?.workflowContextData ?? {}),
                ...this.buildNewLicenseFeeWorkflowContextData(selection)
            }
        });
    }

    private openNewLicenseFeeApprovalModal(data: NewLicenseFeeApprovalDialogData): void {
        this.newLicenseFeeApprovalModalOpen = true;
        this.newLicenseFeeApprovalOptionsLoading = true;
        this.newLicenseFeeApprovalOptionsError = '';
        this.resetNewLicenseFeeApprovalFeeState();

        const initialCategoryId = data.initialLicenseCategoryId ?? null;
        const initialCategoryName = data.initialLicenseCategoryName ?? null;
        const initialSubcategoryId = data.initialLicenseSubcategoryId ?? null;
        const initialSubcategoryName = data.initialLicenseSubcategoryName ?? null;
        const initialLocationCode = this.normalizeLocationCode(data.initialLocationCode);
        const initialLocationName = data.initialLocationName ?? null;
        const initialDistrictName = data.initialDistrictName ?? null;

        this.newLicenseFeeApprovalForm.reset({
            licenseCategoryId: null,
            licenseSubcategoryId: null,
            locationCode: null
        }, { emitEvent: false });

        this.newLicenseFeeApprovalForm.get('licenseSubcategoryId')?.disable({ emitEvent: false });
        this.newLicenseFeeApprovalFilteredSubcategories = [];
        this.newLicenseFeeApprovalLocations = [];

        // Load only categories that have at least one active fee record
        this.masterService.getLicenseFeeAvailableCategories().subscribe({
            next: (categories: any[]) => {
                this.newLicenseFeeApprovalOptionsError = '';
                this.newLicenseFeeApprovalCategories = (Array.isArray(categories) ? categories : [])
                    .map((item: any) => this.normalizeNewLicenseFeeApprovalCategory(item))
                    .filter((item: LicenseCategory) => !!item.id && !!item.licenseCategory);

                if (!this.newLicenseFeeApprovalCategories.length) {
                    this.newLicenseFeeApprovalOptionsError = 'No license fee records found. Please add fee records first.';
                }

                this.newLicenseFeeApprovalOptionsLoading = false;

                const preselectedCategory =
                    this.resolvePreselectedCategory(initialCategoryId, initialCategoryName) ??
                    this.injectSubmittedCategoryOption(initialCategoryId, initialCategoryName);
                const preselectedCategoryId =
                    typeof preselectedCategory?.id === 'number' && preselectedCategory.id > 0
                        ? preselectedCategory.id
                        : null;
                if (preselectedCategory && preselectedCategoryId !== null) {
                    this.newLicenseFeeApprovalForm.get('licenseCategoryId')?.setValue(preselectedCategoryId, { emitEvent: false });
                    // Load subcategories for the pre-selected category
                    this.loadAvailableSubcategories(
                        preselectedCategoryId,
                        initialSubcategoryId,
                        initialLocationCode,
                        initialSubcategoryName,
                        initialLocationName,
                        initialDistrictName
                    );
                }

                this.cdr.detectChanges();
            },
            error: (error: any) => {
                this.newLicenseFeeApprovalOptionsLoading = false;
                this.newLicenseFeeApprovalOptionsError = this.extractHttpErrorMessage(
                    error,
                    'Failed to load license categories.',
                    'license fee categories'
                );
                this.cdr.detectChanges();
            }
        });
    }

    private loadAvailableSubcategories(
        categoryId: number,
        preselectSubcategoryId: number | null = null,
        preselectLocationCode: string | null = null,
        preselectSubcategoryName: string | null = null,
        preselectLocationName: string | null = null,
        preselectDistrictName: string | null = null
    ): void {
        const subcategoryControl = this.newLicenseFeeApprovalForm.get('licenseSubcategoryId');
        subcategoryControl?.disable({ emitEvent: false });
        subcategoryControl?.setValue(null, { emitEvent: false });
        this.newLicenseFeeApprovalOptionsError = '';
        this.newLicenseFeeApprovalFilteredSubcategories = [];
        this.newLicenseFeeApprovalLocations = [];
        this.resetNewLicenseFeeApprovalFeeState();

        this.masterService.getLicenseFeeAvailableSubcategories(categoryId).subscribe({
            next: (subcategories: any[]) => {
                this.newLicenseFeeApprovalFilteredSubcategories = (Array.isArray(subcategories) ? subcategories : [])
                    .map((item: any) => this.normalizeNewLicenseFeeApprovalSubcategory(item))
                    .filter((item: NewLicenseFeeApprovalSubcategoryOption) => item.id > 0 && !!item.description);

                subcategoryControl?.enable({ emitEvent: false });

                const preselectedSubcategory =
                    this.resolvePreselectedSubcategory(
                        preselectSubcategoryId,
                        preselectSubcategoryName
                    ) ??
                    this.injectSubmittedSubcategoryOption(
                        categoryId,
                        preselectSubcategoryId,
                        preselectSubcategoryName
                    );
                if (preselectedSubcategory) {
                    subcategoryControl?.setValue(preselectedSubcategory.id, { emitEvent: false });
                    this.loadAvailableLocations(
                        categoryId,
                        preselectedSubcategory.id,
                        preselectLocationCode,
                        preselectLocationName,
                        preselectDistrictName
                    );
                }

                this.cdr.detectChanges();
            },
            error: (error: any) => {
                subcategoryControl?.enable({ emitEvent: false });
                this.newLicenseFeeApprovalOptionsError = this.extractHttpErrorMessage(
                    error,
                    'Failed to load license subcategories.',
                    'license fee subcategories'
                );
                this.cdr.detectChanges();
            }
        });
    }

    private loadAvailableLocations(
        categoryId: number,
        subcategoryId: number,
        preselectLocationCode: string | null = null,
        preselectLocationName: string | null = null,
        preselectDistrictName: string | null = null
    ): void {
        const locationControl = this.newLicenseFeeApprovalForm.get('locationCode');
        locationControl?.setValue(null, { emitEvent: false });
        this.newLicenseFeeApprovalOptionsError = '';
        this.newLicenseFeeApprovalLocations = [];
        this.resetNewLicenseFeeApprovalFeeState();

        this.masterService.getLicenseFeeAvailableLocations(categoryId, subcategoryId).subscribe({
            next: (locations: any[]) => {
                this.newLicenseFeeApprovalLocations = (Array.isArray(locations) ? locations : [])
                    .map((item: any) => this.normalizeNewLicenseFeeApprovalLocation(item))
                    .filter((item: NewLicenseFeeApprovalLocationOption) => !!item.locationCode);

                const preselectedLocation =
                    this.resolvePreselectedLocation(
                        preselectLocationCode,
                        preselectLocationName,
                        preselectDistrictName
                    ) ??
                    this.injectSubmittedLocationOption(
                        preselectLocationCode,
                        preselectLocationName,
                        preselectDistrictName
                    );
                if (preselectedLocation) {
                    locationControl?.setValue(preselectedLocation.locationCode, { emitEvent: false });
                    this.loadNewLicenseFeeApprovalDetailsIfReady();
                }

                this.cdr.detectChanges();
            },
            error: (error: any) => {
                this.newLicenseFeeApprovalOptionsError = this.extractHttpErrorMessage(
                    error,
                    'Failed to load fee-mapped locations.',
                    'license fee locations'
                );
                this.cdr.detectChanges();
            }
        });
    }

    private buildNewLicenseFeeApprovalDialogData(applicationId: string): NewLicenseFeeApprovalDialogData {
        return {
            applicationId,
            initialLicenseCategoryId: this.extractApplicationNumericSelection(
                'license_category_id',
                'licenseCategoryId',
                'license_category',
                'licenseCategory'
            ),
            initialLicenseCategoryName: this.extractApplicationDisplaySelection(
                'license_category_name',
                'licenseCategoryName',
                'license_category',
                'licenseCategory'
            ),
            initialLicenseSubcategoryId: this.extractApplicationNumericSelection(
                'license_subcategory_id',
                'license_sub_category_id',
                'licenseSubcategoryId',
                'licenseSubCategoryId',
                'license_sub_category',
                'licenseSubCategory',
                'licenseSubcategory'
            ),
            initialLicenseSubcategoryName: this.extractApplicationDisplaySelection(
                'license_sub_category_name',
                'licenseSubCategoryName',
                'license_sub_category',
                'licenseSubCategory',
                'licenseSubcategory'
            ),
            initialLocationCode: this.extractApplicationStringSelection(
                'location_code',
                'locationCode',
                'location'
            ),
            initialLocationName: this.extractApplicationDisplaySelection(
                'location_name',
                'locationName',
                'location'
            ),
            initialDistrictName: this.extractApplicationDisplaySelection(
                'site_district_name',
                'siteDistrictName',
                'site_district',
                'siteDistrict'
            )
        };
    }

    private buildNewLicenseFeeWorkflowContextData(selection: NewLicenseFeeApprovalResult): Record<string, any> {
        const fee = selection.licenseFee as any;
        // API returns camelCase (DRF camelCase renderer); fall back to snake_case for safety
        const licenseFeeVal = fee.licenseFee ?? fee.license_fee;
        const securityAmountVal = fee.securityAmount ?? fee.security_amount;
        const renewalAmountVal = fee.renewalAmount ?? fee.renewal_amount;
        const lateFeeVal = fee.lateFee ?? fee.late_fee;

        return {
            selected_license_fee_id: fee.id,
            license_category_id: selection.licenseCategoryId,
            license_subcategory_id: selection.licenseSubcategoryId,
            location_code: selection.locationCode,
            license_fee_selection: {
                id: fee.id,
                application_id: selection.applicationId,
                license_category_id: selection.licenseCategoryId,
                license_category_name: selection.licenseCategoryName,
                license_subcategory_id: selection.licenseSubcategoryId,
                license_subcategory_name: selection.licenseSubcategoryName,
                location_code: selection.locationCode,
                location_description: selection.locationDescription,
                license_fee: licenseFeeVal,
                security_amount: securityAmountVal,
                renewal_amount: renewalAmountVal,
                late_fee: lateFeeVal
            }
        };
    }

    private handleNewLicenseFeeApprovalCategoryChange(categoryId: number | null, resetSubcategory: boolean): void {
        const subcategoryControl = this.newLicenseFeeApprovalForm.get('licenseSubcategoryId');

        if (!categoryId) {
            this.newLicenseFeeApprovalFilteredSubcategories = [];
            subcategoryControl?.disable({ emitEvent: false });
            subcategoryControl?.setValue(null, { emitEvent: false });
            this.resetNewLicenseFeeApprovalFeeState();
            return;
        }

        this.newLicenseFeeApprovalFilteredSubcategories = this.newLicenseFeeApprovalAllSubcategories.filter(
            (item) => item.categoryId === categoryId
        );
        subcategoryControl?.enable({ emitEvent: false });

        const currentSubcategoryId = this.parseNumericValue(subcategoryControl?.value);
        const hasValidSubcategory = !!currentSubcategoryId &&
            this.newLicenseFeeApprovalFilteredSubcategories.some((item) => item.id === currentSubcategoryId);

        if (resetSubcategory || !hasValidSubcategory) {
            subcategoryControl?.setValue(null, { emitEvent: false });
        }

        this.resetNewLicenseFeeApprovalFeeState();
        this.cdr.detectChanges();
    }

    private loadNewLicenseFeeApprovalDetailsIfReady(): void {
        const categoryId = this.parseNumericValue(this.newLicenseFeeApprovalForm.get('licenseCategoryId')?.value);
        const subcategoryId = this.parseNumericValue(this.newLicenseFeeApprovalForm.getRawValue()?.licenseSubcategoryId);
        const locationCode = String(this.newLicenseFeeApprovalForm.get('locationCode')?.value ?? '').trim();

        if (!categoryId || !subcategoryId || !locationCode || locationCode === 'null') {
            return;
        }

        if (this.isSyntheticSubmittedLocationCode(locationCode)) {
            this.newLicenseFeeApprovalDetails = null;
            this.newLicenseFeeApprovalFeeLoading = false;
            this.newLicenseFeeApprovalFeeError = 'Submitted location is not mapped to an approval fee record yet. Please choose a location from the dropdown before confirming approval.';
            this.cdr.detectChanges();
            return;
        }

        this.newLicenseFeeApprovalFeeLoading = true;
        this.masterService.lookupLicenseFee(categoryId, subcategoryId, locationCode).subscribe({
            next: (fee: any) => {
                this.newLicenseFeeApprovalFeeLoading = false;
                if (!fee || fee.detail) {
                    // fee.detail means the backend returned an error body with 200 status
                    this.newLicenseFeeApprovalDetails = null;
                    this.newLicenseFeeApprovalFeeError = fee?.detail || 'No fee record found for this combination';
                    this.cdr.detectChanges();
                    return;
                }
                // Store raw response directly — template uses string interpolation, no pipe needed
                this.newLicenseFeeApprovalDetails = fee as LicenseFee;
                this.cdr.detectChanges();
            },
            error: (error: any) => {
                this.newLicenseFeeApprovalFeeLoading = false;
                this.newLicenseFeeApprovalDetails = null;
                this.newLicenseFeeApprovalFeeError =
                    error?.status === 404
                        ? 'No fee record found for this combination'
                        : this.extractHttpErrorMessage(
                            error,
                            'No fee record found for this combination',
                            'license fee details'
                        );
                this.cdr.detectChanges();
            }
        });
    }

    private extractApplicationNumericSelection(...keys: string[]): number | null {
        if (!this.applicationData) {
            return null;
        }

        for (const key of keys) {
            const rawValue = this.unwrapApplicationSelectionValue((this.applicationData as any)?.[key]);
            if (rawValue === null || rawValue === undefined) {
                continue;
            }

            const normalized = String(rawValue).trim();
            if (!normalized) {
                continue;
            }

            const parsed = Number(normalized);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }

        return null;
    }

    private extractApplicationStringSelection(...keys: string[]): string | null {
        if (!this.applicationData) {
            return null;
        }

        for (const key of keys) {
            const rawValue = this.unwrapApplicationSelectionValue((this.applicationData as any)?.[key]);
            if (rawValue === null || rawValue === undefined) {
                continue;
            }

            const normalized = String(rawValue).trim();
            if (normalized) {
                return normalized;
            }
        }

        return null;
    }

    private extractApplicationDisplaySelection(...keys: string[]): string | null {
        if (!this.applicationData) {
            return null;
        }

        for (const key of keys) {
            const rawValue = this.unwrapApplicationDisplayValue((this.applicationData as any)?.[key]);
            if (rawValue === null || rawValue === undefined) {
                continue;
            }

            const normalized = String(rawValue).trim();
            if (normalized) {
                return normalized;
            }
        }

        return null;
    }

    private unwrapApplicationSelectionValue(value: any): any {
        if (!value || typeof value !== 'object') {
            return value;
        }

        return value.location_code ??
            value.locationCode ??
            value.license_category_id ??
            value.licenseCategoryId ??
            value.license_subcategory_id ??
            value.licenseSubcategoryId ??
            value.id ??
            value.pk ??
            value.value ??
            null;
    }

    private unwrapApplicationDisplayValue(value: any): any {
        if (!value || typeof value !== 'object') {
            return value;
        }

        return value.location_description ??
            value.locationDescription ??
            value.license_category ??
            value.licenseCategory ??
            value.license_sub_category ??
            value.licenseSubCategory ??
            value.category_name ??
            value.categoryName ??
            value.description ??
            value.name ??
            value.label ??
            value.district ??
            value.subdivision ??
            value.police_station ??
            value.policeStation ??
            value.ward_name ??
            value.wardName ??
            value.value ??
            this.unwrapApplicationSelectionValue(value);
    }

    private resetNewLicenseFeeApprovalState(): void {
        this.newLicenseFeeApprovalOptionsLoading = false;
        this.newLicenseFeeApprovalOptionsError = '';
        this.newLicenseFeeApprovalCategories = [];
        this.newLicenseFeeApprovalAllSubcategories = [];
        this.newLicenseFeeApprovalFilteredSubcategories = [];
        this.newLicenseFeeApprovalLocations = [];
        this.newLicenseFeeApprovalForm.reset({
            licenseCategoryId: null,
            licenseSubcategoryId: null,
            locationCode: null
        }, { emitEvent: false });
        this.newLicenseFeeApprovalForm.get('licenseSubcategoryId')?.disable({ emitEvent: false });
        this.resetNewLicenseFeeApprovalFeeState();
    }

    private resetNewLicenseFeeApprovalFeeState(): void {
        this.newLicenseFeeApprovalDetails = null;
        this.newLicenseFeeApprovalFeeLoading = false;
        this.newLicenseFeeApprovalFeeError = '';
    }

    private normalizeLocationCode(value: string | number | null | undefined): string | null {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        return String(value).trim();
    }

    private normalizeSelectionText(value: unknown): string {
        return String(value ?? '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private resolvePreselectedCategory(
        categoryId: number | null,
        categoryName: string | null
    ): LicenseCategory | null {
        if (categoryId) {
            const exactMatch = this.newLicenseFeeApprovalCategories.find((item) => item.id === categoryId);
            if (exactMatch) {
                return exactMatch;
            }
        }

        const normalizedName = this.normalizeSelectionText(categoryName);
        if (!normalizedName) {
            return null;
        }

        return this.newLicenseFeeApprovalCategories.find(
            (item) => this.normalizeSelectionText(item.licenseCategory) === normalizedName
        ) ?? this.newLicenseFeeApprovalCategories.find(
            (item) => this.normalizeSelectionText(item.licenseCategory).includes(normalizedName) ||
                normalizedName.includes(this.normalizeSelectionText(item.licenseCategory))
        ) ?? null;
    }

    private injectSubmittedCategoryOption(
        categoryId: number | null,
        categoryName: string | null
    ): LicenseCategory | null {
        const normalizedName = String(categoryName ?? '').trim();
        if (!categoryId || !normalizedName) {
            return null;
        }

        const syntheticOption: LicenseCategory = {
            id: categoryId,
            licenseCategory: normalizedName,
            description: 'Submitted application value'
        };

        this.newLicenseFeeApprovalCategories = [
            syntheticOption,
            ...this.newLicenseFeeApprovalCategories.filter((item) => item.id !== categoryId)
        ];

        return syntheticOption;
    }

    private resolvePreselectedSubcategory(
        subcategoryId: number | null,
        subcategoryName: string | null
    ): NewLicenseFeeApprovalSubcategoryOption | null {
        if (subcategoryId) {
            const exactMatch = this.newLicenseFeeApprovalFilteredSubcategories.find((item) => item.id === subcategoryId);
            if (exactMatch) {
                return exactMatch;
            }
        }

        const normalizedName = this.normalizeSelectionText(subcategoryName);
        if (!normalizedName) {
            return null;
        }

        return this.newLicenseFeeApprovalFilteredSubcategories.find(
            (item) => this.normalizeSelectionText(item.description) === normalizedName
        ) ?? this.newLicenseFeeApprovalFilteredSubcategories.find(
            (item) => this.normalizeSelectionText(item.description).includes(normalizedName) ||
                normalizedName.includes(this.normalizeSelectionText(item.description))
        ) ?? null;
    }

    private injectSubmittedSubcategoryOption(
        categoryId: number,
        subcategoryId: number | null,
        subcategoryName: string | null
    ): NewLicenseFeeApprovalSubcategoryOption | null {
        const normalizedName = String(subcategoryName ?? '').trim();
        if (!categoryId || !subcategoryId || !normalizedName) {
            return null;
        }

        const syntheticOption: NewLicenseFeeApprovalSubcategoryOption = {
            id: subcategoryId,
            description: normalizedName,
            categoryId
        };

        this.newLicenseFeeApprovalFilteredSubcategories = [
            syntheticOption,
            ...this.newLicenseFeeApprovalFilteredSubcategories.filter((item) => item.id !== subcategoryId)
        ];

        return syntheticOption;
    }

    private resolvePreselectedLocation(
        locationCode: string | null,
        locationName: string | null,
        districtName: string | null
    ): NewLicenseFeeApprovalLocationOption | null {
        if (locationCode) {
            const exactMatch = this.newLicenseFeeApprovalLocations.find(
                (item) => item.locationCode === locationCode
            );
            if (exactMatch) {
                return exactMatch;
            }
        }

        const normalizedLocationName = this.normalizeSelectionText(locationName);
        if (!normalizedLocationName) {
            return null;
        }

        const nameMatches = this.newLicenseFeeApprovalLocations.filter(
            (item) => this.normalizeSelectionText(item.locationDescription) === normalizedLocationName
        );
        const fuzzyMatches = nameMatches.length
            ? nameMatches
            : this.newLicenseFeeApprovalLocations.filter((item) => {
                const normalizedOption = this.normalizeSelectionText(item.locationDescription);
                return normalizedOption.includes(normalizedLocationName) ||
                    normalizedLocationName.includes(normalizedOption);
            });
        if (!fuzzyMatches.length) {
            return null;
        }

        const normalizedDistrictName = this.normalizeSelectionText(districtName);
        if (!normalizedDistrictName || fuzzyMatches.length === 1) {
            return fuzzyMatches[0];
        }

        return fuzzyMatches.find(
            (item) => this.normalizeSelectionText(item.districtName) === normalizedDistrictName
        ) ?? fuzzyMatches.find((item) => {
            const normalizedOptionDistrict = this.normalizeSelectionText(item.districtName);
            return normalizedOptionDistrict.includes(normalizedDistrictName) ||
                normalizedDistrictName.includes(normalizedOptionDistrict);
        }) ?? fuzzyMatches[0];
    }

    private injectSubmittedLocationOption(
        locationCode: string | null,
        locationName: string | null,
        districtName: string | null
    ): NewLicenseFeeApprovalLocationOption | null {
        const normalizedName = String(locationName ?? '').trim();
        if (!normalizedName) {
            return null;
        }

        const syntheticCode =
            this.normalizeLocationCode(locationCode) ??
            this.buildSyntheticSubmittedLocationCode(normalizedName, districtName);

        const syntheticOption: NewLicenseFeeApprovalLocationOption = {
            locationCode: syntheticCode,
            locationDescription: normalizedName,
            districtName: String(districtName ?? '').trim() || undefined,
            isSynthetic: this.isSyntheticSubmittedLocationCode(syntheticCode)
        };

        this.newLicenseFeeApprovalLocations = [
            syntheticOption,
            ...this.newLicenseFeeApprovalLocations.filter((item) => item.locationCode !== syntheticCode)
        ];

        return syntheticOption;
    }

    private normalizeNewLicenseFeeApprovalCategory(item: any): LicenseCategory {
        return {
            id: this.parseNumericValue(item?.id) ?? 0,
            licenseCategory: String(item?.licenseCategory ?? item?.license_category ?? item?.name ?? '').trim(),
            description: item?.description ?? ''
        };
    }

    private normalizeNewLicenseFeeApprovalSubcategory(item: any): NewLicenseFeeApprovalSubcategoryOption {
        // Resolve categoryId from all possible field shapes the API might return.
        // NOTE: do NOT use parseNumericValue with ?? chaining here — parseNumericValue
        // returns 0 (not null/undefined) for missing fields, so ?? would short-circuit
        // on the first 0 and never reach the next candidate.
        const rawCategoryId =
            item?.license_category_id ??
            item?.category?.id ??
            item?.licenseCategory?.id ??
            item?.category ??
            item?.licenseCategory ??
            null;

        const categoryId = this.parseNumericValue(rawCategoryId);

        return {
            id: this.parseNumericValue(item?.id) ?? 0,
            description: String(item?.description ?? item?.licenseSubcategory ?? item?.license_subcategory ?? item?.name ?? '').trim(),
            categoryId
        };
    }

    private normalizeNewLicenseFeeApprovalLocation(item: any): NewLicenseFeeApprovalLocationOption {
        const locationCode =
            item?.locationCode ??
            item?.location_code ??
            item?.code ??
            item?.value ??
            '';

        return {
            id: this.parseNumericValue(item?.id) ?? undefined,
            locationCode: String(locationCode).trim(),
            locationDescription: String(
                item?.locationDescription ??
                item?.location_description ??
                item?.description ??
                item?.name ??
                locationCode
            ).trim(),
            districtName: String(
                item?.districtName ??
                item?.district_name ??
                item?.district ??
                ''
            ).trim() || undefined,
            isSynthetic: false
        };
    }

    private buildSyntheticSubmittedLocationCode(locationName: string, districtName: string | null): string {
        const normalizedLocation = this.normalizeSelectionText(locationName).replace(/\s+/g, '-');
        const normalizedDistrict = this.normalizeSelectionText(districtName).replace(/\s+/g, '-');
        const suffix = normalizedDistrict ? `-${normalizedDistrict}` : '';
        return `__submitted__${normalizedLocation}${suffix}`;
    }

    private isSyntheticSubmittedLocationCode(locationCode: string | null | undefined): boolean {
        return String(locationCode ?? '').trim().startsWith('__submitted__');
    }

    private openSiteEnquiryAndApprove(item: any, context: UserContext, applicationId: string): void {
        this.openSiteEnquiryAndProcessAction(item, context, applicationId, 'APPROVE');
    }

    private openSiteEnquiryAndProcessAction(
        item: any,
        context: UserContext,
        applicationId: string,
        nextAction: 'APPROVE' | 'FORWARD'
    ): void {
        const isRevertedReport = (report: any): boolean => {
            if (!report) return false;
            const rawFlag =
                report?.is_reverted ??
                report?.isReverted ??
                report?.site_enquiry_is_reverted ??
                report?.siteEnquiryIsReverted ??
                report?.siteEnquiryReverted;
            if (rawFlag === true) return true;
            if (typeof rawFlag === 'string' && rawFlag.trim().toLowerCase() === 'true') return true;
            const remarks = String(report?.reverted_remarks ?? report?.revertedRemarks ?? '').trim();
            return remarks.length > 0;
        };

        const submitSiteEnquiry$ =
            this.applicationType === 'new-license'
                ? (formData: FormData) => this.licenseApplicationService.submitNewLicenseSiteEnquiryData(applicationId, formData)
                : (formData: FormData) => this.licenseApplicationService.submitSiteEnquiryData(applicationId, formData);

        const openDialog = (existingReport: any | null) => {
            const dialogRef = this.dialog.open(SiteEnquiryFormDialogComponent, {
                width: '980px',
                maxWidth: '98vw',
                disableClose: true,
                data: { applicationId, existingReport }
            });

            dialogRef.afterClosed().subscribe((result: { formData: FormData } | null) => {
                if (!result?.formData) {
                    return;
                }

                submitSiteEnquiry$(result.formData).subscribe({
                    next: () => {
                        if (nextAction === 'APPROVE') {
                            this.continueApprovalWithOptionalNewLicenseFeeDialog(item, context, applicationId, {
                                successMessage: 'Site enquiry submitted and application approved.',
                                failureMessage: 'Approval failed after site enquiry submit.'
                            });
                            return;
                        }

                        this.unifiedActionsService.executeAction('FORWARD', item, this.applicationType, context).subscribe({
                            next: (result: any) => {
                                const isSuccess = result?.success !== false;
                                if (isSuccess) {
                                    this.snackBar.open(result?.message || 'Site enquiry submitted and forwarded.', 'Close', { duration: 3500 });
                                    const currentId = this.applicationData?.id?.toString() || '';
                                    const currentRef = this.applicationData?.referenceNo || '';
                                    this.loadApplicationData(currentRef, currentId);
                                    return;
                                }
                                this.snackBar.open(result?.message || 'Forward failed after site enquiry submit.', 'Close', { duration: 4500 });
                            },
                            error: (error: any) => {
                                this.snackBar.open(
                                    this.extractHttpErrorMessage(error, 'Forward failed after site enquiry submit.'),
                                    'Close',
                                    { duration: 4500 }
                                );
                            }
                        });
                    },
                    error: (error: any) => {
                        const message = this.extractHttpErrorMessage(error, 'Failed to submit site enquiry form.', 'site enquiry');
                        if (String(message).toLowerCase().includes('already submitted')) {
                            if (nextAction === 'APPROVE') {
                                this.continueApprovalWithOptionalNewLicenseFeeDialog(item, context, applicationId, {
                                    successMessage: 'Existing site enquiry found. Application approved.',
                                    failureMessage: 'Approval failed.'
                                });
                                return;
                            }

                            this.unifiedActionsService.executeAction('FORWARD', item, this.applicationType, context).subscribe({
                                next: (result: any) => {
                                    const isSuccess = result?.success !== false;
                                    if (isSuccess) {
                                        this.snackBar.open(result?.message || 'Application forwarded.', 'Close', { duration: 3500 });
                                        const currentId = this.applicationData?.id?.toString() || '';
                                        const currentRef = this.applicationData?.referenceNo || '';
                                        this.loadApplicationData(currentRef, currentId);
                                        return;
                                    }
                                    this.snackBar.open(result?.message || 'Forward failed.', 'Close', { duration: 4500 });
                                },
                                error: (err: any) => {
                                    this.snackBar.open(this.extractHttpErrorMessage(err, 'Forward failed.'), 'Close', { duration: 4500 });
                                }
                            });
                            return;
                        }
                        this.snackBar.open(message, 'Close', { duration: 4500 });
                    }
                });
            });
        };

        // If already submitted, allow editing only when JC has reverted it.
        this.licenseApplicationService.getSiteEnquiryReport(applicationId).subscribe({
            next: (report: any) => {
                if (isRevertedReport(report)) {
                    openDialog(report);
                    return;
                }

                // Existing non-reverted report: proceed approval without reopening the form.
                if (nextAction === 'APPROVE') {
                    this.continueApprovalWithOptionalNewLicenseFeeDialog(item, context, applicationId, {
                        successMessage: 'Existing site enquiry found. Application approved.',
                        failureMessage: 'Approval failed.'
                    });
                    return;
                }

                this.unifiedActionsService.executeAction('FORWARD', item, this.applicationType, context).subscribe({
                    next: (result: any) => {
                        const isSuccess = result?.success !== false;
                        if (isSuccess) {
                            this.snackBar.open(result?.message || 'Application forwarded.', 'Close', { duration: 3500 });
                            const currentId = this.applicationData?.id?.toString() || '';
                            const currentRef = this.applicationData?.referenceNo || '';
                            this.loadApplicationData(currentRef, currentId);
                            return;
                        }
                        this.snackBar.open(result?.message || 'Forward failed.', 'Close', { duration: 4500 });
                    },
                    error: (error: any) => {
                        this.snackBar.open(this.extractHttpErrorMessage(error, 'Forward failed.'), 'Close', { duration: 4500 });
                    }
                });
            },
            error: () => {
                // No report yet (or cannot load): open fresh form.
                openDialog(null);
            }
        });
    }

    private getWorkflowApplicationId(item: any): string {
        return String(
            item?.application_id ??
            item?.applicationId ??
            item?.referenceNo ??
            item?.refNo ??
            item?.id ??
            ''
        ).trim();
    }

    private getCurrentApplicationId(): string {
        return this.getWorkflowApplicationId(this.applicationData);
    }

    private isPendingAtJointCommissionerStage(): boolean {
        const stageText = String(
            this.applicationData?.currentStageName ??
            (this.applicationData as any)?.current_stage_name ??
            ''
        ).toLowerCase();
        const stageToken = stageText.replace(/[^a-z]/g, '');
        if (!stageToken.includes('jointcommissioner')) {
            return false;
        }

        const statusText = String(this.applicationData?.status ?? '').toLowerCase();
        const combined = `${stageText} ${statusText}`;
        const isRejectedLike = combined.includes('reject');
        const isObjectionLike = combined.includes('objection');
        const isApprovedLike = combined.includes('approve') || combined.includes('payment');
        const isPendingLike = combined.includes('pending') || (!isRejectedLike && !isObjectionLike && !isApprovedLike);

        return isPendingLike && !isRejectedLike && !isObjectionLike && !isApprovedLike;
    }

    private buildSiteEnquiryReportEntries(report: Record<string, any>): SiteEnquiryReportField[] {
        const hiddenKeys = new Set(['content_type', 'is_reverted', 'reverted_remarks', 'reverted_at']);

        return Object.entries(report || {})
            .filter(([key]) => !hiddenKeys.has(key))
            .map(([key, value]) => {
                const href = this.isFilePath(value)
                    ? this.normalizeDocUrl(this.getFileUrl(value))
                    : undefined;

                return {
                    key,
                    label: this.getSiteEnquiryFieldLabel(key),
                    displayValue: href ? 'Open File' : this.formatSiteEnquiryFieldValue(key, value),
                    href
                };
            });
    }

    private getSiteEnquiryFieldLabel(key: string): string {
        const normalized = String(key || '')
            .replace(/_/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2');

        const upperTokens = new Set(['id', 'noc', 'dob', 'rcc', 'api']);
        return normalized
            .split(' ')
            .filter(part => !!part)
            .map(part => {
                const token = part.toLowerCase();
                if (upperTokens.has(token)) {
                    return token.toUpperCase();
                }
                return token.charAt(0).toUpperCase() + token.slice(1);
            })
            .join(' ');
    }

    private formatSiteEnquiryFieldValue(key: string, value: unknown): string {
        if (value === null || value === undefined) {
            return 'Not Available';
        }

        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }

        if (typeof value === 'number') {
            return Number.isFinite(value) ? `${value}` : 'Not Available';
        }

        if (Array.isArray(value)) {
            return value.length
                ? value.map(item => this.formatSiteEnquiryFieldValue(key, item)).join(', ')
                : 'Not Available';
        }

        const text = String(value).trim();
        if (!text) {
            return 'Not Available';
        }

        if (this.shouldFormatSiteEnquiryDate(key, text)) {
            return this.formatSiteEnquiryDate(text);
        }

        return this.humanizeSiteEnquiryEnum(text);
    }

    private shouldFormatSiteEnquiryDate(key: string, value: string): boolean {
        const normalizedKey = String(key || '').toLowerCase();
        if (!(normalizedKey.endsWith('_at') || normalizedKey.endsWith('_date') || normalizedKey === 'date')) {
            return false;
        }

        const parsed = Date.parse(value);
        return Number.isFinite(parsed);
    }

    private formatSiteEnquiryDate(value: string): string {
        const date = new Date(value);
        const hasTime = value.includes('T') || /\d{2}:\d{2}/.test(value);

        return hasTime
            ? date.toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
            : date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
    }

    private humanizeSiteEnquiryEnum(value: string): string {
        const normalized = value.toLowerCase();
        const knownValues: Record<string, string> = {
            rcc: 'RCC',
            newlicenseapplication: 'New License Application',
            licenseapplication: 'License Application'
        };

        if (knownValues[normalized]) {
            return knownValues[normalized];
        }

        if (/^[a-z]+(_[a-z]+)+$/.test(normalized)) {
            return this.getSiteEnquiryFieldLabel(normalized);
        }

        return value;
    }

    private resetSiteEnquiryReportState(): void {
        this.siteEnquiryReportModalOpen = false;
        this.siteEnquiryReportLoading = false;
        this.siteEnquiryReportError = '';
        this.siteEnquiryReport = null;
        this.siteEnquiryReportEntries = [];
    }

    private extractHttpErrorMessage(error: any, fallback: string, apiContext = 'the requested API'): string {
        const detail = error?.error?.detail;
        if (typeof detail === 'string' && detail.trim()) {
            return detail.trim();
        }

        const message = error?.error?.message;
        if (typeof message === 'string' && message.trim()) {
            return message.trim();
        }

        const rawError = error?.error;
        if (typeof rawError === 'string') {
            if (rawError.trim().toLowerCase().startsWith('<!doctype')) {
                return `Server returned an HTML error page instead of API JSON. Please check backend endpoint/permission for ${apiContext}.`;
            }
            if (rawError.trim()) {
                return rawError.trim();
            }
        }

        const topMessage = error?.message;
        if (typeof topMessage === 'string' && topMessage.toLowerCase().includes('unexpected token')) {
            return `Server returned an invalid JSON response (HTML page). Please check backend endpoint/permission for ${apiContext}.`;
        }

        return fallback;
    }

    getIncludeActionsForDetailView(): string[] | null {
        if (!this.applicationData) {
            return null;
        }

        const actions = Array.isArray(this.applicationData.allowedActions)
            ? this.applicationData.allowedActions
            : [];

        const normalizedActions = actions
            .map(action => String(action || '').toUpperCase().trim())
            .filter(action => !!action && action !== 'VIEW');

        return normalizedActions.length ? Array.from(new Set(normalizedActions)) : null;
    }

    canViewSiteEnquiryReport(): boolean {
        return this.isNewLicense() && this.roleService.hasRole(9) && this.isPendingAtJointCommissionerStage();
    }

    canRevertSiteEnquiryReport(): boolean {
        if (!this.canViewSiteEnquiryReport()) {
            return false;
        }
        if (this.siteEnquiryReportLoading || !!this.siteEnquiryReportError) {
            return false;
        }
        return !!this.siteEnquiryReport;
    }

    revertSiteEnquiryReportFromModal(): void {
        const applicationId = this.getCurrentApplicationId();
        if (!applicationId) {
            this.snackBar.open('Application reference not found for site enquiry report.', 'Close', { duration: 4000 });
            return;
        }

        Swal.fire({
            title: 'Revert Site Enquiry Report',
            input: 'textarea',
            inputLabel: 'Remarks (required)',
            inputPlaceholder: 'Enter remarks for Site Enquiry Officer...',
            inputAttributes: { 'aria-label': 'Revert remarks' },
            showCancelButton: true,
            confirmButtonText: 'Revert Back',
            cancelButtonText: 'Cancel',
            reverseButtons: true,
            inputValidator: (value) => {
                const text = String(value || '').trim();
                if (!text) return 'Remarks are required.';
                if (text.length < 3) return 'Please enter at least 3 characters.';
                return null;
            }
        }).then((result) => {
            if (!result.isConfirmed) return;
            const remarks = String(result.value || '').trim();

            this.licenseApplicationService.revertSiteEnquiryReport(applicationId, remarks).subscribe({
                next: () => {
                    this.snackBar.open('Site enquiry report reverted back to Site Enquiry Officer.', 'Close', { duration: 4500 });
                    this.closeSiteEnquiryReportModal();
                    const params = this.extractRouteParams();
                    this.loadApplicationData(params.ref || '', params.id || '');
                },
                error: (error: any) => {
                    const message = this.extractHttpErrorMessage(error, 'Failed to revert site enquiry report.', 'site enquiry revert');
                    this.snackBar.open(message, 'Close', { duration: 5000 });
                }
            });
        });
    }

    openSiteEnquiryReportModal(): void {
        const applicationId = this.getCurrentApplicationId();
        if (!applicationId) {
            this.snackBar.open('Application reference not found for site enquiry report.', 'Close', { duration: 4000 });
            return;
        }

        this.siteEnquiryReportModalOpen = true;
        this.siteEnquiryReportLoading = true;
        this.siteEnquiryReportError = '';
        this.siteEnquiryReport = null;
        this.siteEnquiryReportEntries = [];

        this.licenseApplicationService.getSiteEnquiryReport(applicationId).subscribe({
            next: (report: Record<string, any>) => {
                this.siteEnquiryReport = report || null;
                this.siteEnquiryReportEntries = this.buildSiteEnquiryReportEntries(report || {});
                this.siteEnquiryReportLoading = false;
            },
            error: (error: any) => {
                this.siteEnquiryReportError = this.extractHttpErrorMessage(error, 'Failed to load site enquiry report.', 'site enquiry');
                this.siteEnquiryReportLoading = false;
            }
        });
    }

    closeSiteEnquiryReportModal(): void {
        this.resetSiteEnquiryReportState();
        this.cdr.detectChanges();
    }

    private canRequestRequisitionCancellation(): boolean {
        const data: any = this.applicationData as any;
        if (!data) return false;

        const backendFlag = data.can_initiate_cancellation ?? data.canInitiateCancellation ?? data.canCancel;
        if (backendFlag !== undefined && backendFlag !== null) {
            return Boolean(backendFlag);
        }

        const status = String(data.status || '').toLowerCase();
        const stage = String(data.currentStageName || data.current_stage_name || '').toLowerCase();
        const rejected = status.includes('reject') || stage.includes('reject');
        const cancelled = status.includes('cancel') || stage.includes('cancel');
        if (rejected || cancelled) return false;

        const approvedLike =
            status.includes('approved') ||
            stage.includes('approved') ||
            status.includes('payment') ||
            stage.includes('payment') ||
            status.includes('forwarded') ||
            stage.includes('forwarded');

        if (approvedLike) return true;

        const isFinal = Boolean(data.current_stage_is_final ?? data.currentStageIsFinal ?? false);
        return isFinal;
    }

    private navigateToRequisitionArrivalUpdate(item: any): void {
        const ref = String(item?.referenceNo || item?.our_ref_no || item?.refNo || '').trim();
        const id = String(item?.id || '').trim();
        this.router.navigate(['/dashboard'], {
            queryParams: {
                section: 'requisition',
                ref: ref || undefined,
                id: id || undefined,
                openArrival: '1'
            }
        });
    }

    private isHologramPaymentCompleted(): boolean {
        if (!this.applicationData) return false;
        const stageName = String(
            (this.applicationData as any)?.currentStageName ||
            (this.applicationData as any)?.current_stage_name ||
            ''
        ).toLowerCase().trim();
        const paymentStatus = String(
            (this.applicationData as any)?.paymentStatus ||
            (this.applicationData as any)?.payment_status ||
            ''
        ).toLowerCase().trim();
        // Only true when licensee has completed payment (stage "Payment Completed")
        return (
            stageName === 'payment completed' ||
            paymentStatus === 'completed' ||
            stageName.includes('carton assigned') ||
            stageName.includes('arrived')
        );
    }

    shouldShowSupplyOrderLetterButton(): boolean {
        const source = this.route.snapshot.queryParamMap.get('source') || '';
        // Supply Order Letter is handled by the IT Cell dashboard modal — hide it in the unified view
        if (source === 'itcell' || source === 'it-cell') return false;
        return this.isHologram() && this.getUserContext() === USER_CONTEXTS.IT_CELL && this.isHologramPaymentCompleted();
    }

    openSupplyOrderLetter(): void {
        if (!this.applicationData) return;
        this.supplyOrderLetterModel = this.buildSupplyOrderLetterModel();
        this.supplyOrderLetterOpen = true;
        this.cdr.detectChanges();
        setTimeout(() => {
            const el = document.getElementById('supplyOrderLetterSection');
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
    }

    closeSupplyOrderLetter(): void {
        this.supplyOrderLetterOpen = false;
        this.cdr.detectChanges();
    }

    printSupplyOrderLetter(): void {
        const letterEl = document.getElementById('supplyOrderLetterPrintArea');
        if (!letterEl) return;

        const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Supply Order Letter</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; }
    .supply-letter { background: #fff; }
    .supply-letter-header { text-align: center; border-bottom: 2px solid #111827; padding-bottom: 10px; }
    .supply-letter-title { font-weight: 800; letter-spacing: 0.5px; font-size: 22px; }
    .supply-letter-subtitle { font-weight: 700; color: #374151; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #111827; padding: 8px; font-size: 12px; }
    thead th { background: #f3f4f6; }
    .text-end { text-align: right; }
    .fw-semibold { font-weight: 700; }
    .mt-3 { margin-top: 12px; }
    .mt-4 { margin-top: 16px; }
    .ms-3 { margin-left: 12px; }
    .small { font-size: 11px; }
    .d-flex { display: flex; }
    .justify-content-between { justify-content: space-between; }
  </style>
</head>
<body>
  ${letterEl.outerHTML}
  <script>
    window.onload = function () { window.print(); window.close(); };
  </script>
</body>
</html>`;

        const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
        if (!win) return;
        win.document.open();
        win.document.write(html);
        win.document.close();
    }

    private formatNumberIndian(value: any): string {
        const num = Number(value || 0) || 0;
        return num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }

    private buildSupplyOrderLetterModel(): any | null {
        const supplier = this.hologramSupplierDetails;
        if (!supplier) return null;

        const refNo = String((this.applicationData as any)?.referenceNo || (this.applicationData as any)?.refNo || (this.applicationData as any)?.ref_no || '').trim();
        const datedRaw = (this.applicationData as any)?.submissionDate || (this.applicationData as any)?.date || '';
        const dated = datedRaw ? new Date(datedRaw).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');

        const localQty = this.formatNumberIndian((this.applicationData as any)?.localQty ?? (this.applicationData as any)?.local_qty ?? 0);
        const exportQty = this.formatNumberIndian((this.applicationData as any)?.exportQty ?? (this.applicationData as any)?.export_qty ?? 0);
        const defenceQty = this.formatNumberIndian((this.applicationData as any)?.defenceQty ?? (this.applicationData as any)?.defence_qty ?? 0);
        const totalQtyNum =
            Number((this.applicationData as any)?.localQty ?? (this.applicationData as any)?.local_qty ?? 0) +
            Number((this.applicationData as any)?.exportQty ?? (this.applicationData as any)?.export_qty ?? 0) +
            Number((this.applicationData as any)?.defenceQty ?? (this.applicationData as any)?.defence_qty ?? 0);
        const totalQty = this.formatNumberIndian(totalQtyNum);

        const manufacturingUnit = String((this.applicationData as any)?.distilleryName || (this.applicationData as any)?.manufacturingUnit || (this.applicationData as any)?.manufacturing_unit || '').trim();

        const addressText = String(supplier?.address || '').trim();
        const toAddressLines = addressText ? addressText.split(/\r?\n/).map((x: string) => x.trim()).filter(Boolean) : [];

        return {
            refNo,
            dated,
            toPost: String(supplier?.post || 'The General Manager'),
            toCompany: String(supplier?.company_name || supplier?.companyName || supplier?.name || ''),
            toAddressLines,
            manufacturingUnit,
            localQty,
            exportQty,
            defenceQty,
            totalQty,
        };
    }

    // Type check methods for template
    isRequisition(): boolean { return this.applicationType === 'requisition'; }
    isRevalidation(): boolean { return this.applicationType === 'revalidation'; }
    isCancellation(): boolean { return this.applicationType === 'cancellation'; }
    isTransit(): boolean { return this.applicationType === 'transit'; }
    isHologram(): boolean { return this.applicationType === 'hologram'; }
    isNewLicense(): boolean { return this.applicationType === 'new-license'; }
    isRenewal(): boolean { return this.applicationType === 'license-renewal'; }
    isSalesmanRenewal(): boolean {
        if (!this.applicationData) return false;
        const id = String(this.applicationData.referenceNo || this.applicationData.id || '').toUpperCase();
        return this.isRenewal() && id.startsWith('RSBM/');
    }
    isNewLicenseRenewal(): boolean {
        if (!this.applicationData) return false;
        const id = String(this.applicationData.referenceNo || this.applicationData.id || '').toUpperCase();
        return this.isRenewal() && !id.startsWith('RSBM/');
    }
    isNewLicenseOrRenewal(): boolean {
        return this.isNewLicense() || this.isNewLicenseRenewal();
    }
    isSalesmanOrRenewal(): boolean {
        return this.isSalesmanBarmanRegistration() || this.isSalesmanRenewal();
    }
    isCompanyRegistration(): boolean { return this.applicationType === 'company-registration'; }
    isCompanyCollaboration(): boolean { return this.applicationType === 'company-collaboration'; }
    isSalesmanBarmanRegistration(): boolean { return this.applicationType === 'salesman-barman-registration'; }
    getValidUpToDate(): Date | null {
        if (!this.applicationData) return null;
        const rawDate = 
            this.applicationData['valid_up_to'] || 
            this.applicationData['old_license_valid_up_to'] || 
            this.applicationData['oldLicenseValidUpTo'] ||
            this.applicationData['validUpTo'] ||
            this.applicationData['expiryDate'] ||
            null;
        if (!rawDate) return null;
        if (rawDate instanceof Date) return rawDate;
        const parsed = new Date(rawDate);
        return isNaN(parsed.getTime()) ? null : parsed;
    }
    isExpired(): boolean {
        const validUpTo = this.getValidUpToDate();
        if (!validUpTo) return false;
        return validUpTo.getTime() < Date.now();
    }

    getApplicationTitle(): string {
        return APPLICATION_TITLES[this.applicationType] || 'APPLICATION';
    }

    getPageTitle(): string {
        return PAGE_TITLES[this.applicationType] || 'Application Details';
    }

    goBack(): void {
        const source = this.route.snapshot.queryParamMap.get('source');

        // IT Cell hologram flows should return to the IT Cell dashboard section, not the licensee hologram section.
        if (source === 'itcell' || source === 'it-cell') {
            this.router.navigate(['/dashboard'], { queryParams: { section: 'itcell-hologram', tab: 'hologram' } });
            return;
        }

        // OIC transit detail should go back to "Transit Applications" (4-card OIC view), not licensee "Transit Permit".
        if (this.applicationType === 'transit' && (source === 'officer-in-charge' || this.isOicUser())) {
            this.router.navigate(['/dashboard'], { queryParams: { section: 'transit-applications' } });
            return;
        }

        const supplyChainDashboardTypes: ApplicationType[] = [
            'requisition',
            'revalidation',
            'cancellation',
            'transit',
            'hologram',
            'new-license',
            'license-renewal',
            'company-registration',
            'company-collaboration',
            'salesman-barman-registration'
        ];

        if (supplyChainDashboardTypes.includes(this.applicationType)) {
            this.router.navigate(['/dashboard'], { queryParams: { section: this.applicationType } });
            return;
        }

        if (source && NAVIGATION_ROUTES[source as keyof typeof NAVIGATION_ROUTES]) {
            const route = NAVIGATION_ROUTES[source as keyof typeof NAVIGATION_ROUTES];
            if (route === '/dashboard') {
                this.router.navigate([route], { queryParams: { section: this.applicationType } });
            } else {
                this.router.navigate([route]);
            }
            return;
        }

        // Fallback navigation
        const currentUrl = this.router.url;
        if (currentUrl.includes('/app-permit-section/')) {
            this.router.navigate(['/app-permit-section']);
        } else if (currentUrl.includes('commissioner')) {
            this.router.navigate(['/dev-commissioner-dashboard']);
        } else {
            this.router.navigate(['/dashboard'], { queryParams: { section: this.applicationType } });
        }
    }

    getFormattedStatus(status: string): string {
        if (!status) return 'Unknown';
        return status
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    private getRawStageToken(): string {
        const data: any = this.applicationData as any;
        return String(data?.currentStageName ?? data?.current_stage_name ?? '').trim();
    }

    private shouldSimplifyStatusForLicensee(): boolean {
        // Do not rely on URL/query-param "source" to determine licensee UX.
        // Admin/Officer users can navigate from licensee-like routes but must still see real workflow stage.
        if (!this.roleService.isLicenseeRole()) return false;
        return this.isNewLicense() || this.isSalesmanBarmanRegistration();
    }

    private simplifyStageForLicensee(stageValue: string, statusValue: string): 'Pending' | 'Awaiting Payment' | 'Approved' | 'Rejected' {
        const raw = `${String(stageValue || '')} ${String(statusValue || '')}`.toLowerCase();
        if (raw.includes('approve')) return 'Approved';
        if (raw.includes('reject')) return 'Rejected';
        if (raw.includes('awaiting') && raw.includes('payment')) return 'Awaiting Payment';
        if (raw.includes('payment')) return 'Awaiting Payment';
        return 'Pending';
    }

    getCurrentStatusText(): string {
        const status = String(this.applicationData?.status || '').trim();
        if (!this.shouldSimplifyStatusForLicensee()) {
            const stage = this.getRawStageToken();
            const base = this.hasText(stage) ? stage : status;
            return this.getFormattedStatus(base);
        }
        const stage = this.getRawStageToken();
        return this.simplifyStageForLicensee(stage, status);
    }

    getCurrentStatusToken(): string {
        if (!this.applicationData) return 'PENDING';

        if (!this.shouldSimplifyStatusForLicensee()) {
            const stage = this.getRawStageToken();
            const status = String(this.applicationData?.status || '').trim();
            const base = this.hasText(stage) ? stage : status;
            return String(base || 'PENDING').toUpperCase();
        }

        const simplified = this.getCurrentStatusText().toLowerCase();
        if (simplified.includes('reject')) return 'REJECTED';
        if (simplified.includes('approve')) return 'APPROVED';
        // Treat "Awaiting Payment" as warning/pending in badge styling.
        return 'PENDING';
    }

    getStatusBadgeClass(status: string): string {
        const upperStatus = status.toUpperCase();

        if (SUCCESS_STATUS_KEYWORDS.some(keyword => upperStatus.includes(keyword))) {
            return STATUS_BADGE_CLASSES.SUCCESS;
        } else if (WARNING_STATUS_KEYWORDS.some(keyword => upperStatus.includes(keyword))) {
            return STATUS_BADGE_CLASSES.WARNING;
        } else if (DANGER_STATUS_KEYWORDS.some(keyword => upperStatus.includes(keyword))) {
            return STATUS_BADGE_CLASSES.DANGER;
        } else {
            return STATUS_BADGE_CLASSES.INFO;
        }
    }

    getRefundStatusBadgeClass(status: string): string {
        const statusMap: { [key: string]: string } = {
            'COMPLETED': STATUS_BADGE_CLASSES.SUCCESS,
            'PROCESSED': STATUS_BADGE_CLASSES.SUCCESS,
            'PENDING': STATUS_BADGE_CLASSES.WARNING,
            'REJECTED': STATUS_BADGE_CLASSES.DANGER
        };
        return statusMap[status] || STATUS_BADGE_CLASSES.INFO;
    }

    isApplicationRejected(): boolean {
        const status = String(this.applicationData?.status || '').toLowerCase();
        const stage = String(this.applicationData?.currentStageName || (this.applicationData as any)?.current_stage_name || '').toLowerCase();
        return status.includes('reject') || stage.includes('reject');
    }

    getRejectedByDisplayName(): string {
        const explicit = (this.applicationData as any)?.rejectedByDisplay;
        if (this.hasText(explicit)) {
            return String(explicit).trim();
        }

        const stageText = String(this.applicationData?.currentStageName || (this.applicationData as any)?.current_stage_name || '').trim();
        const statusText = String(this.applicationData?.status || '').trim();
        return this.extractRejectedByFromStageToken(stageText) || this.extractRejectedByFromStageToken(statusText);
    }

    shouldShowRightSideDecisionPanel(): boolean {
        if (!this.applicationData) return false;
        if (this.isTransit()) {
            return (
                this.hasText((this.applicationData as any)?.approvedByDisplay) ||
                this.hasText((this.applicationData as any)?.cancelledByDisplay) ||
                this.isTransitPendingSidebar()
            );
        }
        if (this.isRequisition()) {
            return this.isApplicationRejected() && this.hasText(this.getRejectedByDisplayName());
        }
        return false;
    }

    isTransitPendingSidebar(): boolean {
        if (!this.applicationData || !this.isTransit()) return false;

        // If already approved/cancelled we don't show "Pending With" sidebar.
        if (this.hasText((this.applicationData as any)?.approvedByDisplay) || this.hasText((this.applicationData as any)?.cancelledByDisplay)) {
            return false;
        }

        const status = String((this.applicationData as any)?.status || '').trim();
        const stageName = String((this.applicationData as any)?.currentStageName || (this.applicationData as any)?.current_stage_name || '').trim();
        const statusCode = String((this.applicationData as any)?.statusCode || (this.applicationData as any)?.status_code || '').trim().toUpperCase();

        const token = `${status} ${stageName}`.toLowerCase().replace(/[^a-z0-9]/g, '');
        const pendingLike =
            token.includes('pending') ||
            (token.includes('paymentsuccess') && token.includes('forward') && (token.includes('officer') || token.includes('oic'))) ||
            statusCode === 'TRP_02';

        return pendingLike;
    }

    isRightSideDecisionNegative(): boolean {
        if (this.isRequisition() && this.isApplicationRejected()) return true;
        if (this.isTransit() && this.hasText((this.applicationData as any)?.cancelledByDisplay)) return true;
        return false;
    }

    getRightSideDecisionLabel(): string {
        if (this.isRequisition() && this.isApplicationRejected()) return 'Rejected By';
        if (this.isTransit() && this.isTransitPendingSidebar()) return 'Pending With';
        return this.hasText((this.applicationData as any)?.cancelledByDisplay) ? 'Cancelled By' : 'Approved By';
    }

    getRightSideDecisionName(): string {
        if (this.isRequisition() && this.isApplicationRejected()) {
            return this.getRejectedByDisplayName();
        }
        if (this.isTransit() && this.isTransitPendingSidebar()) {
            return 'Officer In-Charge';
        }
        return String((this.applicationData as any)?.cancelledByDisplay || (this.applicationData as any)?.approvedByDisplay || '').trim();
    }

    getRightSideDecisionReason(): string {
        if (this.isRequisition() && this.isApplicationRejected()) {
            const reason = String((this.applicationData as any)?.cancellationReasonDisplay || '').trim();
            return reason || 'Not provided';
        }
        if (this.isTransit() && this.isRightSideDecisionNegative()) {
            return String((this.applicationData as any)?.cancelledReasonDisplay || '').trim();
        }
        return '';
    }

    hasText(value: unknown): boolean {
        if (value === null || value === undefined) return false;
        return String(value).trim().length > 0;
    }

    asYesNo(value: any): string {
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (typeof value === 'number') return value !== 0 ? 'Yes' : 'No';
        const text = String(value ?? '').trim().toLowerCase();
        if (!text) return 'No';
        return ['true', 'yes', '1'].includes(text) ? 'Yes' : 'No';
    }

    getPachwaiSelected(): any {
        const data: any = this.applicationData as any;
        return data?.pachwai ?? data?.pachwai_flag ?? data?.pachwai_selected;
    }

    getDraughtBeerSelected(): any {
        const data: any = this.applicationData as any;
        return data?.draught_beer ?? data?.draughtBeer ?? data?.draughtbeer;
    }

    getFileUrl(value: unknown): string {
        if (!this.hasText(value)) return '#';
        const valueStr = String(value).trim();

        if (valueStr.startsWith('http://') || valueStr.startsWith('https://')) {
            return valueStr;
        }

        const base = String(environment.apiBaseUrl || '').replace(/\/+$/, '');
        const path = valueStr.startsWith('/') ? valueStr : `/${valueStr}`;
        return `${base}${path}`;
    }

    private normalizeDocUrl(url: string): string {
        const raw = String(url || '').trim();
        if (!raw) return raw;
        try {
            return encodeURI(raw);
        } catch {
            return raw;
        }
    }


    private isFilePath(value: unknown): boolean {
        if (!this.hasText(value)) return false;
        const valueStr = String(value).toLowerCase();
        return (
            valueStr.includes('/media/') ||
            valueStr.endsWith('.pdf') ||
            valueStr.endsWith('.jpg') ||
            valueStr.endsWith('.jpeg') ||
            valueStr.endsWith('.png') ||
            valueStr.endsWith('.webp') ||
            valueStr.endsWith('.doc') ||
            valueStr.endsWith('.docx')
        );
    }

    private isImagePath(value: unknown): boolean {
        if (!this.hasText(value)) return false;
        const valueStr = String(value).toLowerCase();
        return valueStr.endsWith('.jpg') || valueStr.endsWith('.jpeg') || valueStr.endsWith('.png') || valueStr.endsWith('.webp');
    }

    private pickFirstValue(keys: string[]): unknown {
        const data: any = this.applicationData as any;
        for (const key of keys) {
            const candidate = data?.[key];
            if (this.hasText(candidate)) return candidate;
        }
        return null;
    }

    calculateNewLicenseUploads(): void {
        this.newLicenseUploads = [];
        if (!this.applicationData) return;

        let docFields: Array<{ label: string; keys: string[] }> = [];

        const id = String(this.applicationData.referenceNo || this.applicationData.id || '').toUpperCase();
        const isSalesman = this.applicationType === 'salesman-barman-registration' || id.startsWith('RSBM/');
        const isNewLicense = this.applicationType === 'new-license' || this.applicationType === 'license-renewal' || id.startsWith('LRA/');

        if (isNewLicense) {
            docFields = [
                { label: 'Passport Photo', keys: ['pass_photo', 'passPhoto', 'passPhotoUrl'] },
                { label: 'PAN Card', keys: ['pan_card', 'panCard', 'panCardUrl'] },
                { label: 'Sikkim Certificate', keys: ['sikkim_certificate', 'sikkimCertificate', 'sikkimCertificateUrl'] },
                { label: 'DOB Proof', keys: ['dob_proof', 'dobProof', 'dateofBirthProof', 'dateofBirthProofUrl'] },
                { label: 'NOC from Landlord', keys: ['noc_landlord', 'nocLandlord', 'nocLandlordUrl'] }
            ];
        } else if (isSalesman) {
            docFields = [
                { label: 'Passport Photo', keys: ['pass_photo', 'passPhoto'] },
                { label: 'Aadhaar Card', keys: ['aadhaar_card', 'aadhaarCard'] },
                { label: 'Residential Certificate', keys: ['residential_certificate', 'residentialCertificate'] },
                { label: 'Date of Birth Proof', keys: ['dateof_birth_proof', 'dateofBirthProof'] }
            ];
        } else {
            return;
        }

        for (const field of docFields) {
            const rawValue = this.pickFirstValue(field.keys);
            if (!this.isFilePath(rawValue)) continue;
            this.newLicenseUploads.push({
                label: field.label,
                url: this.getFileUrl(rawValue),
                isImage: this.isImagePath(rawValue)
            });
        }
    }

    printApplication(): void {
        const printSection = document.getElementById('applicationPrintSection');
        if (!printSection) {
            console.error('Print section not found');
            alert('Print section not found. Please try again.');
            return;
        }

        // Clone the print section to modify image paths
        const clonedSection = printSection.cloneNode(true) as HTMLElement;

        // Get the base URL for absolute paths
        const baseUrl = window.location.origin;

        // Update all image src attributes to use absolute URLs
        const images = clonedSection.querySelectorAll('img');
        images.forEach(img => {
            const src = img.getAttribute('src');
            if (src && !src.startsWith('http')) {
                img.setAttribute('src', `${baseUrl}/${src}`);
            }
        });

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
            alert('Please allow popups to print');
            return;
        }

        const appTitle = this.getApplicationTitle();

        const styles = `
            <style>
                @page {
                    size: A4 portrait;
                    margin: 10mm;
                }
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                body {
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                    line-height: 1.4;
                    color: #000;
                }
                .card {
                    border: 3px solid #2563eb !important;
                    border-radius: 8px;
                    padding: 12mm;
                    box-shadow: none !important;
                }
                .application-header {
                    text-align: center;
                    margin-bottom: 15px;
                    padding-bottom: 12px;
                    border-bottom: 2px solid #2563eb;
                }
                .dept-seal {
                    height: 60px;
                    width: auto;
                    filter: invert(1) brightness(0.2);
                }
                .d-flex {
                    display: flex;
                }
                .align-items-center {
                    align-items: center;
                }
                .justify-content-center {
                    justify-content: center;
                }
                .gap-3 {
                    gap: 12px;
                }
                .mb-2 {
                    margin-bottom: 8px;
                }
                .mb-3 {
                    margin-bottom: 12px;
                }
                .mb-4 {
                    margin-bottom: 16px;
                }
                .fw-bold {
                    font-weight: bold;
                }
                .fs-4 {
                    font-size: 18px;
                }
                .fs-5 {
                    font-size: 16px;
                }
                .text-primary {
                    color: #2563eb;
                }
                .text-center {
                    text-align: center;
                }
                .mt-2 {
                    margin-top: 8px;
                }
                .p-4 {
                    padding: 16px;
                }
                .row {
                    display: flex;
                    flex-wrap: wrap;
                    margin: 0 -8px;
                }
                .col-md-6 {
                    flex: 0 0 50%;
                    max-width: 50%;
                    padding: 0 8px;
                }
                .col-md-12 {
                    flex: 0 0 100%;
                    max-width: 100%;
                    padding: 0 8px;
                }
                .info-card {
                    background: #f8f9fa;
                    padding: 12px;
                    border-radius: 6px;
                    margin-bottom: 12px;
                    border: 1px solid #e5e7eb;
                }
                h6 {
                    font-size: 13px;
                    font-weight: bold;
                    margin-bottom: 8px;
                }
                p {
                    margin-bottom: 6px;
                    font-size: 11px;
                }
                strong {
                    font-weight: bold;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 8px;
                    font-size: 10px;
                }
                th {
                    background: #2563eb;
                    color: white;
                    padding: 6px 4px;
                    text-align: left;
                    font-weight: bold;
                    font-size: 9px;
                }
                td {
                    padding: 5px 4px;
                    border-bottom: 1px solid #e5e7eb;
                    font-size: 10px;
                }
                tr:last-child td {
                    border-bottom: none;
                }
                .badge {
                    display: inline-block;
                    padding: 3px 8px;
                    border-radius: 4px;
                    font-size: 9px;
                    font-weight: bold;
                }
                .bg-success {
                    background-color: #10b981;
                    color: white;
                }
                .bg-warning {
                    background-color: #f59e0b;
                    color: white;
                }
                .bg-danger {
                    background-color: #ef4444;
                    color: white;
                }
                .bg-info {
                    background-color: #3b82f6;
                    color: white;
                }
                .no-print {
                    display: none !important;
                }
            </style>
        `;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>${appTitle}</title>
                    <meta charset="utf-8">
                    ${styles}
                </head>
                <body>
                    ${clonedSection.outerHTML}
                </body>
            </html>
        `);

        printWindow.document.close();

        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 500);
    }

}
