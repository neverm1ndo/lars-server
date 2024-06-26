import { Processes, processTranslation, getProcessFromTranslation } from '@shared/processes';
import { QueryParser } from './QueryParser';
import { ISearchQuery } from '@interfaces/search';
import { LOG_LINE } from '@schemas/logline.schema';
import { ILogLine } from '@interfaces/logline';

type SearchDBRequestIncludesString = {
    $in?: string[];
}

export type SearchDBRequest = {
    'geo.ip'?: SearchDBRequestIncludesString;
    'geo.as'?: string;
    'geo.ss'?: string;
    'geo.cli'?: string;
    cn?: SearchDBRequestIncludesString;
    nickname?: SearchDBRequestIncludesString;
    'content.message'?: string;
    'content.cn'?: string;
    'content.weapon'?: string;
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
    _date: {
        from: number;
        to: number;
    };
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


function toNumber(this: number, value: number | string): number {
    value = Number(value);

    return Number.isNaN(value) ? value : this;
}

const ADMIN_ACTIONS: Processes[] = [
    Processes.SPECTATE_CHANGE,
    Processes.SPECTATE_ENTER,
    Processes.SPECTATE_LEAVE,
    Processes.AUTH_CORRECT_ADM,
    Processes.CN_BAN_HAND,
    Processes.DISCONNECT_BAN,
    Processes.DISCONNECT_KICK,
    Processes.DISCONNECT_KICKBAN
];

const DEV_ACTIONS: Processes[] = [
    Processes.DEV_CLICKMAP,
    Processes.DEV_KEYLOG,
    Processes.DEV_VEH_ADD,
    Processes.DEV_VEH_RM,
    Processes.DEV_WEAP
];

export const INITIAL_DATE: Date = new Date('Jan 01 2000, 00:00:00');

const DEFAULT_SEARCH_OPTIONS: ISearchOptions = {
    filter: [],
    _lim: 100,
    set lim(limit: string | number) {
      this._lim = toNumber.call(this._lim, limit);
    },
    get lim(): number { return this._lim },
    _page: 0,
    set page(page: string | number) {
      this._page = toNumber.call(this._page, page);
    },
    get page(): number { return this._page },
    _date: {
      from: INITIAL_DATE.valueOf() / 1000,
      to: Date.now()
    },
    set date({ from, to }: { from: string; to: string }) {
      this._date = {
        from: toNumber.call(this._date.from, from),
        to: toNumber.call(this._date.to, to),
      };
    },
    get date(): { from: number; to: number } { return this._date; }
};

export class SearchEngine {

    private readonly __queryParser: QueryParser = new QueryParser();

    public async search<T extends IRawSearchOptions>({ q, filter, lim, page, from, to }: T): Promise<ILogLine[]> {
        const parsed: ISearchQuery = q ? this.__queryParser.parse(q)
                                        : {};

        const separatedfilter: Processes[] = filter ? this.__separateSearchFilter(filter)
                                                    : [];

        const options: ISearchOptions = { ...DEFAULT_SEARCH_OPTIONS, ...{ filter: separatedfilter, lim, page }};
        
        if (from) options.date.from = from;
        if (to) options.date.to = to;

        const request: SearchDBRequest = this.__buildDBRequest(parsed, options.date);

        return LOG_LINE.find<ILogLine>(request, [], { sort: { unix: -1 }, limit: options.lim, skip: options.lim*options.page })
                        .where('process').nin(options.filter)
                        .exec();

    }

    private __buildDBRequest(parsed: ISearchQuery, dates: { from: any, to: any }): SearchDBRequest {
        const { ip, as, ss, nickname, process, cn, dev, cli, gun, msg, adm } = parsed;
        
        let request: SearchDBRequest = {
          unix: {
            $gte: dates.from,
            $lte: dates.to,
          },
        };

        const params: IBuilderParams[] = [
            { keyname: 'geo.ip', value: ip },
            { keyname: 'geo.as', value: as },
            { keyname: 'geo.ss', value: ss },
            { keyname: 'geo.cli', value: cli },
            { keyname: 'content.cn', value: cn },
            { keyname: 'content.message', value: msg },
            { keyname: 'content.weapon', value: gun },
            { keyname: 'nickname', value: nickname },
            { keyname: 'process', value: process },
        ];

        if (adm) params.push({ keyname: 'process', value: ADMIN_ACTIONS });

        if (dev) params.push({ keyname: 'process', value: DEV_ACTIONS });
          
        for (const { keyname, value } of params) {

            if (!value) continue;

            if (Array.isArray(value)) {
                request = { ...request, ...{ [keyname]: { $in: value } }};
                continue;
            }

            request[keyname] = value;
        }

        return request;
    }

    public parseSearchFilter(filt: string) {
      return this.__separateSearchFilter(filt);
    }

    private __separateSearchFilter(filt: string): Array<Processes> {
      const splited = filt.split(',')
                          .filter((f): boolean => !!processTranslation[f as keyof typeof processTranslation]) as Array<keyof typeof processTranslation>;
      return getProcessFromTranslation(processTranslation, splited);
    }
}