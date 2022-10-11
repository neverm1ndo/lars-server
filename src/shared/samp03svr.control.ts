import { exec } from 'child_process';
import { statsman } from '@shared/constants';

export class SampServerControl {

  constructor() {}

  get status(): Promise<any> {
    return new Promise((resolve, reject) => {
      exec(process.env.GET_SERVER_STATE!, (err: any, stdout: any) => {
        if (err) reject(err);
        resolve(stdout.trim() === 'true');
      });
    });
  }

  public reboot(): Promise<void> {
    return new Promise((resolve, reject) => {
      let cmd: string;
      switch (process.platform) {
        case 'win32' : cmd = 'taskkill /IM samp03svr.exe'; break;
        case 'linux' : cmd = 'pkill samp03svr'; break;
        default: return reject('Platform is not supported');
      };

      exec(cmd, (err: any, stdout: any) => {
        if (err) reject(err);
        statsman.snapshot = 0;
        setTimeout(() => {
          if (process.env.NODE_ENV !== 'production') return resolve();
          resolve(stdout);
        }, 8000);
      });
    });
  }

  public launch(): Promise<void> {
    return new Promise((resolve, reject) => {
      exec(process.env.SERVER_STARTER!, (err: any, _stdout: string) => {
        if (err) reject(err);
      });
      setTimeout(() => {
        resolve();
      }, 8000);
    });
  }

  public stop() {
    return new Promise((resolve, reject) => {
      exec(process.env.SERVER_KILLER!, (err: any, stdout: any) => {
        if (err) reject(err);
        statsman.snapshot = 0;
        resolve(stdout);
      });
    });
  }
}
