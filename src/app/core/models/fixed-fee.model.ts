export interface FixedFee {
  feeCode: string;
  feeDesc: string;
  amount: number | string;
  isActive?: boolean;
  createdDate?: string;
  modifiedDate?: string;

  // snake_case fallbacks if needed from DRF renderer mapping
  fee_code?: string;
  fee_desc?: string;
}
