import { MSQLPool, SQLQueries } from '@shared/constants';
import { QueryParser } from './QueryParser';
import { ISearchQuery } from '@interfaces/search';
import { LOG_LINE } from '@schemas/logline.schema';
import { CallbackError } from 'mongoose';

interface DBRequest {
    'geo.ip'?: { 
      $in?: string[]; 
    };
    'geo.as'?: string;
    'geo.ss'?: string;
    cn?: { 
      $in?: string[];
    },
    nickname?: { 
      $in?: string[];
    },
    'content.message'?: string;
    process?: string;
    unix: { 
      $gte?: number;
      $lte?: number;
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

export class SearchEngine {

    private readonly __queryParser: QueryParser = new QueryParser();

    private readonly __defaultSearvhOptions: ISearchOptions = {
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

    public async search(query: string, limit: number, page: number, filter: string[]): Promise<any> {
        try {
            const parsed: ISearchQuery = this.__queryParser.parse(query);
            
            const request: DBRequest = await this.__buildDBRequest(parsed);

            return LOG_LINE.find(request, [], { sort: { unix: -1 }, limit, skip: limit*page })
                            .where('process').nin(filter)
                            .exec();
        } catch(err) {
            console.error(err);
        }
    }

    private async __buildDBRequest(parsed: ISearchQuery): Promise<DBRequest> {
        const { ip, as, ss, nickname, process, cn } = parsed;
        let request: any = {
          'geo.ip': { $in: ip },
          'geo.as': as,
          'geo.ss': ss,
          nickname: { $in: nickname },
          process,
          'content.message': {$in: cn },
        //   unix: { $gte: query.date.from, $lte: query.date.to }
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
          return request as DBRequest;
        } catch(err) {
          throw err;
        }
    }
}