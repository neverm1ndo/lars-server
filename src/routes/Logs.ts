import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { Logger } from '@shared/Logger';
import { LOG_LINE } from '@schemas/logline.schema';
import { Document, CallbackError } from 'mongoose';

import { parseSearchFilter } from '@shared/functions';
import { ISearchQuery } from '@interfaces/search';
import { QueryParser } from 'src/QueryParser';

const router = Router();
const { INTERNAL_SERVER_ERROR } = StatusCodes;

interface MDBRequest {
    'geo.ip'?: { 
      $in?: string[] 
    };
    'geo.as'?: string;
    'geo.ss'?: string;
    cn?: { 
      $in?: string[] 
    },
    nickname?: { 
      $in?: string[] 
    },
    'content.message'?: string;
    process?: string;
    unix: { 
      $gte?: number, 
      $lte?: number 
    }
}

/*
* REVIEW: remove duplicate code
*/

interface ISearchOptions {
  _lim: number;
  _page: number;
  _date: any;
  filter: string[];
  lim: number;
  page: number;
  date: {
    from: number;
    to: number;
  }
}

function toNumber(this: number, value: any): number {
  return Number.isNaN(+value) ? +value : this;
}

async function buildDBRequest(searchQuery: ISearchQuery, query: ISearchOptions): Promise<MDBRequest> {
  const { ip, as, ss, nickname, process, cn } = searchQuery;
  let request: any = {
    'geo.ip': { $in: ip },
    'geo.as': as,
    'geo.ss': ss,
    nickname: { $in: nickname },
    process,
    'content.message': {$in: cn },
    unix: { $gte: query.date.from, $lte: query.date.to }
  };
  try {
    for (let key in request) {
      if (!request[key]) {
        delete request[key];
        continue;
      }
      if (typeof request[key] !== 'object') continue;
      if (!request[key].$in) delete request[key];
    }
    return request as MDBRequest;
  } catch(err) {
    throw err;
  }
};

const defaultSearchOptions: ISearchOptions = {
  filter: [],
  _lim: 100,
  set lim(limit: any) {
    this._lim = toNumber.call(this._lim, limit);
  },
  get lim() { return this._lim },
  _page: 0,
  set page(page: any) {
    this._page = toNumber.call(this._page, page);
  },
  get page() { return this._page },
  _date: {
    from: new Date('Jan 01 2000, 00:00:00').valueOf() / 1000,
    to: Date.now() / 1000
  },
  set date(date: { from: any; to: any }) {
    const { from, to } = date;
    this._date = {
      from: toNumber.call(this._date.from, from),
      to: toNumber.call(this._date.to, to),
    };
  },
  get date() { return this._date; }
};

const queryParser: QueryParser = new QueryParser();

router.get('/last', (req: any, res: any) => { // GET last lines. Default : 100

  const query: ISearchOptions = { ...defaultSearchOptions, ...req.query };
        query.filter = req.query.filter ? parseSearchFilter(req.query.filter) : [];

        console.log(req.user)

  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.username, `role: ${req.user.main_group}`, '-> LINES', query.lim, query.page,' [', req.originalUrl, ']');
  
  LOG_LINE.find({ unix: { $gte: query.date.from, $lte: query.date.to }}, [], { sort: { unix : -1 }, limit: query.lim, skip: query.lim * query.page },)
          .where('process').nin(query.filter)
          .exec((err: any, lines: Document[]) => {
            if (err) {
              Logger.log('error', err);
              return res.sendStatus(INTERNAL_SERVER_ERROR).end(err);
            }
            res.send(lines);
          });
});

router.get('/search', async (req: any, res: any) => { // GET Search by nickname, ip, serals
  if (!req.query.search) {
    const redirectURL = new URL('/v2/lars/logs/last', `https://${process.env.HOST}:${process.env.HTTPS_PORT || process.env.HTTP_PORT}`);
          for (let param in req.query) {
            redirectURL.searchParams.append(param, req.query[param]);
          };
    return res.redirect(redirectURL);
  }
  
  const query: ISearchOptions = { ...defaultSearchOptions, ...req.query };
        query.filter = req.query.filter ? parseSearchFilter(req.query.filter) : [];
  
  const searchQuery: ISearchQuery = queryParser.parse(req.query.search);
  
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.username,`role: ${req.user.main_group}`, '-> SEARCH');
  
  const mdbq: MDBRequest = await buildDBRequest(searchQuery, query);

  LOG_LINE.find(mdbq, [], { sort: { unix : -1 }, limit: query.lim, skip: query.lim * query.page})
          .where('process').nin(query.filter)
          .exec((err: CallbackError, lines: Document[]) => {
            if (err) {
              Logger.log('error', 'SEARCH', err);
              return res.sendStatus(INTERNAL_SERVER_ERROR).end(err);
            }
            res.send(lines);
          });
});

export default router;
