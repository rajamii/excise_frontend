import { LicenseApplication } from "./license-application.model";


// Dashboard count interface
export class DashboardCount {
  applied?: number;
  pending!: number;
  objection?: number;
  approved!: number;
  rejected!: number;
  awaitingPayment?: number;
}


// Application status interface
export interface ApplicationStatus {
  applied: LicenseApplication[];
  pending: LicenseApplication[];
  objection?: LicenseApplication[];
  approved: LicenseApplication[];
  rejected: LicenseApplication[];
  awaitingPayment?: LicenseApplication[];
}


export function isPaymentPending(app: any): boolean {
  const stageId = app?.current_stage_id || app?.currentStageId || app?.currentStage || app?.current_stage;
  
  if (typeof stageId === 'number') {
    const isPaymentStage = stageId === 23 || stageId === 31;
    
    return isPaymentStage;
  }
  
  const stageName = typeof app?.current_stage === 'string' ? app.current_stage : 
                    typeof app?.currentStage === 'string' ? app.currentStage : '';
  
  if (stageName) {
    const isPaymentStage = stageName.toLowerCase() === 'payment_pending' || 
                          stageName.toLowerCase() === 'awaiting_payment';
    return isPaymentStage;
  }
  
  return false;
}


//  Helper function to check if application payment has been completed
export function isPaymentCompleted(app: any): boolean {
  return app?.payment_status === 'paid' || 
         app?.is_license_fee_paid === true ||
         app?.fee_paid === true;
}
