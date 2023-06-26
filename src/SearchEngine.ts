import { processTranslation } from '@shared/constants';
import { QueryParser } from './QueryParser';
import { ISearchQuery } from '@interfaces/search';
import { LOG_LINE } from '@schemas/logline.schema';
import { ILogLine } from '@interfaces/logline';
import { Processes } from '@enums/processes.enum';
import { getProcessFromTranslation } from '@shared/functions';

type SearchDBRequestIncludesString = {
  $in?: string[];
}

type SearchDBRequest = {
  'geo.ip'?: SearchDBRequestIncludesString;
  'geo.as'?: string;
  'geo.ss'?: string;
  cn?: SearchDBRequestIncludesString,
  nickname?: SearchDBRequestIncludesString,
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
  from?: number;
  to?: number;
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

type IBuilderParamsKeyname = Omit<SearchDBRequest, 'unix' | 'content'>;

interface IBuilderParams {
  keyname: keyof IBuilderParamsKeyname;
  value: string | string[] | undefined;
}


function toNumber(this: number, value: any): number {
    value = +value;
    return Number.isNaN(value) ? value : this;
}

const INITIAL_DATE: Date = new Date('Jan 01 2000, 00:00:00');

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
      from: INITIAL_DATE.valueOf() / 1000,
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

    public async search({ q, filter, lim, page, from, to }: IRawSearchOptions): Promise<ILogLine[]> {
        try {

            const parsed: ISearchQuery = q ? this.__queryParser.parse(q)
                                           : {};

            const separatedfilter: Processes[] = filter ? this.__separateSearchFilter(filter)
                                                        : [];

            const options: ISearchOptions = { ...DEFAULT_SEARCH_OPTIONS, ...{ filter: separatedfilter, lim, page }};
            
            if (from) options.date.from = from;
            if (to) options.date.to = to;

            const request: SearchDBRequest = await this.__buildDBRequest(parsed, options.date);

            return LOG_LINE.find<ILogLine>(request, [], { sort: { unix: -1 }, limit: options.lim, skip: options.lim*options.page })
                            .where('process').nin(options.filter)
                            .exec();
        } catch(err: unknown) {
            throw err;
        }
    }

    private async __buildDBRequest(parsed: ISearchQuery, dates: { from: any, to: any }): Promise<SearchDBRequest> {
        const { ip, as, ss, nickname, process, cn } = parsed;
        
        let request: SearchDBRequest = {
          unix: {
            $gte: dates.from,
            $lte: dates.to,
          },
        };

        try {

          const params: IBuilderParams[] = [
            { keyname: 'geo.ip', value: ip },
            { keyname: 'geo.as', value: as },
            { keyname: 'geo.ss', value: ss },
            { keyname: 'cn',     value: cn },
            { keyname: 'nickname', value: nickname },
          ];

          for (let { keyname, value } of params) {

            if (!value) continue;

            if (Array.isArray(value)) {
              request = { ...request, ...{ [keyname]: { $in: value } }};
              continue;
            }

            request[keyname] = value;
          }

          return request as SearchDBRequest;
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