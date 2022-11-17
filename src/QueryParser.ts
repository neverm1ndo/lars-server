import { ISearchQuery } from "@interfaces/search";

export class QueryParser {

    private _engine;

    private _grammar = {
        "lex": {
            "rules": [
                ["\\s+", "/* skip whitespace */"],
                ["\\&", "return '&';"],
                ["(ip):\\b", "return 'IP_OPERATOR';"],
                ["(nickname|nn):\\b", "return 'NN_OPERATOR';"],
                ["(serial|srl):\\b", "return 'SRL_OPERATOR';"],
                ["(cn):\\b", "return 'CN_OPERATOR';"],
                ["\\*", "return '*';"],
                ["$", "return 'EOF';"],
                ["[0-9]{4,5}", "return 'AS';"],
                ["[0-9A-Z]{40}", "return 'SS';"],
                ["[0-9a-zA-Z_\\.\\/\\-]+", "return 'STRING';"],
            ],
        },
        "tokens": "STRING AS SS IP_OPERATOR NN_OPERATOR SRL_OPERATOR CN_OPERATOR & * EOF",
        "start": "QText",
        "bnf": {
            "expressions": [
                ["QText EOF", "return $1;"],
            ],
            "QText": [
                ["QElementList EOF", "return $1;"],
            ],
            "QElementList": [
                ["QElement", "$$ = $1;"],
                ["QElement & QElementList", "$$ = { ...$1 , ...$3 };"]
            ],
            "QSerials": [
                ["AS * SS", "$$ = { as: $1, ss: $3 };"]
            ],
            "QElement": [
                ["IP_OPERATOR STRING", "$$ = { ip: $2 };"],
                ["NN_OPERATOR STRING", "$$ = { nickname: $2 };"],
                ["SRL_OPERATOR QSerials", "$$ = $2;"],
                ["CN_OPERATOR STRING", "$$ = { cn: $2 };"],
            ],
        },
    };
    
    constructor() {
        this._engine = new (require('jison')).Parser(this._grammar);
    }

    public async parse(input: string): Promise<ISearchQuery> {
        return this._engine.parse(input);
    }
}

// console.log(new QueryParser().parse('nn:asdasdasd&ip:123.123.123.123&srl:12345*E894D8CCF454F94D8FFA8DC8FEE9E088E49E84CD'))