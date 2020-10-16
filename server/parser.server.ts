import * as fs from 'fs';
import * as path from 'path';

import { Observable, bindNodeCallback } from 'rxjs';

import { LogLine } from './interfaces/logline';
import { GeoData } from './interfaces/geodata';
import { Logger } from './logger';

export class Parser {
  private path: string;
  private _readFile: any = bindNodeCallback(fs.readFile);
  private _watchFile: any = bindNodeCallback(fs.watch);
  public result$: Observable<Buffer>;
  public watchdog$: Observable<any>;
  public lastFile$: Observable<string> = new Observable((subscriber) => {
              fs.readdir(path.join(__dirname, './logs'), (err: any, files: string[]) => {
              if (err) {
                subscriber.error('Cant scan directory');
                Logger.error('Cant scan directory', err);
              } else {
                subscriber.next(files[files.length]);
              };
            });
        });

  constructor(options: any) {
    this.path = options.path;
    this.watchdog$ = this._watchFile(this.path);
    this.result$ = this._readFile(this.path, { encoding: 'utf8' });
  }

  public parseGeo(line: string): GeoData | undefined { // FIXME: Тут надо как-то поэлегантнее
    let r_geodata = new RegExp('{\(.*)}');
    let r_geodata2 = new RegExp(', ');
    let unparsedgeo = line.split(r_geodata)[1];
    if (unparsedgeo) {
      let geo = unparsedgeo.split(r_geodata2);
      return {
        country: geo[0],
        cc: geo[1].split(':')[1],
        ip: geo[2].split(':')[1],
        as: +geo[3].split(':')[1],
        ss: geo[4].split(':')[1],
        org: geo[5].split(':')[1],
        c: geo[6].split(':')[1]
      };
    } else { // Нет геоданных
      return undefined;
    }
  }

  //private processor() {}

  public parse(textplane: string): LogLine[] {
    let lines: string[] = [];
    let parsed: LogLine[] = [];
    lines = textplane.split('\n');
    lines.forEach((line: string) => {
      let splits = line.split(' ');
      if (splits[0] !== '') {
        parsed.push({
          unix: +splits[0],
          date: splits[1],
          process: splits[2],
          nickname: splits[3],
          id: +splits[4].match('\[0-9]+')![0],
          geo: this.parseGeo(line)
        });
      }
    });
    return parsed;
  }
};
