export interface RenewalWarning {
  licenseId: string;
  type: string;
  establishmentName: string;
  validUpTo: Date;
  finalDateStr: string;
  isExpired?: boolean;
}

export type RenewalWarningsList = RenewalWarning[];
