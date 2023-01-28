import { ChildProcess, ChildProcessWithoutNullStreams, ExecException, SpawnOptions, SpawnOptionsWithoutStdio, exec, spawn } from 'child_process';
import { CommonErrors } from '@shared/constants';
import { ErrorCode } from '@enums/error.codes.enum';
// import { debounce } from 'lodash';
import { io } from '../index';
import { ANSItoUTF8 } from './functions';

namespace PlatformUtilities {
  export const LINUX = {
    PKILL   : 'pkill',
    KILL    : 'kill',
    KILLALL : 'killall',
    CMD     : 'bash',
    OMP     : 'omp-server',
    PIDOF   : 'pidof',
  };
}
export class OMPServerControl {

  constructor() {
    this.__getProcessPIDbyName(this.__serverName)
        .then((pid: number) => {
          this.__PID = pid;
          console.log('[OMP] server existing with pid', pid);
        })
        .catch((error) => {
          console.error(error);
        })
  }

  private __PID?: number;
  
  private readonly __serverName: string = 'omp-server';

  private __subprocesses: Map<string, ChildProcess> = new Map();

  private __isTrueStdout(stdout: string): boolean {
    return stdout.trim() === 'true';
  }

  private __getSubprocessPID(subprocess: ChildProcess) {
    return subprocess.pid;
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
    return new Promise<any>((resolve, reject) => {
      const subprocess: ChildProcessWithoutNullStreams = spawn(cmd, args, options);
            subprocess.stdout.on('data', (data: any) => {
              io.to('server_log').emit('server_log', ANSItoUTF8(data).toString());
              resolve(data);
            });
            subprocess.stderr.on('data', (data) => {
              console.error(` - ${name} stderr : ${data.toString()}`);
              reject(data);
            });
            subprocess.stdout.on('close', (code: any) => {
              console.log(` - ${name} close : child process exited with code ${code}`);
              reject(code);
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

  public async reboot() {

    const args: string[] = [this.__serverName];

    // if (!this.__subprocesses.has(this.__serverName)) {
    //   try {
    //     await this.stop();
    //     await this.launch();
        
    //     return;
    //   } catch (error) {
    //     console.error(error);
    //     return;
    //   }
    // }


    try {
      await this.__spawn('reboot', PlatformUtilities.LINUX.PKILL, args);
    } catch(error) {
      console.error(error)
    } finally {
      this.__subprocesses.delete('reboot');
    } 
  }

  public async launch(): Promise<void> {
    const args: string[] = [];
    const options: SpawnOptionsWithoutStdio = {
      cwd: process.env.OMP_CWD,
      detached: true,
    };

    try {
      if (this.__subprocesses.has(this.__serverName)) throw new Error('Error:' + CommonErrors[ErrorCode.CHILD_PROCESS_ALREADY_SERVED]);
      await this.__spawn(this.__serverName, PlatformUtilities.LINUX.OMP, args, options);
      const subprocess = this.__subprocesses.get(this.__serverName)!;
      this.__PID = this.__getSubprocessPID(subprocess);
    } catch (error) {
    
      console.error(error);
      await this.launch();
    }
  }

  public async stop() {
    try {
      if (!this.__subprocesses.has(this.__serverName)) throw new Error('Error:' + CommonErrors[ErrorCode.CHILD_PROCESS_IS_NOT_EXISTS]);
      
      const subprocess = this.__subprocesses.get(this.__serverName)!;
      const killed = subprocess.kill();
      
      if (!killed) throw new Error('Error:' + ErrorCode.CHILD_PROCESS_CANT_KILL);
      
    } catch (error) {
      console.log(error);
      
      const pid = this.__getProcessPIDbyName(this.__serverName);
      await this.__spawn('stop', PlatformUtilities.LINUX.KILL, ['-15', pid.toString()]);
      return;
    }
  }
}
