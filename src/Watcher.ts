import * as fs from 'fs';
import * as path from 'path';
import chokidar from 'chokidar';
import dotenv from 'dotenv';
import bufferSplit from 'buffer-split';
import { Logger } from '@shared/Logger';
import _ from 'lodash';

import { Observable } from 'rxjs';

dotenv.config({ path:path.resolve(process.cwd(), 'server/.env') });

export class Watcher {
  private lines: number = 0;
  private _current: string = '';
  public lastFile$: Observable<string> = new Observable((subscriber) => {
              fs.readdir(path.join(__dirname, `./log/${new Date().getFullYear()}/09`), (err: any, files: string[]) => {
              if (err) {
                subscriber.error('Cant scan directory');
                Logger.log('error', 'Cant scan directory', err);
              } else {
                subscriber.next(files[files.length]);
              };
            });
        });
  public result$: Observable<Buffer>;
  public watcher: any = chokidar.watch(process.env.LOGS_PATH!, {
    ignored: /(^|[\/\\])\../,
    persistent: true
  });

  private convert(str: number): string {
    const pad = '00';
    return pad.substring(0, pad.length - str.toString().length) + str.toString();
  }

  getLogFIle() {
    const date = new Date();
    let logpath = path.join(process.env.LOGS_PATH!, this.convert(date.getMonth() + 1), `${date.getFullYear()}${this.convert(date.getMonth()+1)}${this.convert(date.getDate())}.log`);
    
    if (process.env.NODE_ENV === 'development') logpath = path.join(process.env.LOGS_PATH!, '20200931.log')
    
    fs.readFile(logpath, (err: NodeJS.ErrnoException | null, buffer: Buffer) => {
      if (err) { Logger.log('error', err) }
      const delim = Buffer.from('\n');
      const splited = bufferSplit(buffer, delim);
      this.lines = splited.length;
      this._current = logpath;
    });
  }

  constructor() {
    this.getLogFIle();
    this.result$ = new Observable<Buffer>((subscriber) => {
      if (!this.watcher) return;
      this.watcher.on('change', ( filepath: string ) => {
        if (this._current !== filepath) {
          this.lines = 0;
          this._current = filepath;
        }
        fs.readFile(path.resolve(process.cwd(), filepath), (err, buffer: Buffer) => {
          if (err) {
            Logger.log('error', err);
            return;
          } else {
            const delim = Buffer.from('\n');
            const splited = bufferSplit(buffer, delim);
            const newLines = splited.length - 1 - this.lines;
            if (splited.length > 2) {
              _.takeRight(splited, newLines + 2).forEach((line: Buffer) => {
                subscriber.next(line);
              })
            } else {
              subscriber.next(splited[0]);
            }
            this.lines = splited.length;
          }
        });
      });
    });
  }
}
