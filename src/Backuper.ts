import { copy, unlink, readdir } from 'fs-extra';
import { readFile, stat, Stats } from 'fs';
import { join, basename, extname } from 'path';
import { BACKUP } from '@schemas/backup.schema';
import { getMimeType } from '@shared/functions';
import { parser } from '@shared/constants';

export enum BackupAction {
  DELETE,
  CHANGE,
}

export default class Backuper {
  constructor() {}
  static async backup(path: string, user: any, action: BackupAction): Promise<any> {
    const ext = extname(path).replace(/(.*)\./, '');
    const filename = basename(path, ext);
    const unix = Date.now();
    const copyFile: Promise<void> = new Promise((res, rej) => {
      stat(path, (err: NodeJS.ErrnoException | null, stats: Stats) => {
        if (err && !stats) return rej(err);
      });
      copy(path, join(process.env.BACKUPS_PATH!, `${filename}.${ext}_${unix}`), (err) => {
        return (!!err ? rej(err) : res());
      });
    });
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
        nickname: user.username,
        group_id: user.main_group,
        avatar: user.avatar
      },
      file: {
        path,
        name: filename,
        mime: getMimeType(`${filename}.${ext}`),
        binary: isBinary,
      }
    });
    return await copyFile.then(() => {
      console.log('BACKUPER_CREATE_BACKUP', path);
      backup.save();
    }).catch((err) => {
      if (err.syscall == 'stat') return console.log('BACKUPER_SKIP_NEW_FILE', path);
      console.error(err);
    });
  }
  static restore(path: string, unix: number): Promise<void> {
    const pathsplit = path.split(new RegExp(/(\/|\\)/g));
    return new Promise((res, rej) => {
      return copy(join(process.env.BACKUPS_PATH!, `${pathsplit[pathsplit.length - 1]}_${unix}`), path, (err) => {
          return (!!err ? rej(err) : res());
      });
    });
  }
  static removeExpired(): Promise<any> {
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
        });
      });
    });
    const rmBackupNote = BACKUP.deleteMany({ expires: { $lte: new Date() }}, [], (err: any) => {
      if (err) return;
    });
    return Promise.all([unlinkFiles, rmBackupNote]);
  }

  static remove(_filename: string) {
    /**
    * TODO: implement remove backup
    */
  }

  static getBackupFile(name: string, unix: number) {
    return new Promise((res, rej) => {
      readFile(join(process.env.BACKUPS_PATH!, `${name}_${unix}`), (err: NodeJS.ErrnoException | null, buf: Buffer) => {
        if (err) { rej(err); return; }
        res(parser.ANSItoUTF8(buf))
      });
    });
  }
}
