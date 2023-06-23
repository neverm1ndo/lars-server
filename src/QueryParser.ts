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
     *      nickname:<nickname&...> - search by nickname
     *      nn:<nickname,...> - alias for nickname:
     *      ip:<ip,...> - search by ip address
     *      serial:<as>*<ss> - search by serials
     *      s:<as>*<ss> - alias for serial:
     *      cn:<cn,...> - search by cn
     * 
     * Experimental filtering:
     *      bans:<nickname | ip | cn | as*ss> - search bans only
     *      ac: - show anti-cheat responses only
     *      admin:<nickname,...> - show admin actions
     *      daterange:<unix*unix> - show a certain period of time
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
                ["(ip)\\b", "return 'OP_IP';"],
                ["(nickname|nn)\\b", "return 'OP_NN';"],
                ["(serial|s)\\b", "return 'OP_SRL';"],
                ["(cn)\\b", "return 'OP_CN';"],
                ["^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$", "return 'IP_ADDR'"],
                ["\\*", "return '*';"],
                ["\\,", "return ',';"],
                ["\\:", "return ':';"],
                ["$", "return 'EOF';"],
                ["[0-9]{4,5}", "return 'AS';"],
                ["[0-9A-Z]{40}", "return 'SS';"],
                ["[0-9A-Z]{30}", "return 'CN';"],
                ["[0-9a-zA-Z_\\.\\/\\-]+", "return 'STRING';"],
            ],
        },
        "tokens": "STRING AS SS CN IP_ADDR OP_IP OP_NN OP_SRL OP_CN & * , : EOF",
        "start": "Q_TXT",
        "bnf": {
            "expressions": [
                ["Q_TXT EOF", "return $1;"],
            ],
            "Q_TXT": [
                ["Q_LIST EOF", "return $1;"],
                ["STRING EOF", "return $1;"],
            ],
            "Q_LIST": [
                ["Q_OP : Q_VALUE", "$$ = { [$Q_OP]: $Q_VALUE };"],
                ["Q_OP : Q_VALUE & Q_LIST", "$$ = { [$Q_OP]: $Q_VALUE, ...$Q_LIST };"],
            ],
            "Q_OP": [
                ["OP_NN" , "$$ = 'nickname';"],
                ["OP_IP" , "$$ = 'ip';"],
                ["OP_CN" , "$$ = 'cn';"],
                ["OP_SRL", "$$ = 'srl';"],
            ],
            "Q_VALUE": [
                ["AS * SS", "return { as: $AS, ss: $SS };"],
                ["Q_ARR"  , "$$ = $Q_ARR;"],
            ],
            "Q_ARR": [
                ["Q_ARR_ELEM"        , "$$ = [ $Q_ARR_ELEM ];"],
                ["Q_ARR_ELEM , Q_ARR", "$$ = [ $Q_ARR_ELEM, ...$Q_ARR ];"]
            ],
            "Q_ARR_ELEM": [
                ["STRING" , "$$ = $STRING;"],
                ["IP_ADDR", "$$ = $IP_ADDR;"],
                ["CN"     , "$$ = $CN;"],
            ],
        },
    };
    
    constructor() {
        this._engine = new (require('jison')).Parser(this._grammar);
    }

    public parse(input: string): ISearchQuery {
        try {
            return this._engine.parse(input);
        } catch(err) { // parse fail state
            console.error(err);
            return { nickname: [input] };
        };
    }
}