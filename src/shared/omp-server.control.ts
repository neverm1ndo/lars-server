import { ChildProcess, ChildProcessWithoutNullStreams, ExecException, SpawnOptions, SpawnOptionsWithoutStdio, exec, spawn } from 'child_process';
import { statsman, CommonErrors } from '@shared/constants';
import { ErrorCode } from '@enums/error.codes.enum';

enum Platform {
  UNSUPPORTED,
  WIN32 = 'win32',
  LINUX = 'linux',
}

namespace PlatformUtilities {
  export type Utilities = PlatformUtilities.LINUX | PlatformUtilities.WIN32;
  export enum LINUX {
    PKILL = 'pkill',
    CMD   = 'bash',
    OMP   = '/home/svr_sa/omp-server'
  }
  export enum WIN32 {
    PKILL = 'kill',
    CMD   = 'pwsh.exe',
    OMP   = 'omp-server.exe',
  }
}
export class OMPServerControl {
  
  private readonly __serverName: string = 'omp-server';

  private readonly __cmd: PlatformUtilities.Utilities | undefined = this.__getPlatformCmd();
  private __subprocesses: Map<string, ChildProcess> = new Map();

  private __isTrueStdout(stdout: string): boolean {
    return stdout.trim() === 'true';
  }

  private __getSubprocessPID(subprocess: ChildProcess) {
    return subprocess.pid;
  }

  private __getPlatformCmd(): PlatformUtilities.Utilities | undefined {
    switch (process.platform) {
      case Platform.WIN32 : return PlatformUtilities.WIN32.CMD;
      case Platform.LINUX : return PlatformUtilities.LINUX.CMD;
      default: return void(Platform.UNSUPPORTED);
    };
  }

  private async __spawn(name: string, cmd: PlatformUtilities.Utilities, options: string[]): Promise<any> {
    return new Promise<boolean>((resolve, reject) => {
      const subprocess: ChildProcessWithoutNullStreams = spawn(cmd, options);
            subprocess.stdout.on('data', (data: any) => {
              console.log(` - ${name} :`, data);
              resolve(data);
            });
            subprocess.stderr.on('data', (data) => {
              console.error(` - ${name} stderr : ${data}`);
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
    const options: string[] = [PlatformUtilities.LINUX.PKILL, this.__serverName];

    if (!this.__cmd) throw new Error('Error:' + CommonErrors[ErrorCode.UNSUPPORTED_PLATFORM]);

    try {
      const reboot = await this.__spawn('reboot', this.__cmd, options);
      console.log(' - reboot:', reboot);
    } catch(error) {
      console.error(error)
    } finally {
      this.__subprocesses.delete('reboot');
    }
  
  }

  public async launch(): Promise<void> {
    const options: string[] = [];

    try {
      if (this.__subprocesses.has('omp-server')) throw new Error('Error:' + CommonErrors[ErrorCode.CHILD_PROCESS_ALREADY_SERVED]);
      const subprocess = await this.__spawn('omp-server', PlatformUtilities.LINUX.OMP, options);
      this.__subprocesses.set('omp-server', subprocess);
    } catch (error) {
      console.error(error);
    }
  }

  public async stop() {
    try {
      if (!this.__subprocesses.has('omp-server')) throw new Error('Error:' + CommonErrors[ErrorCode.CHILD_PROCESS_IS_NOT_EXISTS]);
      const subprocess = this.__subprocesses.get('omp-server')!;
      const killed = subprocess.kill();

      if (!killed) throw new Error('Error:' + ErrorCode.CHILD_PROCESS_CANT_KILL);
      
    } catch (error) {
      console.log(error);
    } 
    // finally {
    //   this.__subprocesses.delete('omp-server');
    // }
  }
}
