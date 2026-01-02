// core/models/shared-application.model.ts (new file)
export interface UnifiedApplication {
  type: 'license' | '/salesman_barman/'; // Discriminator
  applicationId: string;
  currentStage: string; // e.g., 'level_1'
  currentStageName?: string; // Human-readable, e.g., 'Under Review by Level 1'
  isApproved?: boolean;
  transactions: Transaction[]; // Shared transaction model
  latestTransaction?: Transaction;
  // Add shared fields as needed (e.g., remarks from latest tx)
}

// Reuse existing Transaction from license-application.model.ts
export interface Transaction {
  performedBy?: { username: string; roleName: string };
  forwardedTo?: { name: string };
  remarks?: string;
  timestamp: string; // ISO date
  // etc.
}