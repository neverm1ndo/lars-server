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
                Logger.log('error', 'Cant scan directory', err);
              } else {
                subscriber.next(files[files.length]);
              };
            });
        });
  public result$: Observable<Buffer>;
  public watcher: any = chokidar.watch(process.env.LOGS_PATH!, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true
  });
  constructor() {
    this.result$ = new Observable<Buffer>((subscriber) => {
      if (this.watcher) {
        this.watcher.on('change', ( filepath: string ) => {
          fs.readFile(path.resolve(process.cwd(), filepath), (err, data) => {
            if (err) {
              Logger.log('error', err)
            } else {
              let split = data.toString().split('\n');
              subscriber.next(Buffer.from(split[split.length - 2], 'binary'));
            }
          });
        });
      }
    });
  }
}
