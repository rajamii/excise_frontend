// ================================================================================================
// FILE: core/models/dashboard.model.ts
// FIXED VERSION - Properly detects payment_pending stage
// ================================================================================================

import { LicenseApplication } from "./license-application.model";

/**
 * Dashboard count interface
 */
export class DashboardCount {
  applied?: number;
  pending!: number;
  approved!: number;
  rejected!: number;
  awaitingPayment?: number;
}

/**
 * Application status interface
 */
export interface ApplicationStatus {
  applied: LicenseApplication[];
  pending: LicenseApplication[];
  approved: LicenseApplication[];
  rejected: LicenseApplication[];
  awaitingPayment?: LicenseApplication[];
}

/**
 * ✅ FIXED: Helper function to check if application is in payment pending stage
 * This checks BOTH stage name and stage ID to ensure proper detection
 */
export function isPaymentPending(app: any): boolean {
  console.log('🔍 isPaymentPending check:', {
    app_id: app?.application_id || app?.applicationId,
    current_stage: app?.current_stage,
    currentStage: app?.currentStage,
    stage_id: app?.current_stage_id,
    stageId: app?.currentStageId
  });

  // Method 1: Check by stage ID (most reliable from backend)
  const stageId = app?.current_stage_id || app?.currentStageId || app?.currentStage || app?.current_stage;
  
  if (typeof stageId === 'number') {
    const isPaymentStage = stageId === 23 || stageId === 31;
    console.log('✅ Stage ID check:', { stageId, isPaymentStage });
    return isPaymentStage;
  }
  
  // Method 2: Check by stage name (fallback)
  const stageName = typeof app?.current_stage === 'string' ? app.current_stage : 
                    typeof app?.currentStage === 'string' ? app.currentStage : '';
  
  if (stageName) {
    const isPaymentStage = stageName.toLowerCase() === 'payment_pending' || 
                          stageName.toLowerCase() === 'awaiting_payment';
    console.log('✅ Stage name check:', { stageName, isPaymentStage });
    return isPaymentStage;
  }
  
  console.log('❌ Could not determine payment pending status');
  return false;
}

/**
 * Helper function to check if application payment has been completed
 */
export function isPaymentCompleted(app: any): boolean {
  return app?.payment_status === 'paid' || 
         app?.is_license_fee_paid === true ||
         app?.fee_paid === true;
}