import fs from 'fs';
import path from 'path';
import { EOL } from 'os';

export class Logger {

    constructor(
       public dirpath: string, 
       private _extension: string
    ) {}

    private _writeStream: fs.WriteStream = this._createNewWriteStream();

    private _date?: string;

    private get _currentFileName(): string {
        const timestamp: string[] = this._createNowTimestamp();
        let filename: string = '';
        for (let index = 3; index < timestamp.length; index++) {
            filename+=timestamp[index];
        }
        return `${filename}.${this._extension}`;
    }

    private get _currentFilePath(): string {
        return path.join(this.dirpath, this._currentFileName);
    }

    private _createNowTimestamp(): string[] {
        const now: Date = new Date();

        return [
            now.getSeconds(),
            now.getMinutes(),
            now.getHours(),
            now.getDate(),
            now.getMonth() + 1,
            now.getFullYear(),
        ].map((num: number) => this._padNumber('0', num));
    }

    private _padNumber(pad: string, num: number) {
        const str: string = num.toString();
        return str.padStart(2, pad);
    }

    private _formatTimestamp([seconds, minutes, hours, date, month, year]: string[]) {
        return `[${hours}:${minutes}:${seconds}-${date}/${month}/${year}]`;
    }

    private _createNewWriteStream(): fs.WriteStream {
        return fs.createWriteStream(this._currentFilePath, { flags: 'a' });
    }

    private _switchToTheNextFile() {
        this._writeStream.end();
        this._writeStream = this._createNewWriteStream();
    }

    private _handleWriteStreamError(err: Error): void {
        err.message = '[LOGGER_ERR]' + err.message;
        fs.writeFile(this._currentFilePath, err.message, () => {
            console.error(err);
        });
    }

    public log(...args: any[]): void {
        const [seconds, minutes, hours, date, month, year]: string[] = this._createNowTimestamp();

        if (this._date !== date) {
            this._switchToTheNextFile();
            this._date = date;
        }

        try {
            for (let i = 0; i < args.length - 1; i++) {
                args[i] = args[i].toString();
            }
        } catch(err) {
            console.error(err);
        }

        let str: string = [this._formatTimestamp([seconds, minutes, hours, date, month, year]), ...args].join(' ');
            str += EOL;
        
        process.stdout.write(str);
        
        this._writeStream.write(str, (err: Error | null | undefined) => {
            if (err) {
                void this._handleWriteStreamError(err);
            }
        });
    }

    public err(...args: any[]): void {
        for (let i = 0; i < args.length - 1; i++) {
            let arg = args[i];
            if (arg instanceof Error) {
                arg = arg.message + EOL + arg.stack;
            }
            args[i] = arg.toString();
        }
        this.log('[ERROR]', ...args);
    }

}