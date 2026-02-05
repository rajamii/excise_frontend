import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of } from 'rxjs';
import Swal from 'sweetalert2';

// Services
import { EnaRequisitionService } from '../../../core/services/ena-requisition.service';
import { SupplyChainService } from '../../../features/licensee/supplyChain/services/supplychain.service';
import { HologramDataService } from '../../../features/licensee/supplyChain/services/hologram-data.service';
import { WorkflowService } from '../../../core/services/workflow.service';
import { ActionConfigService, ActionButtonConfig } from '../../../core/services/action-config.service';

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
    paymentAmount?: number;
    hologramType?: string;
    permitType?: string;
    
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
    imports: [CommonModule],
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
        private enaRequisitionService: EnaRequisitionService,
        private supplyChainService: SupplyChainService,
        private hologramDataService: HologramDataService,
        private workflowService: WorkflowService,
        private actionConfigService: ActionConfigService,
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
                    brAmount: ['totalbl', 'total_bl', 'grainEnaNumber', 'grain_ena_number', 'br_amount', 'brAmount'],
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
                    currentStage: ['currentStage', 'current_stage', 'stageId'],
                    currentStageName: ['current_stage_name', 'currentStageName'],
                    workflowId: ['workflow', 'workflow_id', 'workflowId'],
                    distilleryName: ['manufacturingUnit', 'manufacturing_unit', 'licenseeName', 'licensee_name'],
                    brAmount: ['paymentAmount', 'payment_amount', 'total_amount', 'totalAmount'],
                    quantity: ['localQty', 'exportQty', 'defenceQty', 'total_requested_quantity']
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

        const mappedData: UnifiedApplicationData = {
            id: this.extractFieldValue(apiData, config.fieldMappings.id)?.toString() || '',
            referenceNo: this.extractFieldValue(apiData, config.fieldMappings.referenceNo) || '',
            submissionDate: this.parseDate(this.extractFieldValue(apiData, config.fieldMappings.submissionDate)),
            status: this.extractFieldValue(apiData, config.fieldMappings.status) || 'PENDING',
            currentStage: this.extractFieldValue(apiData, config.fieldMappings.currentStage || []),
            currentStageName: this.extractFieldValue(apiData, config.fieldMappings.currentStageName || []),
            workflowId: this.extractFieldValue(apiData, config.fieldMappings.workflowId || []) || config.workflowId,
            allowedActions: [],
            allowedActionConfigs: []
        };

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
                mappedData['localQty'] = this.parseNumericValue(this.extractFieldValue(apiData, ['localQty', 'local_qty']));
                mappedData['exportQty'] = this.parseNumericValue(this.extractFieldValue(apiData, ['exportQty', 'export_qty']));
                mappedData['defenceQty'] = this.parseNumericValue(this.extractFieldValue(apiData, ['defenceQty', 'defence_qty']));
                mappedData['totalQty'] = (mappedData['localQty'] || 0) + (mappedData['exportQty'] || 0) + (mappedData['defenceQty'] || 0);
                mappedData['paymentAmount'] = this.parseNumericValue(this.extractFieldValue(apiData, ['paymentAmount', 'payment_amount']));
                break;
        }
    }

    private findItemByReference(items: any[], refNo: string, referenceFields: string[]): any {
        const decodedRefNo = decodeURIComponent(refNo);
        
        for (const field of referenceFields) {
            const foundItem = items.find((item: any) => 
                item[field] === refNo || item[field] === decodedRefNo
            );
            if (foundItem) return foundItem;
        }
        
        for (const field of referenceFields) {
            const foundItem = items.find((item: any) => 
                item[field] && (
                    item[field].includes(refNo) || 
                    item[field].includes(decodedRefNo)
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

    /**
     * Load workflow actions from backend
     * Prepare the data for unified-action-buttons component
     */
    private loadWorkflowActions(): void {
        if (!this.applicationData) return;

        this.applicationData.workflowId = this.applicationData.workflowId || this.currentServiceConfig.workflowId;
        this.applicationData.currentStage = this.applicationData.currentStage || 1;
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

    // Type check methods for template
    isRequisition(): boolean { return this.applicationType === 'requisition'; }
    isRevalidation(): boolean { return this.applicationType === 'revalidation'; }
    isCancellation(): boolean { return this.applicationType === 'cancellation'; }
    isTransit(): boolean { return this.applicationType === 'transit'; }
    isHologram(): boolean { return this.applicationType === 'hologram'; }

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

    printApplication(): void {
        window.print();
    }

}