export interface LocationCategory {
  id: number;
  categoryName: string;
  description?: string;
  isActive: boolean;
  isRural?: boolean;
  operationDate?: string;
  createdBy?: number;
  status?: string;
  subcategoryCount?: number;
}