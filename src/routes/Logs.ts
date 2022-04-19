import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { Logger } from '@shared/Logger';
import { LOG_LINE } from '@schemas/logline.schema';
import { Document, CallbackError } from 'mongoose';
import { format } from 'url';

import { parseSearchFilter, parseSearchQuery } from '@shared/functions';

const router = Router();
const { UNAUTHORIZED, INTERNAL_SERVER_ERROR } = StatusCodes;

interface MDBRequest {
    'geo.ip'?: { $in?: string[] };
    'geo.as'?: string;
    'geo.ss'?: string;
    nickname?: { $in?: string[] },
    'content.message'?: string;
    process?: string;
    unix: { $gte?: number, $lte?: number }
}

/*
* REVIEW: remove duplicate code
*/

// REVIEW: spaghetti code, add middlewares
router.get('/last', (req: any, res: any) => { // GET last lines. Default : 100
  if (!req.headers.authorization) return res.sendStatus(UNAUTHORIZED);
  let filter: string[] = [];
  let lim = 100;
  let page = 0;
  let date = {
    from: +new Date('Jan 01 2000, 00:00:00')/1000,
    to: Date.now()*1000
  };
  if (req.query.lim) lim = +req.query.lim;
  if (req.query.page) page = +req.query.page;
  if (req.query.filter) filter = parseSearchFilter(req.query.filter);
  if (req.query.dateFrom) date.from = +req.query.dateFrom/1000;
  if (req.query.dateTo) date.to = +req.query.dateTo/1000;
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user, `role: ${req.user.group_id}`, '-> LINES', lim, page,' [', req.originalUrl, ']\n└ ', JSON.stringify(req.query));
  LOG_LINE.find({ unix: { $gte: date.from, $lte: date.to }}, [], { sort: { unix : -1 }, limit: lim, skip: lim*page },)
  .where('process').nin(filter)
  .exec((err: any, lines: Document[]) => {
    if (err) {
      Logger.log('error', err);
      return res.sendStatus(INTERNAL_SERVER_ERROR).end(err);
    }
    res.send(lines);
    });
});
// REVIEW: same spaghetti code
router.get('/search', (req: any, res: any) => { // GET Search by nickname, ip, serals
  if (!req.query.search) {
    return res.redirect(format({ pathname: '/v2/logs/last', query: req.query }));
  }
  const query = parseSearchQuery(req.query.search);
  let date = {
    from: +new Date('Jan 01 2000, 00:00:00')/1000,
    to: Math.round(Date.now()/1000)
  };
  let filter: string[] = [];
  let lim = 40;
  let page = 0;
  if (req.query.lim) lim = Number(req.query.lim);
  if (req.query.page) page = Number(req.query.page);
  if (req.query.filter) filter = parseSearchFilter(req.query.filter);
  if (req.query.dateFrom) date.from = +req.query.dateFrom/1000;
  if (req.query.dateTo) date.to = +req.query.dateTo/1000;
    Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user,`role: ${req.user.group_id}`, '-> SEARCH\n',
               '                            └ ', JSON.stringify(req.query));
  let mdbq: MDBRequest = {
    'geo.ip': { $in: query?.ip },
    'geo.as': query?.as,
    'geo.ss': query?.ss,
    nickname: { $in: query?.nickname },
    process: query?.process,
    'content.message': query?.cn,
    unix: { $gte: date.from, $lte: date.to }
  };

  /**
  * FIXME: TEST IT!
  */
  if (!mdbq['geo.ip']?.$in) { delete mdbq['geo.ip'] };
  if (!mdbq['geo.as']) { delete mdbq['geo.as'] };
  if (!mdbq['geo.ss']) { delete mdbq['geo.ss'] };
  if (!mdbq['process']) { delete mdbq['process'] };
  if (!mdbq['content.message']) { delete mdbq['content.message'] };
  if (!mdbq['nickname']?.$in) { delete mdbq['nickname'] };

  LOG_LINE.find(mdbq,
  [],
  { sort: { unix : -1 }, limit: lim, skip: lim*page})
  .where('process').nin(filter)
  .exec((err: CallbackError, lines: Document[]) => {
    if (err) {
      Logger.log('error', 'SEARCH', err);
      return res.sendStatus(INTERNAL_SERVER_ERROR).end(err);
    }
    res.send(lines);
  });
});

export default router;
