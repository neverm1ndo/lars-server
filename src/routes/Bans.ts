import StatusCodes from 'http-status-codes';
import { Router, Request, Response, json, NextFunction } from 'express';

import { MSQLPool, SQLQueries } from '@shared/sql';
import { getAvatarURL } from '@shared/functions';
import Workgroup from '@enums/workgroup.enum';
import { logger } from '@shared/logger';

const router = Router();

const {
    MOVED_PERMANENTLY,
    INTERNAL_SERVER_ERROR,
    CONFLICT,
    NOT_IMPLEMENTED,
    OK
} = StatusCodes;

const {
    GET_BANLIST,
    BAN_CN_SEARCH,
    BAN_IP_SEARCH,
    BAN_SERIALS_SEARCH,
    BAN_CHANGE_DATE,
    BAN_COMMENT,
    BAN_POST_COMMENT,
    BAN_PATCH_COMMENT,
    BAN_USERNAME_SEARCH,
} = SQLQueries;

interface Ban {
    id: number;
    rule: string;
    ban_type: number,
    ip: string;
    serial_cn?: string;
    serial_as?: number;
    serial_ss?: string;
    user_id?: number;
    banned_username: string;
    admin_id: number;
    admin_avatar: string;
    admin_username: string;
    banned_from: number;
    banned_to?: number | null;
}

const LOGGER_PREFIX = '[BANS]';

const DEFAULT_QUERY_PARAMS: { [key: string]: number } = {
    page: 0,
    limit: 50
} as const;

function dateNormalize(value: number) {
    return value * 1000;
}

function limitAndPageQueryParamsCheck(req: Request, res: Response, next: NextFunction) {
    if (req.query.p)   req.body.page  = Number.parseInt(req.query.p as string);
    if (req.query.lim) req.body.limit = Number.parseInt(req.query.lim as string);

    req.body = Object.assign(req.body, DEFAULT_QUERY_PARAMS);

    if (Number.isNaN(req.body.page) || Number.isNaN(req.body.limit)) res.sendStatus(CONFLICT);
    next();
}

function transformDBResponseBeforeSend([rows]: any[]): Ban[] {
    return (rows as Ban[]).map((ban: Ban) => {
        ban.admin_avatar = getAvatarURL(ban.admin_avatar);
        ban.banned_from = dateNormalize(ban.banned_from);

        if (ban.banned_to) {
            ban.banned_to = dateNormalize(ban.banned_to);
        }

        return ban;
    });
}

async function sendDBRequest(request: string, params?: any[]) {
  return MSQLPool.promise()
                 .query(request, params);
}

async function requestBansFromDB(request: string, params?: any[]): Promise<Ban[]> {
  return sendDBRequest(request, params).then(transformDBResponseBeforeSend);
}

router.use(limitAndPageQueryParamsCheck);

router.get('/', (req: any, res: Response) => {
    const { page, limit } = req.body;

    void (async() => {
        try {
            logger.log(LOGGER_PREFIX, '[GET]', 'BAN_LIST', `(${req.socket.remoteAddress})`, req.user.username, Workgroup[req.user!.main_group]);

            const banlist: Ban[] = await requestBansFromDB(GET_BANLIST, [limit, page]);

            return void res.send(banlist);
        } catch(err: any) {
            logger.err(LOGGER_PREFIX, '[GET]', 'BAN_LIST_FAIL', `(${req.socket.remoteAddress})`, req.user.username, Workgroup[req.user!.main_group], `\n::${err.message}::`);

            return void res.sendStatus(INTERNAL_SERVER_ERROR);
        }
    })();
});

router.get('/cn/:serial', (req: any, res: Response) => {
    const { page, limit } = req.body;

    void (async() => {
        try {
            logger.log(LOGGER_PREFIX, '[GET]', 'BAN_LIST_SEARCH_CN', `(${req.socket.remoteAddress})`, req.user.username, Workgroup[req.user!.main_group], req.params.serial);

            const banlist: Ban[] = await requestBansFromDB(BAN_CN_SEARCH, [req.params.serial, limit, page]);

            return void res.send(banlist);
        } catch(err: any) {
            logger.err(LOGGER_PREFIX, '[GET]', 'BAN_LIST_SEARCH_CN_FAIL', `(${req.socket.remoteAddress})`, req.user.username, Workgroup[req.user!.main_group], req.params.serial, `::${err.message}::`);

            return void res.sendStatus(INTERNAL_SERVER_ERROR);
        }
    })();
});

router.get('/ip/:ip', (req: any, res: Response) => {
    const { page, limit } = req.body;

    void (async() => {
        try {
            logger.log(LOGGER_PREFIX, '[GET]', 'BAN_LIST_SEARCH_IP', `(${req.socket.remoteAddress})`, req.user.username, Workgroup[req.user!.main_group], req.params.ip);

            const banlist: Ban[] = await requestBansFromDB(BAN_IP_SEARCH, [req.params.ip, limit, page]);

            return void res.send(banlist);
        } catch(err: any) {
            logger.err(LOGGER_PREFIX, '[GET]', 'BAN_LIST_SEARCH_IP_FAIL', `(${req.socket.remoteAddress})`, req.user.username, Workgroup[req.user!.main_group], req.params.ip, `::${err.message}::`);

            return void res.sendStatus(INTERNAL_SERVER_ERROR);
        }
    })();
});

router.get('/serials', (req: any, res: Response) => {
    const { page, limit } = req.body;
    
    void (async() => {
        try {
          logger.log(LOGGER_PREFIX, '[GET]', 'BAN_SEARCH_SERIALS', `(${req.socket.remoteAddress})`, req.user.username, Workgroup[req.user!.main_group], `AS:${req.query.as} SS:${req.query.ss}`);
      
          const banlist: Ban[] = await requestBansFromDB(BAN_SERIALS_SEARCH, [req.params.as, req.params.ss, limit, page]);
          
          return void res.send(banlist);
        } catch(err: any) {
            logger.err(LOGGER_PREFIX, '[GET]', 'BAN_SEARCH_SERIALS_FAIL', `(${req.socket.remoteAddress})`, req.user.username, Workgroup[req.user!.main_group], `AS:${req.query.as} SS:${req.query.ss}`, `::${err.message}::`);
            
            return void res.sendStatus(INTERNAL_SERVER_ERROR);
        }
    })();
});

router.get('/admin/:username', (_req: Request, res: Response) => {
  return res.sendStatus(NOT_IMPLEMENTED);
});

router.get('/user/:username', (req: any, res: Response) => {
    const { page, limit } = req.body;

    void (async() => {
        try {
            logger.log(LOGGER_PREFIX, '[GET]', 'BAN_USER', `(${req.socket.remoteAddress})`, req.user.username, Workgroup[req.user!.main_group], `BAN::${req.params.username}`);
        
            const banlist: Ban[] = await requestBansFromDB(BAN_USERNAME_SEARCH, [req.params.username, limit, page]);
        
            return void res.send(banlist);
        } catch(err) {
            logger.err(LOGGER_PREFIX, '[GET]', 'BAN_USER', `(${req.socket.remoteAddress})`, req.user.username, Workgroup[req.user!.main_group], `BAN::${req.params.username}`);
            console.error(err);
            
            return void res.sendStatus(INTERNAL_SERVER_ERROR);
        }
    })();
});


/**
 * Changes ban date or set it permanent
*/
router.patch('/ban/:id', json(), (req: any, res: Response) => {
    void (async() => {
        try {
            logger.log(LOGGER_PREFIX, '[PATCH]', 'BAN_USER_ID', `(${req.socket.remoteAddress})`, req.user.username, Workgroup[req.user!.main_group], `BAN_ID::${req.params.id}`);
            if (!req.body.banned_to) throw CONFLICT;
        
            await sendDBRequest(BAN_CHANGE_DATE, [req.body.banned_to, req.params.id]);
        
            res.sendStatus(OK);
        } catch(err: any) {
            logger.err(LOGGER_PREFIX, '[PATCH]', 'BAN_USER_ID_FAIL', `(${req.socket.remoteAddress})`, req.user.username, Workgroup[req.user!.main_group], `BAN_ID::${req.params.id}`, `::${err.message}::`);
        
            if (typeof err === 'number') return void res.sendStatus(err);
        
            res.sendStatus(INTERNAL_SERVER_ERROR);
        }
    })();
});

/**
 * Admin comments for bans
 * Using only in LARS
 */
router.get('/ban/comment/:id', (req: Request, res: Response) => {
    void (async() => {
        try {
            if (!req.params.id) throw new Error('Conflict params');
            const comments = await sendDBRequest(BAN_COMMENT, [req.params.id]);
        
            res.send(comments);
        } catch(err) {
            console.error(err);
            res.sendStatus(INTERNAL_SERVER_ERROR);
        }
    })();
});

router.post('/ban/comment/:id', json(), (req: Request, res: Response) => {
  MSQLPool.promise()
          .query(BAN_POST_COMMENT, [req.body.banned_to, req.params.id])
          .then((): void => { res.sendStatus(OK); })
          .catch((err): void => {
            console.error(err);
            res.sendStatus(INTERNAL_SERVER_ERROR);
          });
});

router.patch('/ban/comment/:id', json(), (req: Request, res: Response) => {
  MSQLPool.promise()
          .query(BAN_PATCH_COMMENT, [req.body.banned_to, req.params.id])
          .then((): void => { res.sendStatus(OK); })
          .catch((err): void => {
            console.error(err);
            res.sendStatus(INTERNAL_SERVER_ERROR);
          });
});


router.get('/expire-token', (_req: any, res: any) => {
  return void res.send(MOVED_PERMANENTLY);
});

export default router;
