import fs from 'fs';
import path from 'path';

export class Logger {
  constructor() {}
  private static timestamp(now: Date): string {
    function convert(str: number) {
      const pad = '00';
      return pad.substring(0, pad.length - str.toString().length) + str.toString();
    }
    return `[${convert(now.getFullYear())}-${convert(now.getMonth())}-${convert(now.getDate())} | ${convert(now.getHours())}:${convert(now.getMinutes())}:${convert(now.getSeconds())}] `;
  }
  private static writeToFile(args: any[]): void {
    const now = new Date;
    const dirpath = path.join(__dirname + '/DIARY');
    const logpath = path.join(__dirname + '/DIARY/LIBLOG' + now.getFullYear() + now.getMonth() + now.getDay()  + '.liblog');
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
  public static log(...args: any[]): void {
    const now = new Date;
    process.stdout.write(' \x1b[1m' + this.timestamp(now) + '\x1b[0m');
    args.forEach((arg: any) => {
      process.stdout.write(arg + ' ');
    });
    this.writeToFile(args);
    process.stdout.write('\x1b[0m\n');
  }
  public static error(...args: any[]): void {
    const now = new Date;
    process.stdout.write(' \x1b[1m' + this.timestamp(now) + '\x1b[0m\x1b[31m[ERROR]');
    args.forEach((arg: any) => {
      process.stdout.write(arg + ' ');
    });
    this.writeToFile(args);
    process.stdout.write('\x1b[0m\n');
  }
  public static warn(...args: any[]): void {
    const now = new Date;
    process.stdout.write(' \x1b[1m' + this.timestamp(now) + '\x1b[0m\x1b[33m[WARNING]');
    args.forEach((arg: any) => {
      process.stdout.write(arg + ' ');
    });
    this.writeToFile(args);
    process.stdout.write('\x1b[0m\n');
  }
}
