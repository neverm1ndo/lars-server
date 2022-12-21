import { ISearchQuery } from "@interfaces/search";

export class QueryParser {

    private _engine;

    /**
     * Query string syntax
     * (nn|nickname):<NICKANME1>,<NICKNAME2> & (srl|serial):<AS>*<SS> - search in nicknames ['NICKNAME1', 'NICKNAME2'] with specific serials
     * "nn" - is an alias for "nickname" 
     */

    private _grammar = {
        "lex": {
            "rules": [
                ["\\s+", "/* skip whitespace */"],
                ["\\&", "return '&';"],
                ["(ip):\\b", "return 'IP_OPERATOR';"],
                ["(nickname|nn):\\b", "return 'NN_OPERATOR';"],
                ["(serial|srl):\\b", "return 'SRL_OPERATOR';"],
                ["(cn):\\b", "return 'CN_OPERATOR';"],
                ["^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$", "return 'IP_ADDRESS'"],
                ["\\*", "return '*';"],
                ["\\,", "return ',';"],
                ["$", "return 'EOF';"],
                ["[0-9]{4,5}", "return 'AS';"],
                ["[0-9A-Z]{40}", "return 'SS';"],
                ["[0-9a-zA-Z_\\.\\/\\-]+", "return 'STRING';"],
            ],
        },
        "tokens": "STRING AS SS IP_OPERATOR NN_OPERATOR SRL_OPERATOR CN_OPERATOR IP_ADDRESS & * , EOF",
        "start": "QText",
        "bnf": {
            "expressions": [
                ["IP_ADDRESS EOF", "return { ip: $1 };"],
                ["QText EOF", "return $1;"],
            ],
            "QText": [
                ["QElementList EOF", "return $1;"],
            ],
            "QArray": [
                ["STRING", "$$ = [$1];"],
                ["STRING , QArray", "$$ = [$1, ...$3];"]
            ],
            "QElementList": [
                ["QElement", "$$ = $1;"],
                ["QElement & QElementList", "$$ = { ...$1 , ...$3 };"]
            ],
            "QSerials": [
                ["AS * SS", "$$ = { as: $1, ss: $3 };"]
            ],
            "QElement": [
                ["IP_OPERATOR QArray", "$$ = { ip: $2 };"],
                ["NN_OPERATOR QArray", "$$ = { nickname: $2 };"],
                ["SRL_OPERATOR QSerials", "$$ = $2;"],
                ["CN_OPERATOR QArray", "$$ = { cn: $2 };"],
            ],
        },
    };
    
    constructor() {
        this._engine = new (require('jison')).Parser(this._grammar);
    }

    public parse(input: string): ISearchQuery {
        return this._engine.parse(input);
    }
}