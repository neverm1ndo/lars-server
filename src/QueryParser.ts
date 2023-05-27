import { ISearchQuery } from "@interfaces/search";

export class QueryParser {

    private _engine;

    /**
     * Search engine query string syntax
     * !! Experimental lex !!
     * 
     * Logical Operators:
     *      & - logical AND
     * 
     * Search operators:
     *      bans:<nickname | ip | cn | as&ss> - search bans only
     *      nickname:<nickname&...> - search by nickname
     *      nn:<nickname&...> - alias for nickname:
     *      ip:<ip> - search by ip address
     *      serial:<as>&<ss> - search by serials
     *      s:<as>&<ss> - alias for serial:
     * 
     * Experimental filtering:
     *      ac: - show anti-cheat responses only
     *      admin:<nickname&...> - show admin actions
     *      daterange:<unix&unix> - show a certain period of time
     *      message:<any string> - find specific string in messages
     *      cli:<client version>
     *      gun:<gun_id> - show kills with specific gun
     *      dev: - show info for mod developers
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
        "tokens": "STRING AS SS IP_OPERATOR NN_OPERATOR SRL_OPERATOR CN_OPERATOR & * , EOF",
        "start": "QText",
        "bnf": {
            "expressions": [
                ["QText EOF", "return $1;"],
            ],
            "QText": [
                ["QElementList EOF", "return $1;"],
                ["STRING EOF", "return $1"],
            ],
            "QArray": [
                ["IP_ADDRESS", "$$ = [$1];"],
                ["STRING", "$$ = [$1];"],
                ["STRING , QArray", "$$ = [$1, ...$3];"]
            ],
            "QElementList": [
                ["QElement", "$$ = $1;"],
                ["QElement & QElementList", "$$ = { ...$1 , ...$3 };"]
            ],
            "QSerials": [
                ["AS * SS", "$$ = { as: $1, ss: $3 };"],
                ["SS", "$$ = { ss: $1 };"],
                ["AS", "$$ = { as: $1 };"],
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
        try {
            return this._engine.parse(input);
        } catch { // parse fail state
            return { nickname: [input] };
        };
    }
}