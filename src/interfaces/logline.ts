import { IGeoData } from './geodata';
import { IUserData } from './user';


export interface IContentTarget {
  id: number;
  username: string;
}
export interface IContentData {
  time?: string;
  oid?: number;
  op?: string;
  weapon?: string;
  dm_id?: string;
  auth?: IUserData;
  message?: string;
  numbers?: number[];
  action?: string;
  targetType?: string;
  target?: IContentTarget;
  props?: any;
}

export interface ILogLine {
  unix: number;
  date: Date;
  process: string;
  nickname?: string;
  id?: number;
  geo?: IGeoData;
  content?: IContentData;
  multiplier?: number;
}
