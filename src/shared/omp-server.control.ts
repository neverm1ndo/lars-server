import { ChildProcess, SpawnOptionsWithoutStdio, spawn } from 'child_process';
import { CommonErrors, logger } from '@shared/constants';
import { ErrorCode } from '@enums/error.codes.enum';
import path from 'path';

namespace PlatformUtilities {
  export const LINUX = {
    PKILL   : 'pkill',
    KILL    : 'kill',
    KILLALL : 'killall',
    CMD     : 'bash',
    OMP     : 'omp-server',
    NOHUP   : 'nohup',
    PIDOF   : 'pidof',
  };
  export const WIN32 = {
    CMD     : 'pwsh.exe',
  }
}

const LOG_MESSAGES = {
  CHECK_INSTANCE  : 'Checking server instance',
  EXISTS_WITH_PID : 'Server exists with pid',
  SERVER_IS_DOWN  : 'Server is down',
  KILLING         : 'Killing',
  KILLED          : 'Killed',
  LAUNCHING       : 'Launching server child process',
  LAUNCHED        : 'Launched',
  LAUNCH_ERR      : 'Launch error',
  REBOOT_ERR      : 'Reboot error',
  RELAUNCH        : 'Relaunch',
  RELAUNCH_ABORT  : 'Realaunch aborted',
  RELAUNCH_REASON : 'Realaunch aborted',
  STOP_ERR        : 'Stop child process error',
  STOPED          : 'Stoped',
  PLATFORM_IS_NOT_SUPPORTED: 'Platform is not supprted'
};
export class OMPServerControl {

  private readonly __serverName: string = 'omp-server';
  
  private __subprocesses: Map<string, ChildProcess> = new Map();

  constructor() {    
    if (!this._isSupportedPlatform(process.platform)) return;
    
    this._stdout(LOG_MESSAGES.CHECK_INSTANCE);
    this.__getProcessPIDbyName(this.__serverName)
        .then((pid: number | null) => {
          if (pid) return this._stdout(LOG_MESSAGES.EXISTS_WITH_PID, pid);
          this._stdout(LOG_MESSAGES.SERVER_IS_DOWN);
        })
        .catch((error) => {
          this._stdout(error.message);
        });
  }

  protected _stdout(...args: any[]): void {
    logger.log('[OMP]', ...args);
  }

  private _isSupportedPlatform(platform: NodeJS.Platform): boolean {
    return platform === 'linux';
  }

  private async __getProcessPIDbyName(name: string): Promise<number | null> {

      const cmd = process.platform === 'linux' ? PlatformUtilities.LINUX.PIDOF
                                               : PlatformUtilities.WIN32.CMD;

      return new Promise((resolve, reject) => {
        const pid = spawn(cmd, [name]);
              pid.stdout.on('data', (data: any) => {
                resolve(parseInt(data));
              });
              pid.stderr.on('data', (data: any) => {
                reject(data);
              });
              pid.on('close', () => {
                resolve(null);
              });
      });
  }

  private async __spawn(name: string, cmd: string, args: string[], options?: SpawnOptionsWithoutStdio): Promise<any> {
    return new Promise((resolve, reject) => {
      const subprocess: ChildProcess = spawn(cmd, args, options);
            subprocess.stdout?.on('data', (chunk: any) => {
              resolve(chunk);
            });
            subprocess.on('close', (code : any) => {
              reject(code);
            });
            subprocess.stderr?.on('data', (chunk: any) => {
              reject(chunk);
            });
            subprocess.on('error', (code : any) => {
              console.error(code);
              reject(`exit:${code} ${subprocess.exitCode}`);
            });
      this.__subprocesses.set(name, subprocess);
    });
  }

  public async getServerStatus(): Promise<boolean> {
    try {
      const pid: number | null = await this.__getProcessPIDbyName(this.__serverName);
      return pid ? true : false;
    } catch (code) {
      return false;
    };
  }

  public async reboot(): Promise<void> {
    const pid: number | null = await this.__getProcessPIDbyName(this.__serverName);
    
    try {
     
      if (!pid) throw new Error(CommonErrors[ErrorCode.CHILD_PROCESS_IS_NOT_EXISTS]);
 
      const args: string[] = [pid.toString()];
      this._stdout(LOG_MESSAGES.KILLING, pid);
      
      await this.__spawn('reboot', PlatformUtilities.LINUX.KILL, args);
         
    } catch(error) {      
      this._stdout(LOG_MESSAGES.REBOOT_ERR, error);
    } finally {
      console.log(LOG_MESSAGES.KILLED, pid);
      this.__subprocesses.delete('reboot');
      
      const subprocess = this.__subprocesses.get('omp');
      if (subprocess) return;
      setTimeout(() => { 
        this.launch(); 
      }, 3000);
    }
  }

  public async launch(): Promise<void> {
    const args: string[] = [];
    const options: SpawnOptionsWithoutStdio = {
      cwd: process.env.OMP_CWD,
      detached: true,
    };

    try {
      this._stdout(LOG_MESSAGES.LAUNCHING);
      const pid: number | null = await this.__getProcessPIDbyName(this.__serverName);
      
      if (pid) {
        throw new Error(CommonErrors[ErrorCode.CHILD_PROCESS_ALREADY_SERVED]);
      }
    
      const awake = await this.__spawn('omp', path.join(process.env.OMP_CWD as string, PlatformUtilities.LINUX.OMP), args, options);

      if (!awake) throw new Error(CommonErrors[ErrorCode.CHILD_PROCESS_CANT_SERVE]);

      this._stdout(LOG_MESSAGES.LAUNCHED)

      const subprocess = this.__subprocesses.get('omp');
      
      subprocess?.once('close', async (code) => {
        this._stdout(LOG_MESSAGES.KILLED, subprocess.killed);
        if (subprocess.killed) {
          return this._stdout(LOG_MESSAGES.RELAUNCH_ABORT);
        }
        this._stdout(LOG_MESSAGES.RELAUNCH_REASON, code);
        await this.launch();
      });

    } catch (error) {
      this._stdout(LOG_MESSAGES.LAUNCH_ERR, error);
    }
  }

  public async stop(): Promise<void> {
    try {
      const subprocess = this.__subprocesses.get('omp');
      
      if (subprocess) {
        return void(subprocess.kill());
      }

      const pid = this.__getProcessPIDbyName(this.__serverName);

      if (!pid) throw new Error(CommonErrors[ErrorCode.CHILD_PROCESS_IS_NOT_EXISTS]);
      await this.__spawn('stop', PlatformUtilities.LINUX.KILL, ['-15', pid.toString()]);
      
    } catch (error) {
      this._stdout(LOG_MESSAGES.STOP_ERR, error);
    } finally {
      this.__subprocesses.clear();
      this._stdout(LOG_MESSAGES.STOPED)
    }
  }
}
