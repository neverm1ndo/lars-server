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

  public async reboot(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      let cmd: string;
      switch (process.platform) {
        case 'win32' : cmd = process.env.WIN32_PKILL!; break;
        case 'linux' : cmd = process.env.LINUX_PKILL!; break;
        default: return reject('Platform is not supported');
      };

      exec(cmd, (err: any, stdout: any) => {
        if (err) reject(err);
        statsman.snapshot = 0;
        setTimeout(() => {
          if (process.env.NODE_ENV !== 'production') return resolve(stdout.trim() === 'true');
          resolve(stdout.trim() === 'true');
        }, 8000);
      });
    });
  }

  public async launch(): Promise<void> {
    return new Promise((resolve, reject) => {
      exec(process.env.SERVER_STARTER!, (err: any, _stdout: string) => {
        if (err) reject(err);
      });
      setTimeout(() => {
        resolve();
      }, 8000);
    });
  }

  public async stop() {
    return new Promise((resolve, reject) => {
      exec(process.env.SERVER_KILLER!, (err: any, stdout: any) => {
        if (err) reject(err);
        statsman.snapshot = 0;
        resolve(stdout);
      });
    });
  }
}
