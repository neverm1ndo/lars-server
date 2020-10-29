import * as fs from 'fs';
import * as path from 'path';
import chokidar from 'chokidar';
import dotenv from 'dotenv';
import { Logger } from './logger';

import { Observable } from 'rxjs';

dotenv.config({ path:path.resolve(process.cwd(), 'server/.env') });

export class Watcher {
  public lastFile$: Observable<string> = new Observable((subscriber) => {
              fs.readdir(path.join(__dirname, `./log/${new Date().getFullYear()}/09`), (err: any, files: string[]) => {
              if (err) {
                subscriber.error('Cant scan directory');
                Logger.error('Cant scan directory', err);
              } else {
                subscriber.next(files[files.length]);
              };
            });
        });
  public result$: Observable<string>;
  public watcher: any = chokidar.watch(process.env.LOGS_PATH!, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true
  });
  constructor() {
    this.result$ = new Observable<string>((subscriber) => {
      if (this.watcher) {
        this.watcher.on('change', ( filepath: string ) => {
          fs.readFile(path.resolve(process.cwd(), filepath), { encoding: 'utf8' }, (err, data) => {
            if (err) {
              Logger.error(err)
            } else {
              let split = data.split('\n');
              subscriber.next(split[split.length - 2]);
            }
          });
        });
      }
    });
  }
}
