import { copy, unlink, readdir } from 'fs-extra';
import { readFile } from 'fs';
import { join } from 'path'
import { BACKUP } from '@schemas/backup.schema';
import { getMimeType } from '@shared/functions';
import { parser } from '@shared/constants';

export type BackupAction = 'delete' | 'change';

export default class Backuper {
  constructor() {}
  static backup(path: string, user: any, action: BackupAction): Promise<any> {
    const pathsplit = path.split(new RegExp(/(\/|\\)/g));
    const filename = pathsplit[pathsplit.length - 1].split('.')[0];
    const ext = pathsplit[pathsplit.length - 1].replace(new RegExp(/(.*)\./), '');
    const unix = Date.now();
    const copyFile: Promise<void> = new Promise((res, rej) => {
      return copy(path, join(process.env.BACKUPS_PATH!, `${pathsplit[pathsplit.length - 1]}_${unix}`), (err) => {
          return (!!err ? rej(err) : res());
      });
    })
    const isBinary = ((ext: string): boolean => {
      const mime = getMimeType(ext);
      switch (mime) {
        case 'application/x-sharedlib': return true;
        case 'application/octet-stream': return true;
        default: return false;
      }
    })(ext);
    let backup = new BACKUP({
      unix,
      date: new Date(unix),
      expires: new Date(unix + 604800000),
      action,
      user: {
        nickname: user.user,
        group_id: user.group_id,
        avatar: user.avatar
      },
      file: {
        path,
        name: pathsplit[pathsplit.length - 1],
        mime: getMimeType(filename+'.'+ext),
        binary: isBinary
      }
    });
    return Promise.all([copyFile, backup.save()])
  }
  static restore(path: string, unix: number): Promise<void> {
    const pathsplit = path.split(new RegExp(/(\/|\\)/g));
    return new Promise((res, rej) => {
      return copy(join(process.env.BACKUPS_PATH!, `${pathsplit[pathsplit.length - 1]}_${unix}`), path, (err) => {
          return (!!err ? rej(err) : res());
      });
    })
  }
  static remove(): Promise<any> {
    const unlinkFiles: Promise<void> = new Promise((res, rej) => {
      readdir(process.env.BACKUPS_PATH!, (err: NodeJS.ErrnoException, files: string[]) => {
        if (err) rej(err);
        files.filter((file: string) => {
          const unix = file.split('_');
          if (Number(unix[unix.length - 1]) < Date.now() - 604800000) return file;
        }).forEach((file, index) => {
          return unlink(join(process.env.BACKUPS_PATH!, file), (err) => {
            if (!!err) return rej(err);
            if (index == files.length - 1) return res();
          });
        })
      })
    })
    const rmBackupNote = BACKUP.deleteMany({expires: { $lte: new Date() }}, [], (err: any) => {
      if (err) return;
    });
    return Promise.all([unlinkFiles, rmBackupNote]);
  }
  static getBackupFile(name: string, unix: number) {
    return new Promise((res, rej) => {
      readFile(join(process.env.BACKUPS_PATH!, `${name}_${unix}`), (err: NodeJS.ErrnoException | null, buf: Buffer) => {
        if (err) { rej(err); return; }
        res(parser.ANSItoUTF8(buf))
      })
    })
  }
}
