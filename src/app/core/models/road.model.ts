import { District } from "./district.model";

export class Road {
  id?: number;
  roadName!: string;
  roadType!: string;
  district!: number | District | undefined;
}