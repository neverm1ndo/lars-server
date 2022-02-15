import app from '@server';
import md5 from 'md5';
import jwt from 'jsonwebtoken';
import { Logger } from './Logger';
import { WSMessage } from '@interfaces/ws.message';
import { parser, watcher, processTranslation, statsman } from './constants';
import { LogLine } from '@interfaces/logline';
import { Document } from 'mongoose';
import { LOG_LINE } from '@schemas/logline.schema';
import { readdir, lstatSync, readFile } from 'fs';
import { join } from 'path';
import { User } from '@interfaces/user';
import { SearchQuery } from '@interfaces/search';
import { lookup, charset } from 'mime-types';
import { Processes } from '@enums/processes.enum';
import { io } from '../index';
import _ from 'lodash';

export const watch = (): void => {
  const empty: LogLine = {
        unix: 0,
        date: new Date(),
        process: '<none>',
        id: 0,
      };
  let lastLine: LogLine = empty;
  let lastDoc: Document<any>;

  watcher.result$.subscribe((buffer: Buffer) => {
    parser.parse(buffer).forEach((line: LogLine) => {
      let ln = new LOG_LINE(line);
      if ( // Miltiplier condition
        lastLine.process === line.process &&
        _.isEqual(lastLine.content, line.content) &&
        lastLine.nickname === line.nickname) {
        lastDoc.updateOne({$inc: { multiplier: 1 }}).catch((err) => {
          Logger.log('error', err.message, ' in:\n', parser.ANSItoUTF8(buffer));
        });
      } else {
        ln.save().catch((err: any) => {
          Logger.log('error', err.message, ' in:\n', parser.ANSItoUTF8(buffer));
        });
        lastDoc = ln;
      }
      lastLine = line;
      statsman.update(line).then(() => {
        io.sockets.emit('server-online', statsman.snapshot);
      }).catch(() => {});
      broadcastProcessNotification(line);
    })
  }, (err) => { Logger.log('error', err) });
}

/**
* Broadcasts notification about specific process
* @param {LogLine} line LogLine instance
*/
export const broadcastProcessNotification = (line: LogLine): void => {
  io.sockets.emit('new-log-line');
  switch (line.process) {
    case Processes.GUARD_BLOCK_ON: io.sockets.emit('alert:guard-block-on', line); break;
    case Processes.DISCONNECT_KICKBAN: io.sockets.emit('alert:kickban', line); break;
    case Processes.CHAT_REPORT: io.sockets.emit('alert:report', line); break;
    default: break;
  }
}

export const isDate = (date :string): boolean => {
  return (Date.parse(date) != NaN) && (date !== '') && date !== undefined;
} ;

export const pErr = (err: Error) => {
    if (err) {
        Logger.log('error', err);
    }
};

export const getRandomInt = () => {
    return Math.floor(Math.random() * 1_000_000_000_000);
};

/**
* @deprecated Read all log files and put lines into db
* Just in case
*/
export const firstLaunch = (dir: string): void => {
  readdir(dir, (err: NodeJS.ErrnoException | null, dirs: any[]) => {
    if (err) return err;
    for (let i = 0; i < dirs.length; i++) {
      if (typeof dirs[i] == 'string') {
        let fullPath = join(dir, dirs[i]);
        if (lstatSync(fullPath).isDirectory()) {
          firstLaunch(fullPath);
        } else {
          readFile(fullPath,(err: NodeJS.ErrnoException | null, buffer: Buffer) => {
            if (err) return err;
            parser.parse(buffer).forEach((line: LogLine) => {
              let ln = new LOG_LINE(line);
              ln.save();
            });
          })
        }
      }
    }
  });
}

export const getMimeType = (path:string): string | false => {
  let splited = path.split('.');
  if (!splited) return '*/*';
  switch (splited[splited.length - 1]) {
    case 'amx': return 'application/octet-stream';
    case 'so': return 'application/x-sharedlib';
    case 'db': return 'application/octet-stream';
    case 'cadb': return 'application/octet-stream';
    case 'map': return 'text/xml';
    default: break;
  }
  const mime = lookup(path);
  if (!mime) return '*/*';
  return lookup(path);
}

export const getTodayDate = (): Date => {
  const now: Date = new Date();
  // const months: string[] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Augt", "Sep", "Oct", "Nov", "Dec"];
  // return new Date(`${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export const getCharset = (typeString: string): string | false => {
  return charset(typeString);
}

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
  return jwt.decode(token, app.get('secret')) ? true : false;
}
export const decodeToken = (token: string): User | null => {
  let user;
  jwt.verify(token, app.get('secret'), (err: any, decoded: any) => {
    if (err) return null;
    user = {
        name: decoded.user,
        id: decoded.id,
        group_id: decoded.group_id
      }
  })
  if (!user) return null;
  return user;

}
export const getProcessFromTranslation = <T, K extends keyof T>(processes: T, translations: K[]): Array<T[K]> => {
  return translations.map((t) => processes[t]);
}
export const parseSearchFilter = (filt: string): Array<Processes> => {
  const splited: Array<keyof typeof processTranslation> = filt.split(',').filter((f): boolean => processTranslation.hasOwnProperty(f)) as Array<keyof typeof processTranslation>;
  return getProcessFromTranslation(processTranslation, splited);
}
export const isWorkGroup = (group: number | string): boolean => {
  group = group.toString();
  return group.includes('9') || group.includes('10') || group.includes('11') || group.includes('12') || group.includes('13');
}

export const wsmsg = (msg: WSMessage): string => {
  return JSON.stringify(msg);
}
// REVIEW: needs to be completely rewritten
/**
* Parses serarch query, returns SearchQuery object
* @param query string search query
* @returns SearchQuery
*/
export const parseSearchQuery = (query: any): SearchQuery => {
  let result: SearchQuery = {};
  let splited: any[] = [];
  if (query.includes('&')) {
    splited = query.split('&');
  } else {
    splited = [query];
  }
   if ((splited.length > 1) || (splited[0].includes(':'))) {
     result.nickname = [];
     result.ip = [];
     result.cn = '';
     for (let i = 0; i < splited.length; i++) {
       if (splited[i].includes(':')) {
         let q = {
           type : splited[i].split(':')[0],
           val: splited[i].split(':')[1]
         };
         if ((q.type === 'nickname') || (q.type === 'nn')) {
           result.nickname.push(q.val);
         }
         if (q.type === 'ip') {
           result.ip.push(q.val);
         }
         if (q.type === 'cn') {
           result.cn = q.val;
           result.process = Processes.CN_RES_SUCCESS;
         }
         if ((q.type === 'serals') || (q.type === 'srl')) {
           result.as = q.val.split('*')[0];
           result.ss = q.val.split('*')[1];
         }
       } else {
         if (i === 0) {
           result.nickname.push(splited[i]);
         } else if ( i < splited.length - 1 ) {
           result.nickname.push(splited[i]);
         } else {
           result.nickname.push(splited[i]);
         }
       }
     }
   } else {
     result.nickname = [splited[0]];
   }
  Object.keys(result).forEach((key: string) => {
    if (result[key as keyof SearchQuery]?.length === 0) delete result[key as keyof SearchQuery];
  });
  return result;
}
