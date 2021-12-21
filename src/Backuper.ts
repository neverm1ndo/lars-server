import { copy } from 'fs-extra';

export default class Backuper {
  constructor() {}
  static backup(path: string): Promise<void> {
    const pathsplit = path.split(new RegExp(/(\/|\\)/g));
    const filename = pathsplit[pathsplit.length - 1];
    const ext = filename.split(new RegExp(/.(.*)/));
    return new Promise((res, rej) => {
      return copy(path, process.env.BACKUPS_PATH! + `${filename}_${new Date()}${ext}`, (err) => {
          return (!!err ? rej(err) : res());
      });
    });
  }
}
