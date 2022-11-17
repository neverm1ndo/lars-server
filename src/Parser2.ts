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
                ["[0-9a-zA-Z_\\s\\-\\.\\/]+", "return 'STRING';"],
                ["\\{", "return '{';"],
                ["\\}", "return '}';"],
                [",", "return ',';"],
                [":", "return ':';"],
                ["\\<", "return '<';"],
                ["\\'", "return `'`;"],
                ["\\>", "return '>';"],
                ["\\(", "return '(';"],
                ["\\)", "return ')';"],
                ["$", "return 'EOF';"],
            ],
        },
        "tokens": "UNIX DATE TIME STRING NUMBER < > { } ( ) , : EOF",
        "start": "LOGText",
        "bnf": {
            "expressions": [
                ["LOGText EOF", "return $1"],
                ["GEOText EOF", "return $1"],
            ],
            "LOGStatic": [
                ["UNIX DATE LOGProcess STRING LOGUserId", "$$ = { unix: parseInt($UNIX) , date: $DATE, process: $LOGProcess, nickname: $STRING.trim(), id: $LOGUserId };"]
            ],
            "LOGText": [
                // common login
                ["LOGStatic GEOText", "return { ...$LOGStatic, geo: $GEOText };"],
                // user auth
                ["LOGStatic GEOElement LOGContent GEOText", "return { ...$LOGStatic, content: { auth: $LOGContent, ...$GEOElement }, geo: $GEOText };"],
                // with content
                ["LOGStatic LOGContent", "return { ...$LOGStatic, content: $LOGContent };"],
                ["LOGStatic", "return $$;"]
            ],
            "LOGProcess": [
                ["< STRING >", "$$ = $1 + $2 + $3;"]
            ],
            "LOGUserId": [
                ["( STRING )", "$$ = parseInt($2);"]
            ],
            "LOGContent": [
                ["' STRING '", "$$ = { message: $2 };"],
                ["TIME", "$$ = { time: $1 };"],
                ["GEOElement", "$$ = $1;"],
                ["STRING LOGUserId ' STRING '", "$$ = { op: $1.trim(), oid: $LOGUserId, weapon: $4 };"],
                ["STRING", "$$ = { message: $1 };"],
            ],
            "GEOText": [ 
                ["GEOValue EOF", "$$ = $1;"],
             ],
            
            "GEOValue": [
                ["GEOObject", "$$ = $1;"]
            ],
            "GEOElementName": [ "STRING" ],
            "GEOElement": [
                ["GEOElementName : STRING", "$$ = { [$GEOElementName] : $3.trim() };"],
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
        return this._engine.parse(this._toUTF8(input)) as ILogLine;
    }
}