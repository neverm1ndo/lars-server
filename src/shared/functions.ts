import md5 from 'md5';

import iconv from 'iconv-lite';
import { logger } from './constants';
import { processTranslation, MSQLPool, SQLQueries, noAvatarImageUrl } from '@shared/constants';
import { IContentData, ILogLine } from '@interfaces/logline';
import { Document } from 'mongoose';
import { LOG_LINE } from '@schemas/logline.schema';
import { IUserData } from '@interfaces/user';
import { lookup, charset } from 'mime-types';
import { Processes } from '@enums/processes.enum';
import { io } from '../index';
import _ from 'lodash';
import { Parser2 } from '../Parser2';
import { Watcher } from '@watcher';
import { Stream } from 'stream';
import Workgroup from '@enums/workgroup.enum';


interface IRequest extends Request {
  cookies: {
    [key: string]: string;
  }
}

export const cookieExtractor = function(req: IRequest) {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies['jwt'];
  }
  return token;
}

export const watch = (): void => {
  const parser: Parser2 = new Parser2();
  const watcher: Watcher = new Watcher();
  const { GET_USER_BY_NAME } = SQLQueries;
  
  let _dbDocument: Document;
  let _last: ILogLine;

  const _isSimilarLine = (a: ILogLine, b: ILogLine): boolean => {
    if (!a || !b) return false;
    return a.process === b.process && _.isEqual(a.content, b.content) && a.nickname === b.nickname;
  }

  const _isContentAuth = (content?: IContentData): boolean => {
    if (!content) return false;
    return content.auth ? true : false;
  }

  const _save = async (logLine: ILogLine): Promise<void> => {
    
    if (_isContentAuth(logLine.content)) {
      try {
        const [rows]: any[] = await MSQLPool.promise()
                                            .query(GET_USER_BY_NAME, [logLine.content!.auth!.username]);
        const [user] = rows;

        const { main_group, username, secondary_group, user_avatar, user_id } = user;

        const userData: IUserData = {
          id: user_id,
          username,
          main_group,
          secondary_group,
          avatar: getAvatarURL(user_avatar),
        };

        logLine.content!.auth = userData;
      } catch(error) {
        console.log(error);
        throw error;
      };
    }
    
    if (_isSimilarLine(logLine, _last)) {
      _dbDocument.updateOne({$inc: { multiplier: 1 }})
                 .catch((err) => {
                    logger.log('[ERROR]', err.message);
                 });
      return;
    }
    
    const dbLine = new LOG_LINE<ILogLine>(logLine);
    
    _last = logLine;
    _dbDocument = dbLine;
    
    dbLine.save();
  };

  const _watchServerLog = async function(): Promise<void> {
    const stream: Stream = await watcher.serverLogWatch(process.env.SERVER_LOG_PATH!);
          stream.on('data', (buffer: Buffer) => {
              io.to('server_log').emit('server_log', buffer.toString());
           });
  };

  const _updateStatistics = (logLine: ILogLine) => {
      // statsman.update(logLine)
      //         .then(() => {
      //           io.sockets.emit('server-online', statsman.snapshot);
      //         })
      //         .catch(() => {});
      //         broadcastProcessNotification(logLine);
  };

  watcher.overwatch()
         .on('data', async (buffer: Buffer) => {
            try {
              const logLine: ILogLine = parser.parse(buffer);

              _save(logLine);
              _updateStatistics(logLine);
            
            } catch(error: any) {
              console.log(buffer.toString());
              logger.log('[ERROR]', error.message);
            }
         });
  _watchServerLog();
}

/**
* Broadcasts notification about specific process
* @param {ILogLine} line LogLine instance
*/
export const broadcastProcessNotification: any = (line: ILogLine): void => {
  io.sockets.emit('new-log-line');
  switch (line.process) {
    case Processes.GUARD_BLOCK_ON: 
      io.sockets.emit('alert:guard-block-on', line); 
      break;
    case Processes.DISCONNECT_KICKBAN: 
      io.sockets.emit('alert:kickban', line); 
      break;
    case Processes.CHAT_REPORT: 
      io.sockets.emit('alert:report', line); 
      break;
    default: break;
  }
}

export const getAvatarURL = function(filename: string): string {
  return filename ? `https://www.gta-liberty.ru/images/avatars/upload/${filename}` : noAvatarImageUrl
}

export const isDate = (date :string): boolean => {
  return isNaN(Date.parse(date)) && (date !== '') && date !== undefined;
} ;

export const pErr = (err: Error) => {
    if (err) {
        logger.log('[ERROR]', err.message);
    }
};

export const getRandomInt = () => {
    return Math.floor(Math.random() * 1_000_000_000_000);
};

export const getMimeType = (path: string): string | false => {
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


export function ANSItoUTF8(buffer: Buffer): Buffer {
  return iconv.encode(iconv.decode(buffer, 'win1251'), 'utf8');
}

export function UTF8toANSI(buffer: Buffer): Buffer {
  return iconv.encode(buffer.toString(), 'win1251');
}

export const getCharset = (typeString: string): string | false => {
  return charset(typeString);
}

export const checkPassword = (pass?: string, hash?: string): boolean => {
    
  if (!pass || !hash) return false;
    
  let salt = hash.slice(0, hash.length - 32);
  let realPassword = hash.slice(hash.length - 32, hash.length);
  let password = md5(salt + pass);
  
  if (password === realPassword) {
    return true;
  } 
  
  return false;
}

export const getProcessFromTranslation = <T, K extends keyof T>(processes: T, translations: K[]): Array<T[K]> => {
  return translations.map((t) => processes[t]);
}

export const isWorkGroup = (group?: number | Workgroup): boolean => {
  if (!group) return false;
  return group >= 9 && group <= 13;
}
