import iconv from 'iconv-lite';
import { ILogLine } from "@interfaces/logline";

export class Parser2 {
    private _engine;
    private _encode = true; 

    constructor(encode?: boolean) {
        this._engine = require(`../dist/parser/log/log.parser.js`);
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