import { execFile, exec } from 'child_process';
import { statsman } from '@shared/constants';

export class SampServerControl {

  constructor() {}

  get status(): Promise<any> {
    return new Promise((resolve, reject) => {
      exec('bash /home/nmnd/get.server.state.sh', (err: any, stdout: any) => {
        if (err) reject(err);
        resolve(stdout.includes(true));
      });
    })
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
          // statsman.request('svr.gta-liberty.ru', 7777, 'i').then((players: number) => {
          //   statsman.snapshot = players;
          //   resolve(stdout);
          // }).catch((err) => {
          //   console.error(err);
          //   reject(err);
          // });
          resolve(stdout);
        }, 8000);
      });
    });
  }
  public launch(): Promise<void> {
    return new Promise((resolve, reject) => {
      exec(`bash /home/nmnd/starter.sh`, (err: any) => {
        if (err) reject(err);
        setTimeout(() => {
          resolve();
        }, 10000);
      });
    })
  }
  public stop() {
    return new Promise((resolve, reject) => {
      exec('bash /home/nmnd/killer.sh', (err: any, stdout: any) => {
        if (err) reject(err);
        statsman.snapshot = 0;
        resolve(stdout);
      });
    });
  }
}
