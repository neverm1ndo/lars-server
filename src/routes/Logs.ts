import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { Logger } from '@shared/Logger';
import { LOG_LINE } from '@schemas/logline.schema';
import { Document, CallbackError } from 'mongoose';


import { corsOpt } from '@shared/constants';
import { isDate, parseSearchFilter } from '@shared/functions';

const router = Router();
const { UNAUTHORIZED, INTERNAL_SERVER_ERROR } = StatusCodes;

router.get('/last', corsOpt, (req: any, res: any) => { // GET last lines. Default : 100
  if (!req.headers.authorization) return res.sendStatus(UNAUTHORIZED);
  let filter: string[] = [];
  let lim = 100;
  let page = 0;
  if (req.query.lim) lim = +req.query.lim;
  if (req.query.page) page = +req.query.page;
  if (req.query.filter) filter = parseSearchFilter(req.query.filter);
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user, `role: ${req.user.group_id}`, '-> LINES', lim, page,' [', req.originalUrl, ']');
  LOG_LINE.find({}, [], { sort: { unix : -1 }, limit: lim, skip: lim*page },)
  .where('process').nin(filter)
  .exec((err: any, lines: Document[]) => {
    if (err) {
      Logger.log('error', err);
      return res.send(INTERNAL_SERVER_ERROR).end(err);
    }
    res.send(lines);
    });
});
router.get('/search', corsOpt, (req: any, res: any) => { // GET Search by nickname, ip, serals
  if (!req.headers.authorization) return res.send(UNAUTHORIZED);
  let filter: string[] = [];
  let lim = 40;
  let page = 0;
  let date = {
    from: 'Jan 01 2000 00:00:00',
    to: 'Jan 01 2022 00:00:00'
  };
  if (req.query.lim) lim = +req.query.lim;
  if (req.query.page) page = +req.query.page;
  if (req.query.filter) filter = parseSearchFilter(req.query.filter);
  if (isDate(req.query.dateTo) && isDate(req.query.dateFrom)) { date = { from: req.query.dateFrom, to: req.query.dateTo }};
    Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user,`role: ${req.user.group_id}`, '-> SEARCH\n',
               '                            └ ', JSON.stringify(req.query));
    if (req.query.ip) {
      LOG_LINE.find({"geo.ip": req.query.ip, date: { $gte: new Date(date.from + ' GMT+0300'), $lte: new Date(date.to + ' GMT+0300') } }, [], { sort: { unix : -1 }, limit: lim, skip: lim*page})
      .where('process').nin(filter)
      .exec((err: CallbackError, lines: Document[]) => {
        if (err) {
          Logger.log('error', err);
          return res.send(INTERNAL_SERVER_ERROR).end(err);
        }
        res.send(lines);
      })
      return true;
    }
    if (req.query.nickname) {
        LOG_LINE.find({ nickname: req.query.nickname, date: { $gte: new Date(date.from + ' GMT+0300'), $lte: new Date(date.to + ' GMT+0300') }}, [], { sort: { unix : -1 }, limit: lim, skip: lim*page })
        .where('process').nin(filter)
        .exec((err: CallbackError, lines: Document[]) => {
          if (err) {
            Logger.log('error', err);
            return res.send(INTERNAL_SERVER_ERROR).end(err);
          }
          res.send(lines);
        })
      return true;
    }
    if (req.query.as && req.query.ss) {
      LOG_LINE.find({"geo.as": req.query.as, "geo.ss": req.query.ss, date: { $gte: new Date(date.from + ' GMT+0300'), $lte: new Date(date.to + ' GMT+0300') } }, [], { sort: { unix : -1 }, limit: lim, skip: lim*page}, (err: any, lines: Document[]) => {
        if (err) {
          Logger.log('error', err);
          return res.send(INTERNAL_SERVER_ERROR).end(err);
        }
        res.send(lines);
      });
      return true;
    }
});

export default router;
