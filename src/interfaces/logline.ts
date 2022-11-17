import { IGeoData } from './geodata';
import { IUserData } from './user';

export interface IContentData {
  time?: string;
  oid?: number;
  op?: string;
  dm_id?: string;
  weapon?: string;
  message?: string;
  auth?: IUserData;
}

export interface ILogLine {
  unix: number;
  date: Date;
  process: string;
  nickname?: string;
  id: number;
  geo?: IGeoData;
  content?: IContentData;
  multiplier?: number;
}
