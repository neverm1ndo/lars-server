import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { Logger } from '@shared/Logger';
import cors from 'cors';
import { LOG_LINE } from '@schemas/logline.schema';
import { Document } from 'mongoose';


import { CORSoptions } from '@shared/constants';

const router = Router();
const { UNAUTHORIZED } = StatusCodes;

router.get('/api/logs/last', cors(CORSoptions), (req: any, res: any) => { // GET last lines. Default : 100
  if (!req.headers.authorization) return res.sendStatus(UNAUTHORIZED);
  let lim = 100;
  let page = 0;
  if (req.query.lim) lim = +req.query.lim;
  if (req.query.page) page = +req.query.page;
  Logger.log('default', 'GET │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[91mrole: \x1b[93m${req.user.group_id}`, '\x1b[0m' ,'-> LINES', lim, page,' [', req.originalUrl, ']');
  LOG_LINE.find({}, [], { sort: { unix : -1 }, limit: lim, skip: lim*page }, (err: any, lines: Document[]) => {
    if (err) return Logger.log('error', err);
    res.send(lines);
  });
});
router.get('/api/logs/search', cors(CORSoptions), (req: any, res: any) => { // GET Search by nickname, ip, serals
  if (!req.headers.authorization) return res.sendStatus(UNAUTHORIZED);
  let lim = 40;
  let page = 0;
  if (req.query.lim) lim = +req.query.lim;
  if (req.query.page) page = +req.query.page;
    Logger.log('default', 'GET │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[91mrole: \x1b[93m${req.user.group_id}`, '\x1b[0m' ,'-> SEARCH\n',
               '                            └ ', JSON.stringify(req.query));
    if (req.query.ip) {
      LOG_LINE.find({"geo.ip": req.query.ip}, [], { sort: { unix : -1 }, limit: lim, skip: lim*page}, (err: any, lines: Document[]) => {
        if (err) return Logger.log('error', err);
        res.send(lines);
      });
      return true;
    }
    if (req.query.nickname) {
        LOG_LINE.find({nickname: req.query.nickname}, [], { sort: { unix : -1 }, limit: lim, skip: lim*page}, (err: any, lines: Document[]) => {
        if (err) return Logger.log('error', err);
        res.send(lines);
      });
      return true;
    }
    if (req.query.as && req.query.ss) {
      LOG_LINE.find({"geo.as": req.query.as, "geo.ss": req.query.ss}, [], { sort: { unix : -1 }, limit: lim, skip: lim*page}, (err: any, lines: Document[]) => {
        if (err) return Logger.log('error', err);
        res.send(lines);
      });
      return true;
    }
});

export default router;
