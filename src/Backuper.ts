import { copy } from 'fs-extra';
import { join } from 'path'

export default class Backuper {
  constructor() {}
  static backup(path: string): Promise<void> {
    const pathsplit = path.split(new RegExp(/(\/|\\)/g));
    const filename = pathsplit[pathsplit.length - 1].split('.')[0];
    const ext = pathsplit[pathsplit.length - 1].replace(new RegExp(/(.*)\./), '');
    return new Promise((res, rej) => {
      return copy(path, join(process.env.BACKUPS_PATH!, `${filename}_${Date.now()}.${ext}`), (err) => {
          return (!!err ? rej(err) : res());
      });
    });
  }
}
