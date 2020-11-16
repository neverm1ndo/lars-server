import fs from 'fs';
import path from 'path';

export class Logger {
  constructor() {}
  public static convert(str: number): string {
    const pad = '00';
    return pad.substring(0, pad.length - str.toString().length) + str.toString();
  }
  private static timestamp(now: Date): string {
    return `[${this.convert(now.getFullYear())}-${this.convert(now.getMonth())}-${this.convert(now.getDate())} | ${this.convert(now.getHours())}:${this.convert(now.getMinutes())}:${this.convert(now.getSeconds())}] `;
  }
  private static writeToFile(args: any[]): void {
    const now = new Date;
    const dirpath = path.join(__dirname + '/DIARY');
    const logpath = path.join(__dirname + '/DIARY/LIBLOG' + this.convert(now.getFullYear()) + this.convert(now.getMonth()) + this.convert(now.getDay())  + '.liblog');
    if (!fs.existsSync(dirpath)) {
      fs.mkdirSync(dirpath);
    }
    new Promise((resolve, reject) => {
      fs.access(logpath, fs.constants.F_OK, (err: NodeJS.ErrnoException | null) => {
        if (err) reject(false);
        else resolve(true);
      });
    }).then(() => {
      fs.open(logpath, 'a', 666, (err: NodeJS.ErrnoException | null, id: number) => {
        if (err) return err;
        fs.write(id, this.timestamp(now) + args.join(' ') + ' \n', null, 'utf8', (err: NodeJS.ErrnoException | null) => {
          if (err) return err;
        });
      });
    }).catch(() => {
      fs.writeFile(logpath, this.timestamp(now) + args.join(' ') + ' \n', 'utf8', (err: NodeJS.ErrnoException | null) => {
        if (err) return err;
      });
    });
  }
  public static log([type]: string = 'default', ...args: any[]): void {
    const now = new Date;
    process.stdout.write(' \x1b[1m' + this.timestamp(now) + '\x1b[0m');
    switch (type) {
      case 'error' : {
        process.stdout.write(' \x1b[1m' + this.timestamp(now) + '\x1b[0m\x1b[31m[ERROR]');
        break;
      }
      case 'warn' : {
        process.stdout.write(' \x1b[1m' + this.timestamp(now) + '\x1b[0m\x1b[33m[WARNING]');
        break;
      }
      default: break;
    }
    args.forEach((arg: any) => {
      process.stdout.write(arg + ' ');
    });
    this.writeToFile(args);
    process.stdout.write('\x1b[0m\n');
  }
}
