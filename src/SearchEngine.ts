import { processTranslation } from '@shared/constants';
import { QueryParser } from './QueryParser';
import { ISearchQuery } from '@interfaces/search';
import { LOG_LINE } from '@schemas/logline.schema';
import { ILogLine } from '@interfaces/logline';
import { Processes } from '@enums/processes.enum';
import { getProcessFromTranslation } from '@shared/functions';

interface ISearchDBRequestIncludesString {
  $in?: string[];
}

interface ISearchDBRequest {
  geo?: {
    ip?: ISearchDBRequestIncludesString;
    as?: string;
    ss?: string;
  },
  cn?: ISearchDBRequestIncludesString,
  nickname?: ISearchDBRequestIncludesString,
  content?: {
    message: string;
  },
  process?: string;
  unix: { 
    $gte?: number;
    $lte?: number;
  }
}

export interface IRawSearchOptions {
  q?: string;
  filter?: string;
  lim: number;
  page: number;
}

interface ISearchOptions {
    _lim: number;
    _page: number;
    _date: any;
    lim: number;
    page: number;
    filter: Processes[];
    date: {
      from: number;
      to: number;
    }
  }

function toNumber(this: number, value: any): number {
    value = +value;
    return Number.isNaN(value) ? value : this;
}

const DEFAULT_SEARCH_OPTIONS: ISearchOptions = {
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
    set date({ from, to }: { from: any; to: any }) {
      this._date = {
        from: toNumber.call(this._date.from, from),
        to: toNumber.call(this._date.to, to),
      };
    },
    get date() { return this._date; }
};;

export class SearchEngine {

    private readonly __queryParser: QueryParser = new QueryParser();

    public async search({ q, filter, lim, page }: IRawSearchOptions): Promise<ILogLine[]> {
        try {

            const parsed: ISearchQuery = q ? this.__queryParser.parse(q)
                                           : {};

            const separatedfilter: Processes[] = filter ? this.__separateSearchFilter(filter)
                                                        : [];

            const options: ISearchOptions = { ...DEFAULT_SEARCH_OPTIONS, ...{ filter: separatedfilter, lim, page }};

            const request: ISearchDBRequest = await this.__buildDBRequest(parsed, options.date);

            return LOG_LINE.find<ILogLine>(request, [], { sort: { unix: -1 }, limit: options.lim, skip: options.lim*options.page })
                            .where('process').nin(options.filter)
                            .exec();
        } catch(err: unknown) {
            throw err;
        }
    }

    private async __buildDBRequest(parsed: ISearchQuery, dates: { from: any, to: any }): Promise<ISearchDBRequest> {
        const { ip, as, ss, nickname, process, cn } = parsed;
        
        const request: ISearchDBRequest = {
          geo: {},
          nickname: { $in: nickname },
          unix: {
            $gte: dates.from,
            $lte: dates.to,
          },
        };

        try {
          
          if (ip) request.geo!.ip = { $in: ip };
          if (as) request.geo!.as = as;
          if (ss) request.geo!.ss = ss;
          if (cn) request.cn = { $in: cn };
          
          if (!nickname) delete request.nickname;
          if (process) request.process = process;
          if (!ip && !as && !ss) delete request.geo;

          return request as ISearchDBRequest;
        } catch(err: unknown) {
          throw err;
        }
    }

    public parseSearchFilter(filt: string) {
      return this.__separateSearchFilter(filt);
    }

    private __separateSearchFilter(filt: string): Array<Processes> {
      const splited: Array<keyof typeof processTranslation> = filt.split(',').filter((f): boolean => processTranslation.hasOwnProperty(f)) as Array<keyof typeof processTranslation>;
      return getProcessFromTranslation(processTranslation, splited);
    }
}