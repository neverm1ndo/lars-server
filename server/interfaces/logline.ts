import { GeoData } from './geodata';

export interface LogLine {
  unix: number;
  date: string;
  process: string;
  nickname?: string;
  id?: number;
  geo?: GeoData;
}
