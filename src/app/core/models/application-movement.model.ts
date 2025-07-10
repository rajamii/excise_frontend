export interface PerformedBy {
  role: string;
}

export interface MovementTransaction {
  timestamp: string;
  performed_by: PerformedBy;
  stage: string;
  remarks: string;
  applicationId?: string;
}

export interface ApplicationWithTransactions {
  application_id: string;
  transactions: MovementTransaction[];
}
