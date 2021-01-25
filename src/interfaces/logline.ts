import { GeoData } from './geodata';

export interface LogLine {
  unix: number;
  date: Date;
  process: string;
  nickname?: string;
  id: number;
  geo?: GeoData;
  content?: string;
}
