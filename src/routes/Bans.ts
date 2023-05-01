import StatusCodes from 'http-status-codes';
import { Router, Request, Response, json } from 'express';

import { MSQLPool, SQLQueries } from '@shared/constants';
import { getAvatarURL } from '@shared/functions';

const router = Router();

const { MOVED_PERMANENTLY, INTERNAL_SERVER_ERROR, CONFLICT, OK } = StatusCodes;

const { GET_BANLIST } = SQLQueries;

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
  banned_from: Date;
  banned_to?: Date | null; 
}

const DEFAULT_QUERY_PARAMS: { [key: string]: number } = {
  page: 0,
  limit: 50,
} as const;

router.get('/', (req: Request, res: Response) => {
  
  let { page, limit } = DEFAULT_QUERY_PARAMS;
  
  if (req.query.p) page = +req.query.p;
  if (req.query.lim) limit = +req.query.lim;

  if (Number.isNaN(page) || Number.isNaN(limit)) return res.sendStatus(CONFLICT);
  
  MSQLPool.promise()
          .query(GET_BANLIST /**, [limit, page] */)
          .then(([rows]): void => {
            (rows as Ban[]).map((ban: Ban) => {
              ban.admin_avatar = getAvatarURL(ban.admin_avatar);
              return ban;
            });
            
            res.send(rows as Ban[]);
          })
          .catch((err): void => {
            console.log(err);
            res.sendStatus(INTERNAL_SERVER_ERROR);
          });
});

router.get('/cn/:serial', (req: Request, res: Response) => {
  let page = 0;
  let limit = 50;
  if (!req.params.serial) res.sendStatus(CONFLICT);
  if (req.query.p) page = +req.query.p;
  if (req.query.lim) limit = +req.query.lim;
  MSQLPool.promise()
          .query('SELECT * FROM phpbb_samp_bans WHERE serial_cn = ? ORDER BY banned_from DESC LIMIT ? OFFSET ?', [req.params.serial, limit, page])
          .then(([rows]): void => {
            res.send(rows as Ban[]);
          })
          .catch((err): void => {
            console.log(err);
            res.sendStatus(INTERNAL_SERVER_ERROR);
          });
});

router.get('/ip/:ip', (req: Request, res: Response) => {
  let page = 0;
  let limit = 50;
  if (!req.params.ip) res.sendStatus(CONFLICT);
  if (req.query.p) page = +req.query.p;
  if (req.query.lim) limit = +req.query.lim;
  MSQLPool.promise()
          .query('SELECT * FROM phpbb_samp_bans WHERE ip = ? ORDER BY banned_from DESC LIMIT ? OFFSET ?', [req.params.ip, limit, page])
          .then(([rows]): void => {
            res.send(rows as Ban[]);
          })
          .catch((err): void => {
            console.log(err);
            res.sendStatus(INTERNAL_SERVER_ERROR);
          });
});

router.get('/serials', (req: Request, res: Response) => {
  let page = 0;
  let limit = 50;
  if (!req.query.as && !req.query.ss) res.sendStatus(CONFLICT);
  if (req.query.p) page = +req.query.p;
  if (req.query.lim) limit = +req.query.lim;
  MSQLPool.promise()
          .query('SELECT * FROM phpbb_samp_bans WHERE serial_as = ? AND serial_ss = ? ORDER BY DESC banned_from LIMIT ? OFFSET ?', [req.query.as, req.query.ss, limit, page])
          .then(([rows]): void => {
            res.send(rows as Ban[]);
          })
          .catch((err): void => {
            console.log(err);
            res.sendStatus(INTERNAL_SERVER_ERROR);
          });
});

router.get('/admin/:id', (req: Request, res: Response) => {
  let page = 0;
  let limit = 50;
  if (!req.params.id) res.sendStatus(CONFLICT);
  if (req.query.p) page = +req.query.p;
  if (req.query.lim) limit = +req.query.lim;
  MSQLPool.promise()
          .query('SELECT * FROM phpbb_samp_bans WHERE admin_id = ? ORDER BY banned_from DESC LIMIT ? OFFSET ?', [req.params.id, limit, page])
          .then(([rows]): void => {
            res.send(rows as Ban[]);
          })
          .catch((err): void => {
            console.log(err);
            res.sendStatus(INTERNAL_SERVER_ERROR);
          });
});

router.patch('/ban/:id', json(), (req: Request, res: Response) => {
  MSQLPool.promise()
          .query('UPDATE phpbb_samp_bans SET banned_to = ? WHERE id = ?', [req.body.banned_to, req.params.id])
          .then((): void => {
            res.sendStatus(OK);
          })
          .catch((err): void => {
            console.error(err);
            res.sendStatus(INTERNAL_SERVER_ERROR);
          });
});


router.get('/expire-token', (_req: any, res: any) => {
  return res.send(MOVED_PERMANENTLY);
});

export default router;
