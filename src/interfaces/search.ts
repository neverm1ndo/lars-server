export interface ISearchQuery {
    nickname?: string[];
    ip?: string[];
    dateFrom?: string,
    dateTo?: string
    process?: string;
    as?: string;
    ss?: string;
    cn?: string[];
    dev?: boolean;
    adm?: string[];
    msg?: string;
    cli?: string[];
    gun?: string[];
}
