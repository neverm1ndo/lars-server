import fs from 'fs';
import path from 'path';

export class Logger {
  constructor() {}
  private static writeToFile(args: any[]) {
    const now = new Date;
    const timestamp = `[${now.getHours}:${now.getMinutes}:${now.getSeconds}]`;
    const logpath = path.join(__dirname + './lolgs/' + now.getFullYear + now.getMonth + now.getDay  + '.liblog');
    new Promise((resolve, reject) => {
      fs.access(logpath, fs.constants.F_OK, (err: NodeJS.ErrnoException | null) => {
        if (err) reject(false);
        else resolve(true);
      })
    }).then(() => {
      fs.open(logpath, 'a', 666, (err: NodeJS.ErrnoException | null, id: number) => {
        if (err) return;
        fs.write(id, timestamp + args.join() + ' \n', null, 'utf8', (err: NodeJS.ErrnoException | null) => {
          if (err) return;
        });
      });
    }).catch(() => {
      fs.writeFile(logpath, timestamp + args.join() + ' \n', 'utf8', (err: NodeJS.ErrnoException | null) => {
        if (err) return;
      });
    });
  }
  public static log(...args: any[]) {
    args.forEach((arg: any) => {
      process.stdout.write(arg + ' ');
    });
    this.writeToFile(args);
    process.stdout.write('\n');
  }
}
