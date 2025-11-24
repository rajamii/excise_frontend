export interface BulkSpiritType {
  spritId: number;
  strengthFrom: string;
  strengthTo: string;
  priceBl: string;
  createdAt: string;
  updatedAt: string;
}

export interface Distillery {
  id: number;
  distilleryName: string;
  distilleryAddress: string;
  distilleryState: string;
  viaRoute: string;
  distillery_name?: string;
  distillery_address?: string;
  distillery_state?: string;
  via_route?: string;
}  

export interface Checkpost {
  id: number;
  checkpost_name: string;
}

export interface Purpose {
  id: number;
  purpose_name: string;
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
