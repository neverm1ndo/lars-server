import { GeoData } from './geodata';

export interface ContentData {
  time?: string,
  oid?: number,
  op?: string,
  message?: string
}

export interface LogLine {
  unix: number;
  date: Date;
  process: string;
  nickname?: string;
  id: number;
  geo?: GeoData;
  content?: ContentData;
  multiplier?: number;
}
