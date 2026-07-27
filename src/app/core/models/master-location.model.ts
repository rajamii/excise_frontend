export interface MasterLocation {
  id?: number;
  locationCode: number;
  locationDescription: string;
  districtCode: number;
  district?: string;
  isActive: boolean;
  status?: string;
}
