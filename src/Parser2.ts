import { ILogLine } from "@interfaces/logline";
import iconv from 'iconv-lite';

export class Parser2 {
    
    private _grammar = {
        "lex": {
            "macros": {
                "digit": "[0-9]",
                "esc": "\\\\",
                "int": "-?(?:[0-9]|[1-9][0-9]+)",
                "exp": "(?:[eE][-+]?[0-9]+)",
                "frac": "(?:\\.[0-9]+)"
            },
            "rules": [
                ["\\s+", "/* skip whitespace */"],
                ["[0-9]{10}", "return 'UNIX';"],
                ["[0-9]{8}T[0-9]{6}", "return 'DATE';"],
                ["((час|секунд|минут)(а|ы|ов)?)", "return 'TIME';"],
                ["(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)", "return 'IP_ADDRESS'"],
                [",", "return ',';"],
                ["\\{", "return '{';"],
                ["\\}", "return '}';"],
                [":", "return ':';"],
                ["\\<", "return '<';"],
                ["\\/", "return '/';"],
                ["\\>", "return '>';"],
                ["\\(", "return '(';"],
                ["\\)", "return ')';"],
                ["[0-9]\\.[0-9](\\.|[a-zA-Z]+)\\.?[0-9]?([a-zA-Z]+)?\\.?([A-Z]+)?(\\-[a-zA-Z0-9]+)?", "return 'CLI';"],
                ["[0-9A-Z]{40}", "return 'SS';"],
                ["{int}{frac}?\\b", "return 'NUMBER';"],
                ["\'(?:\\\\[\"bfnrt/\\\\]|\\\\u[a-fA-F0-9]{4}|[^\"\\\\])*\'", "yytext = yytext.substr(1,yyleng-2); return 'MESSAGE';"],
                ["из", "return 'WITH'"],
                ["и", "return 'AND'"],
                ["(?=.*[a-zA-Zа-яА-Я])(?=.*[0-9])[a-zA-Zа-яА-Я0-9\\_\\!\\?\\.\\-\\s\\[\\]\\|]+|[a-zA-Zа-яА-Я_\\.\\-]+", "return 'STRING';"],
                ["[a-zA-Za-яА-Я0-9_\[\]@#\$\(\)\\!|\.]{1,18}?(?=\\s)\\b", "return 'NICKNAME';"],
                ["$", "return 'EOF';"],
            ],
        },
        "tokens": "UNIX DATE TIME IP_ADDRESS COUNTRY CLI SS NUMBER MESSAGE STRING NICKNAME WITH AND < / > { } ( ) , : EOF",
        "start": "LOGText",
        "bnf": {
            "expressions": [
                ["LOGText EOF", "return $1"],
                ["GEOText EOF", "return $1"],
            ],
            "LOGStatic": [
                ["UNIX DATE LOGProcess STRING LOGUserId", "$$ = { unix: parseInt($UNIX) , date: new Date($UNIX*1000), process: $LOGProcess, nickname: $STRING.trim(), id: $LOGUserId };"],
                ["UNIX DATE LOGProcess STRING", "$$ = { unix: parseInt($UNIX) , date: new Date($UNIX*1000), process: $LOGProcess, nickname: $STRING.trim(), id: undefined };"],
                // ["UNIX DATE LOGProcess NICKNAME", "$$ = { unix: parseInt($UNIX) , date: new Date($UNIX*1000), process: $LOGProcess, nickname: $NICKNAME.trim(), id: undefined };"],
            ],
            "LOGText": [
                // common login
                ["LOGStatic GEOText", "return { ...$LOGStatic, geo: $GEOText };"],
                ["LOGStatic { GEOElementList }", "return { ...$LOGStatic, content: $GEOElementList };"],
                // user auth
                ["LOGStatic MESSAGE GEOText", "return { ...$LOGStatic, content: { auth: { username: $MESSAGE }}, geo: $GEOText };"],
                ["LOGStatic GEOElement MESSAGE GEOText", "return { ...$LOGStatic, content: { auth: { username: $MESSAGE, ...$GEOElement }}, geo: $GEOText };"],
                // with content
                ["LOGStatic LOGContent", "return { ...$LOGStatic, content: $LOGContent };"],
                ["LOGStatic GEOElement", "return { ...$LOGStatic, content: { props: $GEOElement }};"],
                ["LOGStatic GEOElement MESSAGE", "return { ...$LOGStatic, content: { props: $GEOElement , message: $MESSAGE }};"],
                ["LOGStatic", "return $$;"]
            ],
            "LOGProcess": [
                ["< LOGProcessElement >", "$$ = [$1,...$2, $3].join('');"]
            ],
            "LOGProcessElement": [
                ["STRING", "$$ = $1;"],
                ["STRING / LOGProcessElement", "$$ = [$1,...$2, $3].join('');"],
            ],
            "LOGUserId": [
                ["( NUMBER )", "$$ = parseInt($2);"]
            ],
            "LOGContent": [
                ["LOGContentTime", "$$ = $1;"],
                ["MESSAGE", "$$ = { message: $1 };"], // common message
                ["LOGContentNumberTuple", "$$ = { numbers: $1 };"],
                ["LOGContentStringTuple", "$$ = { message: $1.join(' ') };"],
                ["STRING LOGUserId", "$$ = { target: { id: $2, username: $1.trim() }};"],
                ["STRING LOGUserId WITH MESSAGE", "$$ = { op: $1.trim(), oid: $LOGUserId, message: $MESSAGE };"], // kills deaths
                ["STRING LOGUserId STRING", "$$ = { targetType: $3, target: { id: $2, username: $1.trim() }};"],
                ["STRING LOGUserId MESSAGE", "$$ = { op: $1.trim(), oid: $LOGUserId, message: $MESSAGE };"], // kicks bans
            ],
            "TimeExpression": [
                ['TimeExpressionUnit','$$ = $1'],
                ['TimeExpressionUnit , TimeExpression', "$$ = [$1, $3].join(' ')"],
            ],
            "TimeExpressionUnit": [
                ['NUMBER TIME', "$$ = [$NUMBER, $TIME].join(' ')"],
                ['NUMBER TIME AND NUMBER TIME', "$$ = [$1, $2, $4, $5].join(' ');"]
            ],
            "LOGContentTime": [
                ["TimeExpression", "$$ = { time: $$ };"], // afk pause time
                ["TimeExpression MESSAGE", "$$ = { time: $1, message: $2 };"], // hand mutes
            ],
            "LOGContentNumberTuple": [
                ["NUMBER", "$$ = [parseFloat($1)];"],
                ["NUMBER LOGContentNumberTuple", "$$ = [parseFloat($1), ...$2];"]
            ],
            "LOGContentStringTuple": [
                ["STRING", "$$ = [$1];"],
                ["STRING LOGContentStringTuple", "$$ = [...$1, ...$2];"]
            ],
            "GEOText": [ 
                ["GEOValue EOF", "$$ = $1;"],
             ],    
            "GEOValue": [
                ["GEOObject", "$$ = $1;"],
            ],
            "GEOElementName": [ "STRING" ],
            "GEOElement": [
                ["GEOElementName : GEOElementValue", "$$ = { [$GEOElementName] : $3 };"],
                ["GEOElementName : GEOText", "$$ = $3;"]
            ],
            "GEOElementValue": [
                ['IP_ADDRESS', '$$ = $1;'],
                ['SS', '$$ = $1;'],
                ['STRING', '$$ = $1.trim();'],
                ['CLI', '$$ = $1;'],
                ['NUMBER', '$$ = parseFloat($1);'],
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
    private _encode = true; 

    
    constructor(encode?: boolean) {
        this._engine = new (require('jison')).Parser(this._grammar, {
            type: "slr",
        });
        // this._engine = require('./parser/log/log.parser.js');
        if (encode !== undefined) this._encode = encode;
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
        const utf8: string = this._toUTF8(input).replace(/\r?\n|\r/g, '');
        return this._engine.parse(this._encode ? utf8 : input.toString()) as ILogLine;
    }
}

new Parser2();