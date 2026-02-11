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
    NEW_LICENSE: 'new-license'
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
    [APPLICATION_TYPES.REVALIDATION]: 4, // ENA Revalidation
    [APPLICATION_TYPES.CANCELLATION]: 5, // ENA Cancellation
    [APPLICATION_TYPES.TRANSIT]: 8,      // Transit Permit
    [APPLICATION_TYPES.HOLOGRAM]: 7,     // Hologram Request
    [APPLICATION_TYPES.NEW_LICENSE]: 0   // New License workflow id not required for view-only flow
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
    [APPLICATION_TYPES.HOLOGRAM]: 'HOLOGRAM REQUEST',
    [APPLICATION_TYPES.NEW_LICENSE]: 'NEW LICENSE APPLICATION'
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
    [APPLICATION_TYPES.HOLOGRAM]: 'Hologram Request Details',
    [APPLICATION_TYPES.NEW_LICENSE]: 'New License Application Details'
} as const;

/**
 * Navigation Routes
 * These should be configurable from backend
 */
export const NAVIGATION_ROUTES = {
    'commissioner-dashboard': '/dev-commissioner-dashboard',
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
