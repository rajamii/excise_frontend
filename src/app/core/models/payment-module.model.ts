export interface PaymentModule {
  moduleCode: string;
  moduleDesc: string;
  licenseFee: number | null;
  visibilityStatus: boolean;
  userId?: string;
  oprDate?: string;
  createdDate?: string;
  modifiedDate?: string;
}
