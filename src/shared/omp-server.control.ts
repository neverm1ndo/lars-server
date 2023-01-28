import { ChildProcess, ExecException, SpawnOptionsWithoutStdio, exec, spawn } from 'child_process';
import { CommonErrors } from '@shared/constants';
import { ErrorCode } from '@enums/error.codes.enum';
import { io } from '../index';
import { ANSItoUTF8 } from './functions';

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
}
export class OMPServerControl {

  constructor() {
    console.log('[OMP] Checking server instance existance')
    this.__getProcessPIDbyName(this.__serverName)
        .then((pid: number) => {
          console.log('[OMP] server existing with pid', pid);
        })
        .catch((error) => {
          console.error(error);
        });
  }
  
  private readonly __serverName: string = 'omp-server';

  private __subprocesses: Map<string, ChildProcess> = new Map();

  private __isTrueStdout(stdout: string): boolean {
    return stdout.trim() === 'true';
  }

  private async __getProcessPIDbyName(name: string): Promise<number> {
      return new Promise((resolve, reject) => {
        const pid = spawn(PlatformUtilities.LINUX.PIDOF, [this.__serverName]);
              pid.stdout.on('data', (data: any) => {
                resolve(parseInt(data));
              });
              pid.stderr.on('data', (data: any) => {
                reject(data);
              });
      });
  }


  private async __spawn(name: string, cmd: string, args: string[], options?: SpawnOptionsWithoutStdio): Promise<any> {
    const subprocess: ChildProcess = spawn(cmd, args, options);
    return new Promise((resolve, reject) => {
            subprocess.stdout?.on('data', (chunk: any) => {
              resolve(ANSItoUTF8(chunk).toString());
            });
            subprocess.on('close', (code : any) => {
              reject(code);
            });
            subprocess.on('error', (code : any) => {
              console.error(code);
              reject(code);
            });
            subprocess.stderr?.on('data', (chunk: any) => {
              reject(chunk);
            });
      this.__subprocesses.set(name, subprocess);
    });
  }

  get status(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      exec(process.env.GET_SERVER_STATE!, (err: ExecException | null, stdout: string, stderr: string) => {
        if (err) return void(reject(err));
        if (stderr) return void(reject(stderr));
        
        resolve(this.__isTrueStdout(stdout));
      });
    });
  }

  public async reboot(): Promise<void> {
    try {
      const pid: number = await this.__getProcessPIDbyName(this.__serverName);
      
      const args: string[] = [pid.toString()];
      console.log('[OMP] Killing', pid);
      
      const subprocess = await this.__spawn('reboot', PlatformUtilities.LINUX.KILL, args);
            subprocess.stdout?.on('data', (chunk: Buffer) => {
              console.log(chunk.toString())
            });
            subprocess.on('close', (code: any) => {
              console.log(` - reboot close : child process exited with code ${code}`);
            });

      console.log('[OMP] Killed', pid);
    } catch(error) {
      console.error(error);
    } finally {
      this.__subprocesses.delete('reboot');
    } 
  }

  public async launch(): Promise<void> {
    const args: string[] = [PlatformUtilities.LINUX.OMP];
    const options: SpawnOptionsWithoutStdio = {
      cwd: process.env.OMP_CWD,
      detached: true,
    };

    try {
      console.log('[OMP] Launching server...')
      const pid: number = await this.__getProcessPIDbyName(this.__serverName);
      
      if (pid) {
        console.log('[OMP] Found PID', pid);
        return void(console.error(new Error(CommonErrors[ErrorCode.CHILD_PROCESS_ALREADY_SERVED])));
      }
      
      console.log('[OMP] Launching server...')
      await this.__spawn('omp', PlatformUtilities.LINUX.NOHUP, args, options);

    } catch (error) {
      console.error(error);
    }
  }

  public async stop() {
    try {
      if (!this.__subprocesses.has('omp')) throw new Error(CommonErrors[ErrorCode.CHILD_PROCESS_IS_NOT_EXISTS]);
      
      const subprocess = this.__subprocesses.get('omp');

      let killed: boolean = false;

      if (subprocess) killed = subprocess.kill();
      
      if (!killed) throw new Error('Error code:' + ErrorCode.CHILD_PROCESS_CANT_KILL);
      
    } catch (error) {
      console.log(error);
      
      const pid = this.__getProcessPIDbyName(this.__serverName);
      await this.__spawn('stop', PlatformUtilities.LINUX.KILL, ['-15', pid.toString()]);
      return;
    }
  }
}
