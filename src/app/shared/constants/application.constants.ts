/**
 * Application Type Constants
 * These should match the backend workflow system
 */
export const APPLICATION_TYPES = {
    REQUISITION: 'requisition',
    REVALIDATION: 'revalidation', 
    CANCELLATION: 'cancellation',
    TRANSIT: 'transit',
    HOLOGRAM: 'hologram',
    NEW_LICENSE: 'new-license',
    LICENSE_RENEWAL: 'license-renewal',
    COMPANY_REGISTRATION: 'company-registration',
    COMPANY_COLLABORATION: 'company-collaboration',
    LABEL_REGISTRATION: 'label-registration',
    SALESMAN_BARMAN_REGISTRATION: 'salesman-barman-registration'
} as const;

export type ApplicationType = typeof APPLICATION_TYPES[keyof typeof APPLICATION_TYPES];

/**
 * User Context Constants
 * These should match the backend role system
 */
export const USER_CONTEXTS = {
    LICENSEE: 'licensee',
    PERMIT_SECTION: 'permit-section',
    COMMISSIONER: 'commissioner',
    IT_CELL: 'itcell',
    OFFICER_IN_CHARGE: 'officer-in-charge'
} as const;

export type UserContext = typeof USER_CONTEXTS[keyof typeof USER_CONTEXTS];

/**
 * Workflow IDs for each application type
 * These should come from backend workflow system
 */
export const WORKFLOW_IDS = {
    // From DB: workflow_workflow table
    [APPLICATION_TYPES.REQUISITION]: 3,  // Supply Chain
    [APPLICATION_TYPES.REVALIDATION]: 4, // Bulk Spirit Revalidation
    [APPLICATION_TYPES.CANCELLATION]: 5, // Bulk Spirit Cancellation
    [APPLICATION_TYPES.TRANSIT]: 8,      // Transit Permit
    [APPLICATION_TYPES.HOLOGRAM]: 7,     // Hologram Request
    [APPLICATION_TYPES.NEW_LICENSE]: 0,  // New License workflow id not required for view-only flow
    [APPLICATION_TYPES.LICENSE_RENEWAL]: 0, // Renewal workflow id not required for view-only flow
    [APPLICATION_TYPES.COMPANY_REGISTRATION]: 0, // View-only detail flow
    [APPLICATION_TYPES.COMPANY_COLLABORATION]: 0, // View-only detail flow
    [APPLICATION_TYPES.LABEL_REGISTRATION]: 0, // View-only detail flow
    [APPLICATION_TYPES.SALESMAN_BARMAN_REGISTRATION]: 0 // View-only detail flow
} as const;

/**
 * Application Titles
 * These could come from backend i18n system
 */
export const APPLICATION_TITLES = {
    [APPLICATION_TYPES.REQUISITION]: 'REQUISITION APPLICATION',
    [APPLICATION_TYPES.REVALIDATION]: 'REVALIDATION APPLICATION', 
    [APPLICATION_TYPES.CANCELLATION]: 'CANCELLATION APPLICATION',
    [APPLICATION_TYPES.TRANSIT]: 'TRANSIT PERMIT APPLICATION',
    [APPLICATION_TYPES.HOLOGRAM]: 'HOLOGRAM PROCUREMENT APPLICATION',
    [APPLICATION_TYPES.NEW_LICENSE]: 'NEW LICENSE APPLICATION',
    [APPLICATION_TYPES.LICENSE_RENEWAL]: 'LICENSE RENEWAL APPLICATION',
    [APPLICATION_TYPES.COMPANY_REGISTRATION]: 'COMPANY REGISTRATION',
    [APPLICATION_TYPES.COMPANY_COLLABORATION]: 'COMPANY COLLABORATION',
    [APPLICATION_TYPES.LABEL_REGISTRATION]: 'LABEL REGISTRATION',
    [APPLICATION_TYPES.SALESMAN_BARMAN_REGISTRATION]: 'SALESMAN/BARMAN REGISTRATION'
} as const;

/**
 * Page Titles
 * These could come from backend i18n system
 */
export const PAGE_TITLES = {
    [APPLICATION_TYPES.REQUISITION]: 'Requisition Application Details',
    [APPLICATION_TYPES.REVALIDATION]: 'Revalidation Application Details',
    [APPLICATION_TYPES.CANCELLATION]: 'Cancellation Application Details', 
    [APPLICATION_TYPES.TRANSIT]: 'Transit Permit Details',
    [APPLICATION_TYPES.HOLOGRAM]: 'Hologram Procurement Application Details',
    [APPLICATION_TYPES.NEW_LICENSE]: 'New License Application Details',
    [APPLICATION_TYPES.LICENSE_RENEWAL]: 'License Renewal Application Details',
    [APPLICATION_TYPES.COMPANY_REGISTRATION]: 'Company Registration Details',
    [APPLICATION_TYPES.COMPANY_COLLABORATION]: 'Company Collaboration Details',
    [APPLICATION_TYPES.LABEL_REGISTRATION]: 'Label Registration Details',
    [APPLICATION_TYPES.SALESMAN_BARMAN_REGISTRATION]: 'Salesman/Barman Registration Details'
} as const;

/**
 * Navigation Routes
 * These should be configurable from backend
 */
export const NAVIGATION_ROUTES = {
    'commissioner-dashboard': '/dev-commissioner-dashboard',
    'commissioner': '/dev-commissioner-dashboard',
    'permit-section': '/app-permit-section',
    'licensee-dashboard': '/dashboard',
    'licensee': '/dashboard'
} as const;

/**
 * Role Mapping for Workflow System
 * Maps frontend user contexts to backend workflow roles
 */
export const WORKFLOW_ROLE_MAPPING = {
    [USER_CONTEXTS.LICENSEE]: 'licensee',
    [USER_CONTEXTS.PERMIT_SECTION]: 'permit-section',
    [USER_CONTEXTS.COMMISSIONER]: 'commissioner', 
    [USER_CONTEXTS.OFFICER_IN_CHARGE]: 'officer_in_charge',
    [USER_CONTEXTS.IT_CELL]: 'it_cell'
} as const;

/**
 * Status Keywords for Invalid Status Detection
 * These could come from backend status master
 */
export const INVALID_STATUS_KEYWORDS = [
    'INVALID',
    'EXPIRED', 
    'EXTENDS',
    'EXTENSION_EXPIRED',
    'PERMIT_INVALID',
    'VALIDITY_EXPIRED',
    'EXTENDS 45 DAYS'
] as const;

/**
 * Status Badge Classes
 * These could come from backend styling configuration
 */
export const STATUS_BADGE_CLASSES = {
    SUCCESS: 'badge bg-success',
    WARNING: 'badge bg-warning', 
    DANGER: 'badge bg-danger',
    INFO: 'badge bg-info'
} as const;

/**
 * Success Status Keywords
 */
export const SUCCESS_STATUS_KEYWORDS = [
    'APPROVED',
    'ISSUED', 
    'EXTENDED',
    'COMPLETED'
] as const;

/**
 * Warning Status Keywords  
 */
export const WARNING_STATUS_KEYWORDS = [
    'PENDING',
    'REQUEST',
    'PROCESSING', 
    'FORWARDED'
] as const;

/**
 * Danger Status Keywords
 */
export const DANGER_STATUS_KEYWORDS = [
    'REJECTED',
    'INVALID',
    'EXPIRED',
    'CANCELLED'
] as const;
