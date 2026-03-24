export interface Ward {
  id: number;
  wardName: string;
  wardNumber: number;
  locationCode: number;
  locationName?: string;
  districtName?: string;
  population?: number;
  areaSqKm?: number;
  isActive: boolean;
  operationDate?: string;
  createdBy?: number;
  status?: string;
}