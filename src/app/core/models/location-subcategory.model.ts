export interface LocationSubcategory {
  id: number;
  subcategoryName: string;
  categoryId: number;
  categoryName?: string;
  description?: string;
  isActive: boolean;
  operationDate?: string;
  createdBy?: number;
  status?: string;
}