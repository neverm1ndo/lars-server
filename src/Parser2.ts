import { ILogLine } from "@interfaces/logline";
import iconv from 'iconv-lite';

export class Parser2 {
    
    private _grammar = {
        "lex": {
            "macros": {
                "esc": "\\\\",
            },
            "rules": [
                ["\\s+", "/* skip whitespace */"],
                ["[0-9]{10}", "return 'UNIX';"],
                ["[0-9]{8}T[0-9]{6}", "return 'DATE';"],
                ["[0-9]+\\s(мин(ут)?ы?а?)(\\sи\\s[0-9]+\\s(секунды?а?))?", "return 'TIME';"],
                ["(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)", "return 'IP_ADDRESS'"],
                ["\\,", "return ',';"],
                ["\\{", "return '{';"],
                ["\\}", "return '}';"],
                [":", "return ':';"],
                ["\\<", "return '<';"],
                ["\\'", "return `'`;"],
                ["\\>", "return '>';"],
                ["\\(", "return '(';"],
                ["\\)", "return ')';"],
                ["\\d+", "return 'NUMBER';"],
                ["[\\w_а-яА-Я\\-\\s\\.\\?\\!\\/]+", "return 'STRING';"],
                ["$", "return 'EOF';"],
            ],
        },
        "tokens": "UNIX DATE TIME IP_ADDRESS COUNTRY STRING NUMBER < > { } ( ) , : EOF",
        "start": "LOGText",
        "bnf": {
            "expressions": [
                ["LOGText EOF", "return $1"],
                ["GEOText EOF", "return $1"],
            ],
            "LOGStatic": [
                ["UNIX DATE LOGProcess STRING LOGUserId", "$$ = { unix: parseInt($UNIX) , date: new Date($UNIX*1000), process: $LOGProcess, nickname: $STRING.trim(), id: $LOGUserId };"]
            ],
            "LOGText": [
                // common login
                ["LOGStatic GEOText", "return { ...$LOGStatic, geo: $GEOText };"],
                // user auth
                ["LOGStatic LOGContent GEOText", "return { ...$LOGStatic, content: { auth: { username: $LOGContent.message, ...$2 }}, geo: $4 };"],
                // with content
                ["LOGStatic LOGContent", "return { ...$LOGStatic, content: $LOGContent };"],
                ["LOGStatic", "return $$;"]
            ],
            "LOGProcess": [
                ["< STRING >", "$$ = $1 + $2 + $3;"]
            ],
            "LOGUserId": [
                ["( NUMBER )", "$$ = parseInt($2);"]
            ],
            "LOGContent": [
                ["' LOGMessage '", "$$ = { message: $2 };"],
                ["TIME", "$$ = { time: $1 };"],
                ["STRING LOGUserId ' STRING '", "$$ = { op: $1.trim(), oid: $LOGUserId, weapon: $4 };"],
                ["STRING", "$$ = { message: $1 };"],
            ],
            "LOGMessage": [
                ["STRING", "$$ = $1;"],
                ["STRING , LOGMessage", "$$ = [$1, $2, $3].join();"],
            ],
            "GEOText": [ 
                ["GEOValue EOF", "$$ = $1;"],
             ],    
            "GEOValue": [
                ["GEOObject", "$$ = $1;"],
            ],
            "GEOElementName": [ "STRING" ],
            "GEOElement": [
                ["GEOElementName : IP_ADDRESS", "$$ = { [$GEOElementName] : $3.trim() };"],
                ["GEOElementName : STRING", "$$ = { [$GEOElementName] : $3.trim() };"],
                ["GEOElementName : GEOText", "$$ = $3;"]
            ],
            "GEOCountry": [ 
                ["STRING", "$$ = $1;"],
            ],
            "GEOElementList": [
                ["GEOElement", "$$ = $1;"],
                ["GEOElement , GEOElementList", "$$ = { ...$GEOElement, ...$GEOElementList };"]
            ],
            "GEOObject": [
                ["{ GEOCountry , GEOElementList }", "$$ = { country: $GEOCountry, ...$GEOElementList };"],
            ],
        },
    };

    private _engine;

    
    constructor() {
        this._engine = new (require('jison')).Parser(this._grammar, {
            type: "slr",
        });
    }
    
    private _toUTF8(value: string | Buffer): string {
        const result = typeof value === 'string' ? iconv.encode(this._decodeWIN1251toString(Buffer.from(value, 'binary')), 'utf8')
                                                 : iconv.encode(this._decodeWIN1251toString(value), 'utf8');
        return result.toString();
    }

    private _decodeWIN1251toString(buffer: Buffer): string {
        return iconv.decode(buffer, 'win1251');
    }

    public parse(input: Buffer): ILogLine {
        const utf8 = this._toUTF8(input).replace(/\r?\n|\r/g, '');
        return this._engine.parse(utf8) as ILogLine;
    }
}