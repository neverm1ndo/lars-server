import * as fs from 'fs';
import * as path from 'path';

import { Observable, bindNodeCallback } from 'rxjs';
import { map } from 'rxjs/operators';
import mongoose, { Schema } from 'mongoose';

import { LogLine } from './interfaces/logline';
import { GeoData } from './interfaces/geodata';
import { Logger } from './logger';

const LOG_LINE = mongoose.model( 'LogLine', new Schema ({
  unix: { type: Number, required: true },
  date: { type: String, required: true },
  process: { type: String, required: true },
  nickname: { type: String },
  id: { type: Number },
  geo: {
    country: { type: String },
    cc: { type: String },
    ip: { type: String },
    as: { type: Number },
    ss: { type: String },
    org: { type: String },
    c: { type: String }
  }
}));

export class Parser {
  path: string;

  _readFile: any = bindNodeCallback(fs.readFile);
  _watchFile: any = bindNodeCallback(fs.watch);
  _result: Observable<Buffer>;
  _watchdog: Observable<any>;

  constructor(options: any) {
    this.path = options.path;
    this._watchdog = this._watchFile(this.path);
    this._result = this._readFile(this.path, { encoding: 'utf8' });

    mongoose.connect("mongodb://localhost:27017/libertylogs", { useNewUrlParser: true, useUnifiedTopology: true });
    this._result.pipe(
      map(val => val.toString())
    ).subscribe((x: string) => {
      this.parse(x).forEach((line: LogLine) => {
        let l = new LOG_LINE(line);
        l.save().then(() => { Logger.log('Line', line.process, 'saved') });
      })
    });
  }

  lastFile$(): Observable<string> {
    return new Observable((sub) => {
      fs.readdir(path.join(__dirname, './logs'), (err: any, files: string[]) => {
      if (err) sub.error('ERROR: Cant scan directory');
      else sub.next(files[files.length]);
      });
    })
  }

  parseGeo(line: string): GeoData | undefined { // FIXME: Тут надо как-то поэлегантнее
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

  processor() {}

  parse(textplane: string): LogLine[] {
    let lines: string[] = [];
    let parsed: LogLine[] = [];
    lines = textplane.split('\n');
    lines.forEach((line: string) => {
      let splits = line.split(' ');
      parsed.push({
          unix: +splits[0],
          date: splits[1],
          process: splits[2],
          nickname: splits[3],
          id: +splits[4].split('\d')[0],
          geo: this.parseGeo(line)
      });
    });
    return parsed;
  }
};
