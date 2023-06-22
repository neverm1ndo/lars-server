import StatusCodes from 'http-status-codes';
import { Router } from 'express';

import { LOG_LINE } from '@schemas/logline.schema';
import { Document, CallbackError } from 'mongoose';

// import { parseSearchFilter } from '@shared/functions';
import { ISearchQuery } from '@interfaces/search';
import { QueryParser } from '../QueryParser';

import { logger } from '@shared/constants';
import Workgroup from '@enums/workgroup.enum';
import { SearchEngine } from 'src/SearchEngine';
import { ILogLine } from '@interfaces/logline';

const LOGGER_PREFIX = '[LOGS]';

const router = Router();
const { INTERNAL_SERVER_ERROR, CONFLICT } = StatusCodes;

const engine: SearchEngine = new SearchEngine();

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
    to: Date.now()
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

router.get('/last', (req: any, res: any) => {

  const query: ISearchOptions = { ...defaultSearchOptions, ...req.query };
        query.filter = req.query.filter ? engine.parseSearchFilter(req.query.filter) : [];
  
  logger.log(LOGGER_PREFIX, '[GET]', 'LAST', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user!.main_group], req.query.search);
  
  LOG_LINE.find({ unix: { $gte: query.date.from, $lte: query.date.to }}, [], { sort: { unix : -1 }, limit: query.lim, skip: query.lim * query.page },)
          .where('process').nin(query.filter)
          .exec((err: any, lines: Document[]) => {
            if (err) {
              logger.err(LOGGER_PREFIX, 'LAST_FAIL', req.query ,`::${err.message}::`);
              return res.status(INTERNAL_SERVER_ERROR)
                        .send(err.message);
            }
            res.send(lines);
          });
});

router.get('/search', async (req: any, res: any) => {
  if (!req.query.search) {
    const redirectURL = new URL('/v2/lars/logs/last', `${req.protocol}://${process.env.HOST}`);
          for (let param in req.query) {
            redirectURL.searchParams.append(param, req.query[param]);
          };
    return res.redirect(redirectURL);
  }
  
  const query: ISearchOptions = { ...defaultSearchOptions, ...req.query };
        query.filter = req.query.filter ? engine.parseSearchFilter(req.query.filter) : [];
  
  const searchQuery: ISearchQuery = queryParser.parse(req.query.search);
  
  logger.log(LOGGER_PREFIX, '[GET]', 'SEARCH', `(${req.connection.remoteAddress})`, req.user?.username, Workgroup[req.user!.main_group], req.query.search);
  
  const mdbq: MDBRequest = await buildDBRequest(searchQuery, query);

  LOG_LINE.find(mdbq, [], { sort: { unix : -1 }, limit: query.lim, skip: query.lim * query.page})
          .where('process').nin(query.filter)
          .exec((err: CallbackError, lines: Document[]) => {
            if (err) {
              logger.err(LOGGER_PREFIX, 'SEARCH_FAIL', req.query ,`::${err.message}::`);
              return res.status(INTERNAL_SERVER_ERROR).end(err.message);
            }
            res.send(lines);
          });
});

router.get('/srch', async (req: any, res: any) => {
  try {
    const searchResult: ILogLine[] = await engine.search(req.query);
    res.send(searchResult);
  } catch(err: unknown) {
    res.status(CONFLICT)
       .send(err);
  }
});

export default router;
