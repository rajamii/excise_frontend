import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import Swal from 'sweetalert2';

// Services
import { EnaRequisitionService } from '../../../core/services/ena-requisition.service';
import { SupplyChainService } from '../../../features/licensee/supplyChain/services/supplychain.service';
import { HologramDataService } from '../../../features/licensee/supplyChain/services/hologram-data.service';
import { CompanyRegistrationService } from '../../../core/services/company-registration.service';
import { SalesmanBarmanRegistrationService } from '../../../core/services/salesman-barman-registration.service';
import { LicenseApplicationService } from '../../../core/services/license-application.service';
import { ActionButtonConfig } from '../../../core/services/action-config.service';
import { UnifiedActionButtonsComponent } from '../unified-action-buttons/unified-action-buttons.component';
import { UnifiedActionsService } from '../../services/unified-actions.service';
import { SiteEnquiryFormDialogComponent } from '../site-enquiry-form-dialog/site-enquiry-form-dialog.component';

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
    license_type_name?: string;
    licenseTypeName?: string;
    license_type?: string;
    license_category_name?: string;
    licenseCategoryName?: string;
    license_category?: string;
    license_sub_category_name?: string;
    licenseSubCategoryName?: string;
    site_district_name?: string;
    siteDistrictName?: string;
    site_subdivision_name?: string;
    siteSubdivisionName?: string;
    police_station_name?: string;
    policeStationName?: string;
    yearly_license_fee?: string | number;
    yearlyLicenseFee?: string | number;

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

@Component({
    selector: 'app-unified-supply-chain-view',
    standalone: true,
    imports: [CommonModule, UnifiedActionButtonsComponent],
    templateUrl: './unified-supply-chain-view.component.html',
    styleUrls: ['./unified-supply-chain-view.component.scss']
})
export class UnifiedSupplyChainViewComponent implements OnInit {
    applicationData?: UnifiedApplicationData;
    applicationType: ApplicationType = 'requisition';
    isLoading = false;
    errorMessage = '';
    
    private readonly isBrowser: boolean;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private http: HttpClient,
        private enaRequisitionService: EnaRequisitionService,
        private supplyChainService: SupplyChainService,
        private hologramDataService: HologramDataService,
        private companyRegistrationService: CompanyRegistrationService,
        private salesmanBarmanRegistrationService: SalesmanBarmanRegistrationService,
        private licenseApplicationService: LicenseApplicationService,
        private unifiedActionsService: UnifiedActionsService,
        private dialog: MatDialog,
        private snackBar: MatSnackBar,
        @Inject(PLATFORM_ID) platformId: Object
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
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
            this.loadApplicationData(params.ref || '', params.id || '');
        } else {
            this.goBack();
        }
    }

    private extractRouteParams() {
        const type = this.route.snapshot.queryParamMap.get('type') as ApplicationType || 'requisition';
        const ref = this.route.snapshot.paramMap.get('ref') || this.route.snapshot.queryParamMap.get('ref');
        const id = this.route.snapshot.queryParamMap.get('id');
        
        return { type, ref, id };
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

    private loadByIdWithFallback(config: ServiceConfig, id: string, refNo: string): void {
        const detailObservable = config.service[config.detailMethod](id);
        
        detailObservable.subscribe({
            next: (data: any) => {
                if (data) {
                    this.mapApplicationData(data, config);
                } else {
                    this.loadByReference(config, refNo);
                }
                this.isLoading = false;
            },
            error: (error: any) => {
                this.loadByReference(config, refNo);
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
                    this.mapApplicationData(foundItem, config);
                } else {
                    this.errorMessage = `${this.applicationType} not found in available data.`;
                }
                this.isLoading = false;
            },
            error: (err: any) => {
                this.errorMessage = `Could not load ${this.applicationType} details from server.`;
                this.isLoading = false;
            }
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

        // For workflows where backend often sends generic "PENDING",
        // prefer explicit current stage name for user-facing status.
        if (
            (this.applicationType === 'salesman-barman-registration' || this.applicationType === 'company-registration') &&
            mappedData.currentStageName &&
            (!mappedData.status || String(mappedData.status).toUpperCase() === 'PENDING')
        ) {
            mappedData.status = String(mappedData.currentStageName);
        }

        Object.keys(apiData).forEach(key => {
            if (!mappedData.hasOwnProperty(key)) {
                mappedData[key] = apiData[key];
            }
        });

        this.addComputedFields(mappedData, apiData, config);

        this.applicationData = mappedData;
        this.loadWorkflowActions();
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

    onUnifiedAction(event: { action: string, item: any }): void {
        const context = this.getUserContext();
        const action = (event.action || '').toUpperCase();

        if (action === 'APPROVE') {
            this.handleApproveWithDynamicPrechecks(event.item, context);
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

                this.unifiedActionsService.executeAction('APPROVE', item, this.applicationType, context).subscribe({
                    next: (result: any) => {
                        const isSuccess = result?.success !== false;
                        if (isSuccess) {
                            if (result.message) {
                                this.snackBar.open(result.message, 'Close', { duration: 3000 });
                            }
                            const currentId = this.applicationData?.id?.toString() || '';
                            const currentRef = this.applicationData?.referenceNo || '';
                            this.loadApplicationData(currentRef, currentId);
                        } else {
                            this.snackBar.open(result?.message || 'Action failed', 'Close', { duration: 4000 });
                        }
                    },
                    error: (error: any) => {
                        this.snackBar.open(this.extractHttpErrorMessage(error, 'Action failed'), 'Close', { duration: 4500 });
                    }
                });
            },
            error: () => {
                if (this.isCurrentStageSiteEnquiry()) {
                    this.openSiteEnquiryAndApprove(item, context, applicationId);
                    return;
                }
                this.unifiedActionsService.executeAction('APPROVE', item, this.applicationType, context).subscribe({
                    next: (result: any) => {
                        const isSuccess = result?.success !== false;
                        if (isSuccess) {
                            if (result.message) {
                                this.snackBar.open(result.message, 'Close', { duration: 3000 });
                            }
                            const currentId = this.applicationData?.id?.toString() || '';
                            const currentRef = this.applicationData?.referenceNo || '';
                            this.loadApplicationData(currentRef, currentId);
                        } else {
                            this.snackBar.open(result?.message || 'Action failed', 'Close', { duration: 4000 });
                        }
                    },
                    error: (error: any) => {
                        this.snackBar.open(this.extractHttpErrorMessage(error, 'Action failed'), 'Close', { duration: 4500 });
                    }
                });
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

    private openSiteEnquiryAndApprove(item: any, context: UserContext, applicationId: string): void {
        const submitSiteEnquiry$ =
            this.applicationType === 'new-license'
                ? (formData: FormData) => this.licenseApplicationService.submitNewLicenseSiteEnquiryData(applicationId, formData)
                : (formData: FormData) => this.licenseApplicationService.submitSiteEnquiryData(applicationId, formData);

        const dialogRef = this.dialog.open(SiteEnquiryFormDialogComponent, {
            width: '980px',
            maxWidth: '98vw',
            disableClose: true,
            data: { applicationId }
        });

        dialogRef.afterClosed().subscribe((result: { formData: FormData } | null) => {
            if (!result?.formData) {
                return;
            }

            submitSiteEnquiry$(result.formData).subscribe({
                next: () => {
                    this.unifiedActionsService.executeAction('APPROVE', item, this.applicationType, context).subscribe({
                        next: (approveResult: any) => {
                            const isSuccess = approveResult?.success !== false;
                            if (isSuccess) {
                                this.snackBar.open('Site enquiry submitted and application approved.', 'Close', { duration: 3500 });
                                const currentId = this.applicationData?.id?.toString() || '';
                                const currentRef = this.applicationData?.referenceNo || '';
                                this.loadApplicationData(currentRef, currentId);
                                return;
                            }
                            this.snackBar.open(approveResult?.message || 'Approval failed after site enquiry submit.', 'Close', { duration: 4500 });
                        },
                        error: (error: any) => {
                            this.snackBar.open(this.extractHttpErrorMessage(error, 'Approval failed after site enquiry submit.'), 'Close', { duration: 4500 });
                        }
                    });
                },
                error: (error: any) => {
                    const message = this.extractHttpErrorMessage(error, 'Failed to submit site enquiry form.');
                    if (String(message).toLowerCase().includes('already submitted')) {
                        this.unifiedActionsService.executeAction('APPROVE', item, this.applicationType, context).subscribe({
                            next: (approveResult: any) => {
                                const isSuccess = approveResult?.success !== false;
                                if (isSuccess) {
                                    this.snackBar.open('Existing site enquiry found. Application approved.', 'Close', { duration: 3500 });
                                    const currentId = this.applicationData?.id?.toString() || '';
                                    const currentRef = this.applicationData?.referenceNo || '';
                                    this.loadApplicationData(currentRef, currentId);
                                    return;
                                }
                                this.snackBar.open(approveResult?.message || 'Approval failed.', 'Close', { duration: 4500 });
                            },
                            error: (approveError: any) => {
                                this.snackBar.open(this.extractHttpErrorMessage(approveError, 'Approval failed.'), 'Close', { duration: 4500 });
                            }
                        });
                        return;
                    }
                    this.snackBar.open(message, 'Close', { duration: 4500 });
                }
            });
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

    private extractHttpErrorMessage(error: any, fallback: string): string {
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
                return 'Server returned an HTML error page instead of API JSON. Please check backend endpoint/permission for Site Enquiry.';
            }
            if (rawError.trim()) {
                return rawError.trim();
            }
        }

        const topMessage = error?.message;
        if (typeof topMessage === 'string' && topMessage.toLowerCase().includes('unexpected token')) {
            return 'Server returned an invalid JSON response (HTML page). Please check backend endpoint/permission for Site Enquiry.';
        }

        return fallback;
    }

    getIncludeActionsForDetailView(): string[] | null {
        if (!this.applicationData) {
            return null;
        }

        const actions: string[] = [];

        // For requisitions, use backend-driven eligibility flags.
        if (this.applicationType === 'requisition') {
            const isLicensee = this.getUserContext() === 'licensee';
            const canRequestCancellation = this.canRequestRequisitionCancellation();

            if (isLicensee && canRequestCancellation) {
                actions.push('REQUEST_CANCELLATION');
            }
        }

        return actions.length > 0 ? actions : null;
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

    // Type check methods for template
    isRequisition(): boolean { return this.applicationType === 'requisition'; }
    isRevalidation(): boolean { return this.applicationType === 'revalidation'; }
    isCancellation(): boolean { return this.applicationType === 'cancellation'; }
    isTransit(): boolean { return this.applicationType === 'transit'; }
    isHologram(): boolean { return this.applicationType === 'hologram'; }
    isNewLicense(): boolean { return this.applicationType === 'new-license'; }
    isCompanyRegistration(): boolean { return this.applicationType === 'company-registration'; }
    isSalesmanBarmanRegistration(): boolean { return this.applicationType === 'salesman-barman-registration'; }

    getApplicationTitle(): string {
        return APPLICATION_TITLES[this.applicationType] || 'APPLICATION';
    }

    getPageTitle(): string {
        return PAGE_TITLES[this.applicationType] || 'Application Details';
    }

    goBack(): void {
        const source = this.route.snapshot.queryParamMap.get('source');
        
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

    hasText(value: unknown): boolean {
        if (value === null || value === undefined) return false;
        return String(value).trim().length > 0;
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
