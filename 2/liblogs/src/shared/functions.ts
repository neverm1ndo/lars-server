import app from '@server';
import md5 from 'md5';
import jwt from 'jsonwebtoken';
import { Logger } from './Logger';
import { WSMessage } from '@interfaces/ws.message';
import { parser, watcher } from './constants';
import { LogLine } from '@interfaces/logline';
import { LOG_LINE } from '@schemas/logline.schema';

export const watch = (): void => {
  watcher.result$.subscribe((buffer: Buffer) => {
    parser.parse(buffer).forEach((line: LogLine) => {
      let ln = new LOG_LINE(line);
      ln.save();
    })
  }, (err) => { Logger.log('error', err) });
}

export const pErr = (err: Error) => {
    if (err) {
        Logger.log('error', err);
    }
};

export const getRandomInt = () => {
    return Math.floor(Math.random() * 1_000_000_000_000);
};

export const checkPassword = (pass: string, hash: string): boolean => {
    let salt = hash.slice(0, hash.length - 32);
    let realPassword = hash.slice(hash.length - 32, hash.length);
    let password = md5(salt + pass);
    if (password === realPassword) {
      return true;
    } else {
      return false;
    }
  }
export const generateToken = (userInfo: any): string => {
  return jwt.sign(userInfo, app.get('secret'), { algorithm: 'HS256'});
}
export const verifyToken = (token: string): boolean => {
  return jwt.verify(token, app.get('secret')) ? false : true;
}
export const isWorkGroup = (group: number | string): boolean => {
  group = group.toString();
  return group.includes('9') || group.includes('10') || group.includes('11') || group.includes('12') || group.includes('13');
}

export const wsmsg = (msg: WSMessage): string => {
  return JSON.stringify(msg);
}
