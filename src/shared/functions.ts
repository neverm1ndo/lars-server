import { Stream } from 'node:stream';

import iconv from 'iconv-lite';
import _ from 'lodash';
import { Document } from 'mongoose';

import { io } from '../index';

import { Processes } from '@shared/processes';

import { Parser2 } from '@parser';
import { Watcher } from '@watcher';
import { logger } from './logger';
import { MSQLPool, SQLQueries } from './sql';

import { noAvatarImageUrl } from '@shared/constants';
import { IContentData, ILogLine } from '@interfaces/logline';
import { LOG_LINE } from '@schemas/logline.schema';
import { IDBUser, IUserData } from '@interfaces/user';

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
    const { GET_PLAYER_BY_NAME } = SQLQueries;

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
                                                    .query(GET_PLAYER_BY_NAME, [logLine.content!.auth!.username]);
                const [user]: [IDBUser] = rows;

                const { main_group, username, secondary_group, user_avatar, user_id } = user;

                const userData = {
                    id: user_id,
                    username,
                    main_group,
                    secondary_group,
                    avatar: getAvatarURL(user_avatar ?? ''),
                };

                logLine.content!.auth = userData as IUserData;
            } catch(error) {
                console.log(error);
                throw error;
            }
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

        void (async () => {
            await dbLine.save();
        })();
    };

    const _updateStatistics = (logLine: ILogLine) => {
        broadcastProcessNotification(logLine);
    };

    watcher.overwatch()
            .on('data', (buffer: Buffer) => {
                void (async () => {
                    try {
                    const logLine: ILogLine = parser.parse(buffer);

                    await _save(logLine);
                    _updateStatistics(logLine);

                    } catch(error: any) {
                        console.log(buffer.toString());
                        logger.log('[ERROR]', error.message);
                    }
                })();
            });

    // watch server log
    void (async (): Promise<void> => {
        const stream: Stream = await watcher.serverLogWatch(process.env.SERVER_LOG_PATH!);

        stream.on('data', (buffer: Buffer) => {
            io.to('server_log').emit('server_log', buffer.toString());
        });
    })();
}

/**
* Broadcasts notification about specific process
* @param {ILogLine} line LogLine instance
*/
export const broadcastProcessNotification = (line: ILogLine): void => {
    io.sockets.emit('new-log-line');

    if (!line.process) return;

    const { GUARD_BLOCK_ON, DISCONNECT_KICKBAN, CHAT_REPORT } = Processes;

    const alertNotifications: Record<string, string> = {
        [GUARD_BLOCK_ON]: 'alert:guard-block-on',
        [DISCONNECT_KICKBAN]: 'alert:kickban',
        [CHAT_REPORT]:'alert:report'
    };

    if (!alertNotifications[line.process]) return;

    io.sockets.emit(alertNotifications[line.process], line);
}

export const getAvatarURL = function(filename?: string): string {
    return filename ? `https://www.gta-liberty.ru/images/avatars/upload/${filename}`
                    : noAvatarImageUrl;
}

export const isDate = (date :string): boolean => {
    return isNaN(Date.parse(date)) && (date !== '') && date !== undefined;
};

export const pErr = (err: Error) => {
    if (err) {
        logger.log('[ERROR]', err.message);
    }
};

export const getRandomInt = () => {
    return Math.floor(Math.random() * 1_000_000_000_000);
};

export function ANSItoUTF8(buffer: Buffer): Buffer {
    return iconv.encode(iconv.decode(buffer, 'win1251'), 'utf8');
}

export function UTF8toANSI(buffer: Buffer): Buffer {
    return iconv.encode(buffer.toString(), 'win1251');
}

export const isDevEnv = () => process.env.NODE_ENV! === 'development' || process.env.NODE_ENV! === 'test';