// district.model.ts
export class District {
  id?: number;
  district!: string;
  districtCode!: number;  // 🔴 This is a number (e.g., 101)
  stateCode!: number;
  state!: string;
  isActive!: boolean;
}