export interface AdditionalChargeConfig {
  id?: number;
  category: number;
  categoryName?: string;
  chargeType: 'pachwai' | 'draught_beer' | 'mini_bar';
  isActive: boolean;
}
