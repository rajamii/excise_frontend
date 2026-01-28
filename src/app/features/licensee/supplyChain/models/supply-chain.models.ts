export interface BulkSpiritType {
  spritId: number;
  bulkSpiritKindType?: string;
  strength?: string;
  priceBl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Distillery {
  id: number;
  distilleryName: string;
  distilleryAddress: string;
  distilleryState: string;
  viaRoute: string;
  // Support snake_case from backend
  distillery_name?: string;
  distillery_address?: string;
  distillery_state?: string;
  via_route?: string;
  state?: string; // API also returns 'state' property
}  

export interface Checkpost {
  id: number;
  checkpostName: string;
}

export interface Purpose {
  id: number;
  purposeName: string;
}

export interface DistRow {
  id: number;
  distributorName: string;
  depoAddress: string;
}

export interface LiquorRates {
  brand: string;
  size: string;
  exFactoryPrice: number;
  educationCess: number;
  exciseDuty: number;
  additionalExcise: number;
  additionalExcise12_5: number;
  bottlingFee: number;
  exportFee: number;
  mrpPerBottle: number;
  totalPricePerCase: number;
}
