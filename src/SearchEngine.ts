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

interface IRawSearchOptions {
  query: string;
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
        set date({ from, to }: { from: any; to: any }) {
          this._date = {
            from: toNumber.call(this._date.from, from),
            to: toNumber.call(this._date.to, to),
          };
        },
        get date() { return this._date; }
    };

    public async search({ query, filter, lim, page }: IRawSearchOptions): Promise<ILogLine[]> {
        try {
            const parsed: ISearchQuery = this.__queryParser.parse(query);

            const separatedfilter: Processes[] = filter ? this.__separateSearchFilter(filter)
                                                        : [];

            const options: ISearchOptions = { ...this.__defaultSearvhOptions, ...{ filter: separatedfilter, lim, page }}

            const request: ISearchDBRequest = await this.__buildDBRequest(parsed);

            return LOG_LINE.find<ILogLine>(request, [], { sort: { unix: -1 }, limit: options.lim, skip: options.lim*options.page })
                            .where('process').nin(options.filter)
                            .exec();
        } catch(err: unknown) {
            throw err;
        }
    }

    private async __buildDBRequest(parsed: ISearchQuery): Promise<ISearchDBRequest> {
        const { ip, as, ss, nickname, process, cn } = parsed;
        
        const request: ISearchDBRequest = {
          geo: {
            ip: { $in: ip },
            as,
            ss,
          },
          cn: { $in: cn },
          nickname: { $in: nickname },
          process,
          unix: {},
        };
        
        try {
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