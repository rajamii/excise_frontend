import { Component, Inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { EnaRequisitionService } from '../../../core/services/ena-requisition.service';
import { SupplyChainService } from '../../../features/licensee/supplyChain/services/supplychain.service';
import { HologramDataService } from '../../../features/licensee/supplyChain/services/hologram-data.service';
import { WorkflowActionService, ApplicationWorkflowData, WorkflowActionConfig } from '../../../core/services/workflow-action.service';
import { UnifiedActionButtonsComponent } from '../unified-action-buttons/unified-action-buttons.component';

// Application type enum
export type ApplicationType = 'requisition' | 'revalidation' | 'cancellation' | 'transit' | 'hologram';

// Unified interface that covers all application types
export interface UnifiedApplicationData {
    // Common fields (all types)
    id: string;
    referenceNo: string;
    submissionDate: Date;
    distilleryName: string;
    status: string;
    brAmount: number;
    allowedActions?: string[];

    // Requisition fields
    quantity?: number;
    numberOfPermits?: number;
    bulkSpiritType?: string;
    strengthTo?: string;
    liftedFrom?: string;
    viaRoute?: string;
    checkpostEntry?: string;
    purpose?: string;

    // Revalidation fields
    revalidationAmount?: number;
    originalPermitNo?: string;
    originalPermitDate?: Date;
    expiryDate?: Date;
    reasonForRevalidation?: string;
    newQuantity?: number;
    newPurpose?: string;

    // Cancellation fields
    cancellationAmount?: number;
    refundAmount?: number;
    refundStatus?: string;
    cancellationReason?: string;

    // Transit fields
    permitType?: string;
    vehicleNumber?: string;
    driverName?: string;
    driverLicense?: string;
    fromLocation?: string;
    toLocation?: string;
    goodsDescription?: string;
    unit?: string;
    routeDetails?: string;
    checkpostExit?: string;
    validityPeriod?: number;
    issuedBy?: string;
    issuedDate?: Date;
    transporterName?: string;
    transporterLicense?: string;
    estimatedTravelTime?: string;
    securityDeposit?: number;
    insuranceDetails?: string;

    // Hologram fields
    hologramType?: string;
    hologramQuantity?: number;
    hologramSeriesStart?: string;
    hologramSeriesEnd?: string;
    localQty?: number;
    exportQty?: number;
    defenceQty?: number;
    totalQty?: number;
    paymentAmount?: number;
    cartoonNumber?: string;
    hologramStatus?: string;

    // Workflow fields
    currentStage?: number;
    currentStageName?: string;
    workflowId?: number;
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
    private isBrowser = false;
    isLoading = false;
    errorMessage = '';
    workflowActions: WorkflowActionConfig[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private enaRequisitionService: EnaRequisitionService,
        private supplyChainService: SupplyChainService,
        private hologramDataService: HologramDataService,
        private workflowActionService: WorkflowActionService,
        @Inject(PLATFORM_ID) platformId: Object
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
    }

    ngOnInit(): void {
        if (this.isBrowser) {
            // Get the application type from query params
            const type = this.route.snapshot.queryParamMap.get('type') as ApplicationType;
            if (type) {
                this.applicationType = type;
            }

            // Get the reference number
            let ref = this.route.snapshot.paramMap.get('ref');
            if (!ref) {
                ref = this.route.snapshot.queryParamMap.get('ref');
            }

            const id = this.route.snapshot.queryParamMap.get('id');

            console.log('UnifiedSupplyChainView - ngOnInit:', {
                type: this.applicationType,
                ref,
                id,
                queryParams: this.route.snapshot.queryParams
            });

            if (ref || id) {
                this.loadApplicationData(ref || '', id || '');
            } else {
                this.goBack();
            }
        }
    }

    private loadApplicationData(refNo: string, id: string): void {
        this.isLoading = true;
        this.errorMessage = '';

        switch (this.applicationType) {
            case 'requisition':
                this.loadRequisitionData(refNo, id);
                break;
            case 'revalidation':
                this.loadRevalidationData(refNo, id);
                break;
            case 'cancellation':
                this.loadCancellationData(refNo, id);
                break;
            case 'transit':
                this.loadTransitData(refNo, id);
                break;
            case 'hologram':
                this.loadHologramData(refNo, id);
                break;
            default:
                this.loadRequisitionData(refNo, id);
        }
    }

    private loadRequisitionData(refNo: string, id: string): void {
        this.enaRequisitionService.getRequisitions().subscribe({
            next: (data: any) => {
                const foundItem = data.find((item: any) =>
                    item.referenceNo === refNo ||
                    item.reference_no === refNo ||
                    item.id?.toString() === id
                );

                if (foundItem) {
                    this.mapRequisitionData(foundItem);
                } else {
                    this.loadRequisitionFallback(refNo, id);
                }
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error loading requisition data:', err);
                this.loadRequisitionFallback(refNo, id);
                this.isLoading = false;
            }
        });
    }

    private mapRequisitionData(apiData: any): void {
        this.applicationData = {
            id: apiData.id || '',
            referenceNo: apiData.referenceNo || apiData.reference_no || '',
            submissionDate: new Date(apiData.requestDate || apiData.request_date || apiData.created_at || Date.now()),
            distilleryName: apiData.distilleryName || apiData.distillery_name || '',
            status: apiData.status || 'PENDING',
            brAmount: parseFloat(apiData.amount || apiData.total_amount || '0'),
            quantity: parseFloat(apiData.quantity || '0'),
            numberOfPermits: parseInt(apiData.numberOfPermits || '1'),
            bulkSpiritType: apiData.bulkSpiritType || apiData.bulk_spirit_type || '',
            strengthTo: apiData.strength || '',
            liftedFrom: apiData.liftedFrom || apiData.lifted_from || '',
            viaRoute: apiData.route || '',
            checkpostEntry: apiData.checkpost || '',
            purpose: apiData.purpose || '',
            allowedActions: apiData.allowed_actions || [],
            // Workflow fields
            currentStage: apiData.current_stage || apiData.currentStage,
            currentStageName: apiData.current_stage_name || apiData.currentStageName,
            workflowId: apiData.workflow_id || apiData.workflowId || 1 // Default to requisition workflow
        };
        
        // Set allowed actions after applicationData is created
        if (!apiData.allowed_actions || apiData.allowed_actions.length === 0) {
            this.applicationData.allowedActions = this.getDefaultAllowedActions();
        }
        
        // Always ensure VIEW action is available
        if (this.applicationData && !this.applicationData.allowedActions?.includes('VIEW')) {
            this.applicationData.allowedActions = this.applicationData.allowedActions || [];
            this.applicationData.allowedActions.push('VIEW');
        }

        console.log('mapRequisitionData - final allowedActions:', this.applicationData.allowedActions);
        console.log('mapRequisitionData - user context:', this.getUserContext());
        console.log('mapRequisitionData - status:', this.applicationData.status);

        // Load workflow-based actions
        this.loadWorkflowActions();
    }

    /**
     * Load workflow-based actions for the current application
     */
    private loadWorkflowActions(): void {
        if (!this.applicationData) return;

        console.log('Loading workflow actions for:', {
            id: this.applicationData.id,
            type: this.applicationType,
            status: this.applicationData.status,
            currentStage: this.applicationData.currentStage,
            workflowId: this.applicationData.workflowId,
            allowedActions: this.applicationData.allowedActions
        });

        const workflowData: ApplicationWorkflowData = {
            id: this.applicationData.id,
            type: this.applicationType,
            status: this.applicationData.status,
            currentStage: this.applicationData.currentStage,
            currentStageName: this.applicationData.currentStageName,
            workflowId: this.applicationData.workflowId
        };

        this.workflowActionService.getAvailableActions(workflowData).subscribe({
            next: (actions) => {
                console.log('Workflow actions loaded:', actions);
                this.workflowActions = actions;
                // Update allowedActions with workflow actions
                if (this.applicationData) {
                    this.applicationData.allowedActions = actions.map(a => a.action);
                    console.log('Updated allowedActions:', this.applicationData.allowedActions);
                }
            },
            error: (error) => {
                console.error('Error loading workflow actions:', error);
                // Fallback to default actions
                this.workflowActions = [];
                console.log('Using fallback - workflowActions set to empty array');
            }
        });
    }

    private loadRequisitionFallback(refNo: string, id: string): void {
        // Fallback or empty state if API fails
        this.applicationData = {
            id: id || '999',
            referenceNo: refNo,
            submissionDate: new Date(),
            distilleryName: 'Unknown Distillery',
            status: 'FORWARDEDTOCOMMISSIONER',
            brAmount: 0.00,
            quantity: 0,
            // Default workflow data for requisition
            currentStage: 2, // Assume forwarded to commissioner stage
            currentStageName: 'Commissioner Review',
            workflowId: 1 // Requisition workflow
        };
        // Set allowed actions after applicationData is set
        this.applicationData.allowedActions = this.getDefaultAllowedActions();
        this.errorMessage = 'Could not load application details from server.';
        
        console.log('loadRequisitionFallback - allowedActions:', this.applicationData.allowedActions);
        console.log('loadRequisitionFallback - user context:', this.getUserContext());
        console.log('loadRequisitionFallback - status:', this.applicationData.status);
        
        // Load workflow-based actions
        this.loadWorkflowActions();
    }

    private loadRevalidationData(refNo: string, id: string): void {
        this.supplyChainService.getRevalidationData().subscribe({
            next: (data) => {
                const foundItem = data.find((item: any) =>
                    item.our_ref_no === refNo ||
                    item.ourRefNo === refNo ||
                    item.id?.toString() === id
                );

                if (foundItem) {
                    this.mapRevalidationData(foundItem);
                } else {
                    this.loadRevalidationFallback(refNo, id);
                }
                this.isLoading = false;
            },
            error: () => {
                this.loadRevalidationFallback(refNo, id);
                this.isLoading = false;
            }
        });
    }

    private loadRevalidationFallback(refNo: string, id: string): void {
        this.applicationData = {
            id: id || '999',
            referenceNo: refNo,
            submissionDate: new Date(),
            distilleryName: 'M/s Sikkim Distilleries Ltd',
            status: 'REVALIDATION REQUEST PENDING APPROVAL',
            brAmount: 0.00,
            revalidationAmount: 1000.00,
            originalPermitNo: refNo,
            originalPermitDate: new Date(),
            expiryDate: new Date(),
            reasonForRevalidation: 'Permit extension required',
            quantity: 5,
            numberOfPermits: 1,
            bulkSpiritType: 'grain-ena',
            strengthTo: '96.0',
            liftedFrom: 'sikkim-distilleries',
            viaRoute: 'Gangtok - Siliguri Highway',
            checkpostEntry: 'rangpo',
            purpose: 'manufacturing',
            // Default workflow data for revalidation
            currentStage: 1, // Initial stage
            currentStageName: 'Application Submitted',
            workflowId: 2 // Revalidation workflow
        };
        // Set allowed actions after applicationData is set
        this.applicationData.allowedActions = this.getDefaultAllowedActions();
        
        // Load workflow-based actions
        this.loadWorkflowActions();
    }

    private mapRevalidationData(apiData: any): void {
        this.applicationData = {
            id: apiData.id || apiData.pk || '',
            referenceNo: apiData.ourRefNo || apiData.our_ref_no || apiData.referenceNo || '',
            submissionDate: new Date(apiData.requisitionDate || apiData.requisition_date || apiData.created_at || Date.now()),
            distilleryName: apiData.distilleryName || apiData.distillery_name || '',
            status: apiData.status || 'PENDING',
            brAmount: parseFloat(apiData.brAmount || apiData.br_amount || '0'),
            revalidationAmount: parseFloat(apiData.revalidationBrAmount || apiData.revalidation_br_amount || '0'),
            originalPermitNo: apiData.originalPermitNo || apiData.original_permit_no || '',
            originalPermitDate: apiData.originalPermitDate ? new Date(apiData.originalPermitDate) : undefined,
            expiryDate: apiData.revalidationDate ? new Date(apiData.revalidationDate) : undefined,
            reasonForRevalidation: apiData.reasonForRevalidation || apiData.reason_for_revalidation || '',
            quantity: parseFloat(apiData.totalBl || apiData.total_bl || '0'),
            numberOfPermits: parseInt(apiData.requisitonNumberOfPermits || '1'),
            bulkSpiritType: apiData.bulkSpiritType || apiData.bulk_spirit_type || '',
            strengthTo: apiData.strength || apiData.strengthTo || '',
            liftedFrom: apiData.liftedFrom || apiData.lifted_from || '',
            viaRoute: apiData.viaRoute || apiData.via_route || '',
            checkpostEntry: apiData.checkpostEntry || apiData.checkpost_entry || '',
            purpose: apiData.branchPurpose || apiData.branch_purpose || apiData.purpose || '',
            allowedActions: apiData.allowed_actions || [],
            // Workflow fields
            currentStage: apiData.current_stage || apiData.currentStage,
            currentStageName: apiData.current_stage_name || apiData.currentStageName,
            workflowId: apiData.workflow_id || apiData.workflowId || 2 // Revalidation workflow
        };
        
        // Set allowed actions after applicationData is created
        if (!apiData.allowed_actions || apiData.allowed_actions.length === 0) {
            this.applicationData.allowedActions = this.getDefaultAllowedActions();
        }

        // Load workflow-based actions
        this.loadWorkflowActions();
    }

    private loadCancellationData(refNo: string, id: string): void {
        this.supplyChainService.getCancellations().subscribe({
            next: (data: any) => {
                const foundItem = data.find((item: any) =>
                    item.our_ref_no === refNo ||
                    item.ourRefNo === refNo ||
                    item.id?.toString() === id
                );

                if (foundItem) {
                    this.mapCancellationData(foundItem);
                } else {
                    this.loadCancellationFallback(refNo, id);
                }
                this.isLoading = false;
            },
            error: () => {
                this.loadCancellationFallback(refNo, id);
                this.isLoading = false;
            }
        });
    }

    private loadCancellationFallback(refNo: string, id: string): void {
        this.applicationData = {
            id: id || '999',
            referenceNo: refNo,
            submissionDate: new Date(),
            distilleryName: 'M/s Sikkim Distilleries Ltd',
            status: 'CANCELLATION REQUEST PENDING APPROVAL',
            brAmount: 0.00,
            cancellationAmount: 500.00,
            refundAmount: 450.00,
            refundStatus: 'PENDING',
            cancellationReason: 'Permit no longer required',
            quantity: 500,
            numberOfPermits: 1,
            bulkSpiritType: 'grain-ena',
            // Default workflow data for cancellation
            currentStage: 1, // Initial stage
            currentStageName: 'Cancellation Request Submitted',
            workflowId: 3 // Cancellation workflow
        };
        
        // Set allowed actions after applicationData is set
        this.applicationData.allowedActions = this.getDefaultAllowedActions();
        
        // Load workflow-based actions
        this.loadWorkflowActions();
    }

    private mapCancellationData(apiData: any): void {
        this.applicationData = {
            id: apiData.id || apiData.pk || '',
            referenceNo: apiData.ourRefNo || apiData.our_ref_no || apiData.referenceNo || '',
            submissionDate: new Date(apiData.requisitionDate || apiData.created_at || Date.now()),
            distilleryName: apiData.distilleryName || apiData.distillery_name || '',
            status: apiData.status || 'PENDING',
            brAmount: parseFloat(apiData.brAmount || apiData.br_amount || '0'),
            cancellationAmount: parseFloat(apiData.cancellationAmount || '0'),
            refundAmount: parseFloat(apiData.refundAmount || '0'),
            refundStatus: apiData.refundStatus || 'PENDING',
            cancellationReason: apiData.cancellationReason || apiData.reason || '',
            quantity: parseFloat(apiData.totalBl || apiData.total_bl || '0'),
            numberOfPermits: parseInt(apiData.numberOfPermits || '1'),
            bulkSpiritType: apiData.bulkSpiritType || apiData.bulk_spirit_type || '',
            allowedActions: apiData.allowed_actions || [],
            // Workflow fields
            currentStage: apiData.current_stage || apiData.currentStage,
            currentStageName: apiData.current_stage_name || apiData.currentStageName,
            workflowId: apiData.workflow_id || apiData.workflowId || 3 // Cancellation workflow
        };
        
        // Set allowed actions after applicationData is created
        if (!apiData.allowed_actions || apiData.allowed_actions.length === 0) {
            this.applicationData.allowedActions = this.getDefaultAllowedActions();
        }

        // Load workflow-based actions
        this.loadWorkflowActions();
    }

    private loadTransitData(refNo: string, id: string): void {
        this.supplyChainService.getTransitPermits().subscribe({
            next: (data: any[]) => {
                const foundItem = data.find((item: any) =>
                    item.referenceNo === refNo ||
                    item.reference_no === refNo ||
                    item.id?.toString() === id
                );

                if (foundItem) {
                    this.mapTransitData(foundItem);
                } else {
                    this.loadTransitFallback(refNo, id);
                }
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error loading transit data:', err);
                this.loadTransitFallback(refNo, id);
                this.isLoading = false;
            }
        });
    }

    private mapTransitData(apiData: any): void {
        this.applicationData = {
            id: apiData.id || '',
            referenceNo: apiData.referenceNo || apiData.reference_no || '',
            submissionDate: new Date(apiData.issueDate || apiData.issue_date || apiData.created_at || Date.now()),
            distilleryName: apiData.distilleryName || apiData.distillery_name || '',
            status: apiData.status || 'ISSUED',
            brAmount: parseFloat(apiData.amount || '0'),
            permitType: 'Alcohol Transit Permit', // Usually standard
            vehicleNumber: apiData.vehicleNumber || apiData.vehicle_number || '',
            driverName: apiData.driverName || apiData.driver_name || '',
            driverLicense: apiData.driverLicense || apiData.driver_license || '',
            fromLocation: apiData.fromLocation || apiData.from_location || '',
            toLocation: apiData.toLocation || apiData.to_location || '',
            goodsDescription: apiData.goodsDescription || apiData.goods_description || '',
            quantity: parseFloat(apiData.quantity || '0'),
            unit: apiData.unit || 'BL',
            routeDetails: apiData.route || '',
            checkpostEntry: apiData.checkpostEntry || '',
            checkpostExit: apiData.checkpostExit || '',
            validityPeriod: parseInt(apiData.validityDays || '7'),
            issuedBy: apiData.issuedBy || 'Excise Officer',
            issuedDate: apiData.issueDate ? new Date(apiData.issueDate) : new Date(),
            transporterName: apiData.transporter || '',
            transporterLicense: apiData.transporterLicense || '',
            estimatedTravelTime: apiData.travelTime || '',
            securityDeposit: parseFloat(apiData.securityDeposit || '0'),
            insuranceDetails: apiData.insurance || '',
            allowedActions: apiData.allowed_actions || [],
            // Workflow fields
            currentStage: apiData.current_stage || apiData.currentStage,
            currentStageName: apiData.current_stage_name || apiData.currentStageName,
            workflowId: apiData.workflow_id || apiData.workflowId || 4 // Transit workflow
        };
        
        // Set allowed actions after applicationData is created
        if (!apiData.allowed_actions || apiData.allowed_actions.length === 0) {
            this.applicationData.allowedActions = this.getDefaultAllowedActions();
        }

        // Load workflow-based actions
        this.loadWorkflowActions();
    }

    private loadTransitFallback(refNo: string, id: string): void {
        this.applicationData = {
            id: id || '999',
            referenceNo: refNo,
            submissionDate: new Date(),
            distilleryName: 'Unknown',
            status: 'NOT FOUND',
            brAmount: 0.00,
            // Default workflow data for transit
            currentStage: 1, // Initial stage
            currentStageName: 'Transit Application Submitted',
            workflowId: 4 // Transit workflow
        };
        this.errorMessage = 'Could not load transit permit details.';
        
        // Set allowed actions after applicationData is set
        this.applicationData.allowedActions = this.getDefaultAllowedActions();
        
        // Load workflow-based actions
        this.loadWorkflowActions();
    }

    private loadHologramData(refNo: string, id: string): void {
        this.hologramDataService.getProcurements().subscribe({
            next: (data: any[]) => {
                const foundItem = data.find((item: any) =>
                    item.refNo === refNo ||
                    item.referenceNo === refNo ||
                    item.id?.toString() === id
                );

                if (foundItem) {
                    this.mapHologramData(foundItem);
                } else {
                    this.loadHologramFallback(refNo, id);
                }
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error loading hologram data:', err);
                this.loadHologramFallback(refNo, id);
                this.isLoading = false;
            }
        });
    }

    private mapHologramData(apiData: any): void {
        // Calculate totals
        const localQty = Number(apiData.localQty || apiData.local_qty || 0);
        const exportQty = Number(apiData.exportQty || apiData.export_qty || 0);
        const defenceQty = Number(apiData.defenceQty || apiData.defence_qty || 0);
        const totalQty = localQty + exportQty + defenceQty;

        // Determine type(s)
        let typeStr = apiData.hologramType || '';
        if (!typeStr) {
            const types = [];
            if (localQty > 0) types.push('LOCAL');
            if (exportQty > 0) types.push('EXPORT');
            if (defenceQty > 0) types.push('DEFENCE');
            typeStr = types.join(', ');
        }

        this.applicationData = {
            id: apiData.id || '',
            referenceNo: apiData.refNo || apiData.referenceNo || '',
            submissionDate: new Date(apiData.date || apiData.created_at || Date.now()),
            distilleryName: apiData.licenseeName || apiData.manufacturingUnit || 'Sikkim Distilleries', // Fallback
            status: apiData.status || 'SUBMITTED',
            brAmount: totalQty * 0.15, // Calculate amount: 0.15 per unit

            // Hologram specific fields
            hologramType: typeStr,
            hologramQuantity: totalQty,
            localQty: localQty,
            exportQty: exportQty,
            defenceQty: defenceQty,
            totalQty: totalQty,
            paymentAmount: totalQty * 0.15,

            // Unused but kept for interface compatibility
            hologramSeriesStart: '',
            hologramSeriesEnd: '',
            allowedActions: apiData.allowedActions || apiData.allowed_actions || [],
            // Workflow fields
            currentStage: apiData.current_stage || apiData.currentStage,
            currentStageName: apiData.current_stage_name || apiData.currentStageName,
            workflowId: apiData.workflow_id || apiData.workflowId || 5 // Hologram workflow
        };
        
        // Set allowed actions after applicationData is created
        if (!apiData.allowedActions && !apiData.allowed_actions) {
            this.applicationData.allowedActions = this.getDefaultAllowedActions();
        }

        // Load workflow-based actions
        this.loadWorkflowActions();
    }

    private loadHologramFallback(refNo: string, id: string): void {
        this.applicationData = {
            id: id || '999',
            referenceNo: refNo,
            submissionDate: new Date(),
            distilleryName: 'Unknown',
            status: 'NOT FOUND',
            brAmount: 0.00,
            hologramType: 'Unknown',
            hologramQuantity: 0,
            // Default workflow data for hologram
            currentStage: 1, // Initial stage
            currentStageName: 'Hologram Request Submitted',
            workflowId: 5 // Hologram workflow
        };
        this.errorMessage = 'Could not load hologram request details.';
        
        // Set allowed actions after applicationData is set
        this.applicationData.allowedActions = this.getDefaultAllowedActions();
        
        // Load workflow-based actions
        this.loadWorkflowActions();
    }

    // Type check methods for template
    isRequisition(): boolean {
        return this.applicationType === 'requisition';
    }

    isRevalidation(): boolean {
        return this.applicationType === 'revalidation';
    }

    isCancellation(): boolean {
        return this.applicationType === 'cancellation';
    }

    isTransit(): boolean {
        return this.applicationType === 'transit';
    }

    isHologram(): boolean {
        return this.applicationType === 'hologram';
    }

    // Get title based on application type
    getApplicationTitle(): string {
        const titles: { [key: string]: string } = {
            'requisition': 'REQUISITION APPLICATION',
            'revalidation': 'REVALIDATION APPLICATION',
            'cancellation': 'CANCELLATION APPLICATION',
            'transit': 'TRANSIT PERMIT APPLICATION',
            'hologram': 'HOLOGRAM REQUEST'
        };
        return titles[this.applicationType] || 'APPLICATION';
    }

    getPageTitle(): string {
        const titles: { [key: string]: string } = {
            'requisition': 'Requisition Application Details',
            'revalidation': 'Revalidation Application Details',
            'cancellation': 'Cancellation Application Details',
            'transit': 'Transit Permit Details',
            'hologram': 'Hologram Request Details'
        };
        return titles[this.applicationType] || 'Application Details';
    }

    getDetailsTitle(): string {
        const titles: { [key: string]: string } = {
            'requisition': 'Requisition Details',
            'revalidation': 'Revalidation Details',
            'cancellation': 'Cancellation Details',
            'transit': 'Transit Details',
            'hologram': 'Hologram Details'
        };
        return titles[this.applicationType] || 'Details';
    }

    goBack(): void {
        const source = this.route.snapshot.queryParamMap.get('source');
        const currentUrl = this.router.url;

        if (source === 'commissioner-dashboard') {
            this.router.navigate(['/dev-commissioner-dashboard']);
            return;
        } else if (source === 'permit-section') {
            this.router.navigate(['/app-permit-section']);
            return;
        } else if (source === 'licensee-dashboard' || source === 'licensee') {
            this.router.navigate(['/dashboard'], { queryParams: { section: this.applicationType } });
            return;
        }

        if (currentUrl.includes('/app-permit-section/')) {
            this.router.navigate(['/app-permit-section']);
        } else if (currentUrl.includes('commissioner')) {
            this.router.navigate(['/dev-commissioner-dashboard']);
        } else {
            this.router.navigate(['/dashboard'], { queryParams: { section: this.applicationType } });
        }
    }

    getBackButtonText(): string {
        const source = this.route.snapshot.queryParamMap.get('source');

        if (source === 'commissioner-dashboard') {
            return 'Back to Commissioner Dashboard';
        } else if (source === 'permit-section') {
            return 'Back to Permit Section';
        } else if (source === 'licensee-dashboard' || source === 'licensee') {
            return 'Back to Dashboard';
        }
        return 'Back to Dashboard';
    }

    printApplication(): void {
        const printable = document.getElementById('applicationPrintSection')?.innerHTML || '';
        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
            .map(el => (el as HTMLElement).outerHTML)
            .join('');
        const win = window.open('', '_blank', 'width=900,height=1000');
        if (!win) return;
        win.document.open();
        const ref = this.applicationData?.referenceNo || '';
        win.document.write(`<!doctype html>
      <html>
        <head>
          <title>${this.getApplicationTitle()} - ${ref}</title>
          ${styles}
          <style>
            @page { size: A4; margin: 12mm; }
            body { background: #fff; }
            .no-print { display:none !important; }
            .printable-content, .printable-content * { visibility: visible !important; }
          </style>
        </head>
        <body>
          ${printable}
        </body>
      </html>`);
        win.document.close();
        win.onload = () => {
            win.focus();
            win.print();
            win.close();
        };
    }

    // Helper methods
    getDistilleryName(code: string): string {
        const distilleryMap: { [key: string]: string } = {
            'sikkim-distilleries': 'Sikkim Distilleries Ltd',
            'mountain-spirits': 'Mountain Spirits Pvt Ltd',
            'highland-breweries': 'Highland Breweries'
        };
        return distilleryMap[code] || code;
    }

    getBulkSpiritTypeName(code: string): string {
        const typeMap: { [key: string]: string } = {
            'grain-ena': 'Grain ENA',
            'molasses-ena': 'Molasses ENA',
            'rectified-spirit': 'Rectified Spirit'
        };
        return typeMap[code] || code;
    }

    getPurposeName(code: string): string {
        const purposeMap: { [key: string]: string } = {
            'manufacturing': 'Manufacturing',
            'blending': 'Blending',
            'bottling': 'Bottling'
        };
        return purposeMap[code] || code;
    }

    getCheckpostName(code: string): string {
        const checkpostMap: { [key: string]: string } = {
            'rangpo': 'Rangpo Checkpost',
            'melli': 'Melli Checkpost',
            'nathu-la': 'Nathu La Checkpost'
        };
        return checkpostMap[code] || code;
    }

    /**
     * Check if there are any actionable buttons available (excluding VIEW)
     */
    hasAvailableActions(): boolean {
        if (!this.applicationData?.allowedActions) return false;
        
        // Check if there are any actions other than VIEW
        const actionableActions = this.applicationData.allowedActions.filter(action => action !== 'VIEW');
        
        // Get user context and status
        const context = this.getUserContext();
        const status = this.applicationData.status?.toUpperCase() || '';
        
        console.log('hasAvailableActions - context:', context, 'status:', status, 'actionableActions:', actionableActions);
        
        // For licensees with approved applications, always show cancel button
        if (context === 'licensee' && status.includes('APPROVED') && !status.includes('CANCELLATION')) {
            console.log('hasAvailableActions - showing cancel button for licensee with approved application');
            return true;
        }
        
        // For officers, don't show buttons if already processed
        const isProcessed = status.includes('APPROVED') || status.includes('REJECTED') || 
                           status.includes('COMPLETED') || status.includes('ISSUED') ||
                           status.includes('CANCELLED') || status.includes('TERMINATED');
        
        if (isProcessed && context !== 'licensee') {
            console.log('hasAvailableActions - hiding action buttons for officers (application processed)');
            return false;
        }
        
        return actionableActions.length > 0;
    }

    getFormattedStatus(status: string): string {
        if (!status) return 'Unknown';
        
        // Convert status to a more readable format
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
        
        if (upperStatus.includes('APPROVED') || upperStatus.includes('ISSUED') || upperStatus.includes('EXTENDED') || upperStatus.includes('COMPLETED')) {
            return 'badge bg-success';
        } else if (upperStatus.includes('PENDING') || upperStatus.includes('REQUEST') || upperStatus.includes('PROCESSING') || upperStatus.includes('FORWARDED')) {
            return 'badge bg-warning';
        } else if (upperStatus.includes('REJECTED') || upperStatus.includes('INVALID') || upperStatus.includes('EXPIRED') || upperStatus.includes('CANCELLED')) {
            return 'badge bg-danger';
        } else {
            return 'badge bg-info';
        }
    }

    getRefundStatusBadgeClass(status: string): string {
        if (status === 'COMPLETED' || status === 'PROCESSED') {
            return 'badge bg-success';
        } else if (status === 'PENDING') {
            return 'badge bg-warning';
        } else if (status === 'REJECTED') {
            return 'badge bg-danger';
        }
        return 'badge bg-info';
    }

    // Determine user context for the action buttons
    getUserContext(): 'licensee' | 'permit-section' | 'commissioner' | 'itcell' | 'officer-in-charge' {
        const source = this.route.snapshot.queryParamMap.get('source');

        console.log('getUserContext - source:', source);

        // First check URL source parameter
        if (source === 'commissioner-dashboard') {
            return 'commissioner';
        } else if (source === 'permit-section') {
            return 'permit-section';
        } else if (source === 'officer-in-charge') {
            return 'officer-in-charge';
        } else if (source === 'licensee-dashboard' || source === 'licensee') {
            // Always return licensee if explicitly coming from licensee context
            console.log('getUserContext - returning licensee from source');
            return 'licensee';
        }

        // Special handling: If source is NOT explicitly set but status indicates permit section work
        if (!source && this.applicationData?.status?.toLowerCase().includes('permitsection')) {
            console.log('getUserContext - detected permit section from status (no source)');
            return 'permit-section';
        }

        // Fallback: try to determine from current URL path
        const currentUrl = this.router.url;
        if (currentUrl.includes('commissioner')) {
            console.log('getUserContext - detected commissioner from URL');
            return 'commissioner';
        } else if (currentUrl.includes('permit-section')) {
            console.log('getUserContext - detected permit-section from URL');
            return 'permit-section';
        } else if (currentUrl.includes('dashboard') && currentUrl.includes('section=')) {
            // This is likely a licensee viewing from dashboard
            console.log('getUserContext - detected licensee from dashboard URL');
            return 'licensee';
        }

        // Default context - if we can't determine, assume licensee for safety
        const context = 'licensee';
        console.log('getUserContext - returning default:', context);
        return context;
    }

    // Get default allowed actions based on user context and application status
    private getDefaultAllowedActions(): string[] {
        const context = this.getUserContext();
        const status = this.applicationData?.status?.toUpperCase() || '';

        console.log('getDefaultAllowedActions - context:', context, 'status:', status);

        // Special case for licensees with approved applications - they can request cancellation
        if (context === 'licensee' && status.includes('APPROVED') && !status.includes('CANCELLATION')) {
            console.log('getDefaultAllowedActions - licensee can request cancellation for approved application');
            return ['VIEW', 'REQUEST_CANCELLATION'];
        }

        // For licensees with other statuses, only allow viewing
        if (context === 'licensee') {
            console.log('getDefaultAllowedActions - licensee can only view');
            return ['VIEW'];
        }

        // If application is already processed, only allow viewing for officers
        if (status.includes('APPROVED') || status.includes('REJECTED') || 
            status.includes('COMPLETED') || status.includes('ISSUED') ||
            status.includes('CANCELLED') || status.includes('TERMINATED')) {
            console.log('getDefaultAllowedActions - application processed, only VIEW for officers');
            return ['VIEW'];
        }

        // For pending/active applications, provide appropriate actions based on context
        switch (context) {
            case 'commissioner':
                if (status.includes('PENDING') || status.includes('FORWARDED') || status.includes('FORWARDEDTOCOMMISSIONER')) {
                    return ['VIEW', 'APPROVE', 'REJECT', 'FORWARD'];
                }
                return ['VIEW'];

            case 'permit-section':
                if (status.includes('PENDING') || status.includes('SUBMITTED') || status.includes('FORWARDED') || status.includes('PERMITSECTION')) {
                    console.log('getDefaultAllowedActions - permit-section with actionable status');
                    return ['VIEW', 'APPROVE', 'REJECT', 'FORWARD'];
                }
                return ['VIEW'];

            case 'officer-in-charge':
                if (status.includes('PENDING')) {
                    return ['VIEW', 'APPROVE', 'TERMINATE'];
                }
                return ['VIEW'];

            case 'itcell':
                if (status.includes('PENDING')) {
                    return ['VIEW', 'VERIFY', 'FORWARD'];
                }
                return ['VIEW'];

            default:
                return ['VIEW'];
        }
    }

    onActionButtonClick(event: { action: string, item: any }): void {
        console.log('Action clicked:', event.action, event.item);

        const action = event.action;

        if (!this.applicationData?.id) return;

        // Handle special licensee actions that don't go through workflow
        if (action === 'REQUEST_CANCELLATION') {
            console.log('Handling REQUEST_CANCELLATION for licensee');
            this.handleCancellationRequest();
            return;
        }

        // Handle other non-workflow actions
        if (['PAY', 'CANCEL', 'VIEW_SLIP', 'VIEW'].includes(action)) {
            this.handleNonWorkflowAction(action);
            return;
        }

        // Handle workflow actions (APPROVE, REJECT, FORWARD, etc.)
        const workflowAction = this.workflowActions.find(a => a.action === action);

        if (workflowAction) {
            console.log('Executing workflow action:', workflowAction);
            this.executeWorkflowAction(workflowAction);
            return;
        }

        // Fallback: Create a basic workflow action config for standard actions
        if (['APPROVE', 'REJECT', 'FORWARD', 'VERIFY', 'ISSUE'].includes(action)) {
            console.log('Creating fallback workflow action for:', action);
            const fallbackAction: WorkflowActionConfig = {
                action: action,
                label: action.charAt(0) + action.slice(1).toLowerCase(),
                icon: action === 'APPROVE' ? 'check_circle' : action === 'REJECT' ? 'cancel' : 'forward',
                color: action === 'APPROVE' ? 'accent' : action === 'REJECT' ? 'warn' : 'primary',
                tooltip: `${action.charAt(0) + action.slice(1).toLowerCase()} Application`
            };
            this.executeWorkflowAction(fallbackAction);
            return;
        }

        console.warn('Unknown action:', action);
    }

    /**
     * Handle non-workflow actions
     */
    private handleNonWorkflowAction(action: string): void {
        switch (action) {
            case 'PAY':
                console.log('Handling PAY action');
                // Payment logic would go here
                break;
            case 'CANCEL':
                console.log('Handling CANCEL action');
                // General cancellation logic would go here
                break;
            case 'VIEW_SLIP':
                console.log('Handling VIEW_SLIP action');
                // View permit slip logic would go here
                break;
            case 'VIEW':
                console.log('VIEW action - already viewing');
                // View action - do nothing as we're already viewing
                break;
            default:
                console.warn('Unknown non-workflow action:', action);
        }
    }

    /**
     * Execute workflow action using the workflow action service
     */
    private executeWorkflowAction(workflowAction: WorkflowActionConfig): void {
        if (!this.applicationData) return;

        this.isLoading = true;

        const workflowData: ApplicationWorkflowData = {
            id: this.applicationData.id,
            type: this.applicationType,
            status: this.applicationData.status,
            currentStage: this.applicationData.currentStage,
            currentStageName: this.applicationData.currentStageName,
            workflowId: this.applicationData.workflowId
        };

        console.log('Executing workflow action:', workflowAction.action, 'for:', workflowData);

        this.workflowActionService.executeWorkflowAction(workflowData, workflowAction).subscribe({
            next: (result) => {
                this.isLoading = false;
                console.log('Workflow action result:', result);
                
                if (result.success) {
                    // Update the application data with new status
                    if (this.applicationData && result.newStatus) {
                        this.applicationData.status = result.newStatus;
                        
                        // Update stage if provided
                        if (result.newStage) {
                            this.applicationData.currentStage = result.newStage;
                        }
                        
                        // Reload workflow actions for the new status
                        this.loadWorkflowActions();
                        
                        console.log('Application data updated:', {
                            newStatus: this.applicationData.status,
                            newStage: this.applicationData.currentStage
                        });
                    }
                    
                    // Show success message
                    this.showSuccessMessage(result.message || `${workflowAction.label} completed successfully!`);
                } else {
                    this.showErrorMessage(result.message || `${workflowAction.label} failed`);
                }
            },
            error: (error) => {
                this.isLoading = false;
                console.error('Workflow action failed:', error);
                this.showErrorMessage(`${workflowAction.label} failed: ${error.message || 'Unknown error'}`);
            }
        });
    }

    /**
     * Show success message to user
     */
    private showSuccessMessage(message: string): void {
        // For now, use alert. In a real app, you might use a toast notification
        alert(`✅ Success: ${message}`);
    }

    /**
     * Show error message to user
     */
    private showErrorMessage(message: string): void {
        // For now, use alert. In a real app, you might use a toast notification
        alert(`❌ Error: ${message}`);
    }

    /**
     * Handle cancellation request for licensees viewing approved applications
     */
    private handleCancellationRequest(): void {
        if (!this.applicationData?.id) return;

        const confirmMessage = 'Are you sure you want to request cancellation of this approved application? This action cannot be undone.';
        if (!confirm(confirmMessage)) return;

        this.isLoading = true;

        // Prepare cancellation request payload
        const cancellationPayload = {
            original_application_id: this.applicationData.id,
            original_reference_no: this.applicationData.referenceNo,
            application_type: this.applicationType,
            reason: 'Licensee requested cancellation of approved application',
            distillery_name: this.applicationData.distilleryName,
            br_amount: this.applicationData.brAmount,
            quantity: this.applicationData.quantity || 0,
            bulk_spirit_type: this.applicationData.bulkSpiritType || '',
            purpose: this.applicationData.purpose || ''
        };

        console.log('Submitting cancellation request:', cancellationPayload);

        // Use the existing cancellation API
        this.supplyChainService.submitCancellation(cancellationPayload).subscribe({
            next: (response) => {
                this.isLoading = false;
                console.log('Cancellation request submitted:', response);
                
                // Update the application status to indicate cancellation requested
                if (this.applicationData) {
                    this.applicationData.status = 'CANCELLATION_REQUESTED';
                    // Remove cancellation action since it's now requested
                    this.applicationData.allowedActions = this.applicationData.allowedActions?.filter(action => action !== 'REQUEST_CANCELLATION') || [];
                }
                
                this.showSuccessMessage('Cancellation request submitted successfully. You will be notified once it is processed.');
            },
            error: (error) => {
                this.isLoading = false;
                console.error('Cancellation request failed:', error);
                this.showErrorMessage('Failed to submit cancellation request: ' + (error.message || 'Unknown error'));
            }
        });
    }

    performWorkflowAction(action: string): void {
        if (!this.applicationData?.id) return;

        this.isLoading = true;
        // Depending on application type, call the appropriate service
        // For now implementing Requisition as a primary example

        let serviceCall;

        if (this.isRequisition()) {
            serviceCall = this.enaRequisitionService.performAction(Number(this.applicationData.id), action as any);
        } else {
            // Fallback or todo for other types
            console.warn('Action not yet implemented for this type');
            this.isLoading = false;
            return;
        }

        serviceCall.subscribe({
            next: (res) => {
                this.isLoading = false;
                alert(`Action ${action} completed successfully.`);
                // Refresh data
                this.loadApplicationData(this.applicationData?.referenceNo || '', this.applicationData?.id || '');
            },
            error: (err) => {
                this.isLoading = false;
                console.error('Action failed:', err);
                alert('Action failed: ' + (err.message || 'Unknown error'));
            }
        });
    }
}
