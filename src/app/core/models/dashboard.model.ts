import { LicenseApplication } from "./license-application.model";
export class DashboardCount {
  applied?: number;
  pending!: number;
  approved!: number;
  rejected!: number;
}
export interface ApplicationStatus {
  applied: LicenseApplication[];
  pending: LicenseApplication[];
  approved: LicenseApplication[];
  rejected: LicenseApplication[];
}