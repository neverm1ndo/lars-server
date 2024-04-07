import { ChildProcess, SpawnOptionsWithoutStdio, spawn } from 'child_process';

import path from 'path';
import * as PlatformUtilities from './platform-utilities';

import { CommonErrors } from '@shared/constants';
import { ErrorCode } from '@enums/error.codes.enum';
import { logger } from '@shared/logger';

const LOG_MESSAGES = {
    CHECK_INSTANCE  : 'Checking server instance',
    EXISTS_WITH_PID : 'Server exists with pid',
    SERVER_IS_DOWN  : 'Server is down',
    KILLING         : 'Killing',
    KILLED          : 'Killed',
    EXIT            : 'Exit',
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

    private preventReboot: boolean = false;

    private __subprocesses: Map<string, ChildProcess> = new Map();

    constructor() {    
        if (!this._isSupportedPlatform(process.platform)) return;

        this._stdout(LOG_MESSAGES.CHECK_INSTANCE);
        this.__getProcessPIDbyName(this.__serverName)
            .then((pid: number | null) => {
                if (pid) return this._stdout(LOG_MESSAGES.EXISTS_WITH_PID, pid);
                this._stdout(LOG_MESSAGES.SERVER_IS_DOWN);
            })
            .catch((error: Error) => {
                this._stdout(error.message);
            });
    }

    protected _stdout(...args: unknown[]): void {
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
              pid.stdout.on('data', (data: string) => {
                resolve(parseInt(data));
              });

              pid.stderr.on('data', (data: string) => {
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
        }
    }

    public async reboot(): Promise<void> {
        const pid: number | null = await this.__getProcessPIDbyName(this.__serverName);

        try {
            if (!pid) throw new Error(CommonErrors[ErrorCode.CHILD_PROCESS_IS_NOT_EXISTS]);

            const args: string[] = [pid.toString()];
            this._stdout(LOG_MESSAGES.KILLING, pid);
            
            await this.__spawn('reboot', PlatformUtilities.LINUX.KILL, args);
                
        } catch(error) {      
            this._stdout(LOG_MESSAGES.REBOOT_ERR, error as string);
        } finally {
            console.log(LOG_MESSAGES.KILLED, pid);
            this.__subprocesses.delete('reboot');
            
            const subprocess = this.__subprocesses.get('omp');
            
            if (!subprocess) {                
                setTimeout(() => {
                    void(async () => {
                        await this.launch(); 
                    })();
                }, 3000);
            }
        }
    }

    public async launch(): Promise<void> {
        const args: string[] = [];
        const options: SpawnOptionsWithoutStdio = {
            cwd: process.env.OMP_CWD,
            detached: true,
        };

        this.preventReboot = false;

        try {
            this._stdout(LOG_MESSAGES.LAUNCHING);
            const pid: number | null = await this.__getProcessPIDbyName(this.__serverName);
            
            if (pid) {
            throw new Error(CommonErrors[ErrorCode.CHILD_PROCESS_ALREADY_SERVED]);
            }

            const awake = await this.__spawn('omp', path.join(process.env.OMP_CWD as string, PlatformUtilities.LINUX.OMP), args, options);

            if (!awake) throw new Error(CommonErrors[ErrorCode.CHILD_PROCESS_CANT_SERVE]);

            this._stdout(LOG_MESSAGES.LAUNCHED);

            const subprocess = this.__subprocesses.get('omp');

            subprocess?.once('close', (code) => {
                void (async() => {
                    this._stdout(LOG_MESSAGES.KILLED, subprocess.killed);
                    subprocess.removeAllListeners();
                    
                    if (subprocess.killed || this.preventReboot) {
                        return this._stdout(LOG_MESSAGES.RELAUNCH_ABORT, 'Restart prevented:', this.preventReboot);
                    }
                    
                    this._stdout(LOG_MESSAGES.RELAUNCH_REASON, code ?? 'no_code');
                    
                    await this.launch();
                })();
            });

            subprocess?.on('exit', (code) => {
                void (async () => {
                    this._stdout(LOG_MESSAGES.EXIT, code ?? 'no_code');
                    subprocess.removeAllListeners();
                    if (subprocess.killed || this.preventReboot) {
                        this._stdout(LOG_MESSAGES.KILLED, subprocess.killed, this.preventReboot);
                        return this._stdout(LOG_MESSAGES.RELAUNCH_ABORT);
                    }
                    await this.launch();
                })();
            });

        } catch (error) {
            this._stdout(LOG_MESSAGES.LAUNCH_ERR, error);
        }
    }

    public async stop(): Promise<void> {
        try {
            this.preventReboot = true;
            const subprocess = this.__subprocesses.get('omp');
            
            if (subprocess) {
                return void(subprocess.kill());
            }

            const pid = await this.__getProcessPIDbyName(this.__serverName);

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
