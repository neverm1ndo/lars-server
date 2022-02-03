import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { Logger } from '@shared/Logger';
import { LOG_LINE } from '@schemas/logline.schema';
import { Document, CallbackError } from 'mongoose';
import { format } from 'url';
import { getTodayDate } from '@shared/functions';


import { corsOpt } from '@shared/constants';
import { isDate, parseSearchFilter, parseSearchQuery } from '@shared/functions';

const router = Router();
const { UNAUTHORIZED, INTERNAL_SERVER_ERROR, CONFLICT } = StatusCodes;

/*
* REVIEW: remove duplicate code
*/

// REVIEW: spaghetti code, add middlewares
router.get('/last', corsOpt, (req: any, res: any) => { // GET last lines. Default : 100
  if (!req.headers.authorization) return res.sendStatus(UNAUTHORIZED);
  let filter: string[] = [];
  let lim = 100;
  let page = 0;
  let date = {
    from: 'Jan 01 2000, 00:00:00',
    to: `Dec 31 ${new Date().getFullYear()}, 23:59:59`
  };
  console.log(getTodayDate())
  if (req.query.lim) lim = +req.query.lim;
  if (req.query.page) page = +req.query.page;
  if (req.query.filter) filter = parseSearchFilter(req.query.filter);
  console.log(req.query)
  if (isDate(req.query.dateTo) && isDate(req.query.dateFrom)) { date = { from: req.query.dateFrom, to: req.query.dateTo }};
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user, `role: ${req.user.group_id}`, '-> LINES', lim, page,' [', req.originalUrl, ']\n└ ', JSON.stringify(req.query));
  LOG_LINE.find({ date: { $gte: new Date(date.from + ' GMT+03:00'), $lte: new Date(date.to + ' GMT+03:00') }}, [], { sort: { unix : -1 }, limit: lim, skip: lim*page },)
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
router.get('/search', corsOpt, (req: any, res: any) => { // GET Search by nickname, ip, serals
  if (!req.headers.authorization) return res.sendStatus(UNAUTHORIZED);
  console.log(req.q)
  if (!req.query.search) {
    return res.redirect(format({ pathname: '/v2/logs/last', query: req.query }));
  }
  const query = parseSearchQuery(req.query.search);
  let date = {
    from: 'Jan 01 2000, 00:00:00',
    to: `Dec 31 ${new Date().getFullYear()}, 23:59:59`
  };
  let filter: string[] = [];
  let lim = 40;
  let page = 0;
  if (req.query.lim) lim = Number(req.query.lim);
  if (req.query.page) page = Number(req.query.page);
  if (req.query.filter) filter = parseSearchFilter(req.query.filter);
  if (isDate(req.query.dateTo) && isDate(req.query.dateFrom)) { date = { from: req.query.dateFrom, to: req.query.dateTo }};
    Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user,`role: ${req.user.group_id}`, '-> SEARCH\n',
               '                            └ ', JSON.stringify(req.query));
  let mdbq: {
    'geo.ip'?: { $in?: string[] };
    'geo.as'?: string;
    'geo.ss'?: string;
    nickname?: { $in?: string[] },
    date: { $gte?: Date, $lte?: Date }
  } = {
    'geo.ip': { $in: query?.ip },
    'geo.as': query?.as,
    'geo.ss': query?.ss,
    nickname: { $in: query?.nickname },
    date: { $gte: new Date(date.from), $lte: new Date(date.to) }
  }

  if (!mdbq['geo.ip']?.$in) { delete mdbq['geo.ip'] };
  if (!mdbq['geo.as']) { delete mdbq['geo.as'] };
  if (!mdbq['geo.ss']) { delete mdbq['geo.ss'] };
  if (!mdbq['nickname']?.$in) { delete mdbq['nickname'] };

  LOG_LINE.find(mdbq,
  [],
  { sort: { unix : -1 }, limit: lim, skip: lim*page})
  .where('process').nin(filter)
  .exec((err: CallbackError, lines: Document[]) => {
    if (err) {
      Logger.log('error', err);
      return res.sendStatus(INTERNAL_SERVER_ERROR).end(err);
    }
    res.send(lines);
  })
});

export default router;
