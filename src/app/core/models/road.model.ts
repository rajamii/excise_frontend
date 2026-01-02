import { District } from './district.model';

export interface Road {
  id?: number;
  roadName: string;
  roadType: 'NH' | 'SH' | 'LINK ROAD';
  district: number | District;
}