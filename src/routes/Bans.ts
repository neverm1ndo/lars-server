import StatusCodes from 'http-status-codes';
import { Router, Request, Response, json } from 'express';

import { MSQLPool } from '@shared/constants';

const router = Router();

const { MOVED_PERMANENTLY, INTERNAL_SERVER_ERROR, CONFLICT, OK } = StatusCodes;

interface Ban {
  id: number;
  rule: string;
  ban_type: number,
  ip: string;
  serial_cn?: string;
  serial_as?: number;
  serial_ss?: string;
  user_id?: number;
  admin_id: number;
  banned_from: Date;
  banned_to?: Date; 
}

router.get('/', (req: Request, res: Response) => {
  let page = 0;
  let limit = 50;
  if (req.query.p) page = +req.query.p;
  if (req.query.lim) limit = +req.query.lim;
  MSQLPool.promise()
          .query('SELECT * FROM lars_bans ORDER BY banned_from LIMIT ? OFFSET ?', [limit, page])
          .then(([rows]): void => {
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
          .query('SELECT * FROM lars_bans WHERE serial_cn = ? ORDER BY banned_from LIMIT ? OFFSET ?', [req.params.serial, limit, page])
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
          .query('SELECT * FROM lars_bans WHERE ip = ? ORDER BY banned_from LIMIT ? OFFSET ?', [req.params.ip, limit, page])
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
          .query('SELECT * FROM lars_bans WHERE serial_as = ? AND serial_ss = ? ORDER BY banned_from LIMIT ? OFFSET ?', [req.query.as, req.query.ss, limit, page])
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
          .query('SELECT * FROM lars_bans WHERE admin_id = ? ORDER BY banned_from LIMIT ? OFFSET ?', [req.params.id, limit, page])
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
          .query('UPDATE lars_bans SET banned_to = ? WHERE id = ?', [req.body.banned_to, req.params.id])
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
