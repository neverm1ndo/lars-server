import { copy } from 'fs-extra';
import { readFileSync } from 'fs';
import { join } from 'path'
import { BACKUP } from '@schemas/backup.schema';
import { getMimeType } from '@shared/functions';

export default class Backuper {
  constructor() {}
  static backup(path: string, user: any): Promise<any> {
    const pathsplit = path.split(new RegExp(/(\/|\\)/g));
    const filename = pathsplit[pathsplit.length - 1].split('.')[0];
    const ext = pathsplit[pathsplit.length - 1].replace(new RegExp(/(.*)\./), '');
    const unix = Date.now();
    const copyFile: Promise<void> = new Promise((res, rej) => {
      return copy(path, join(process.env.BACKUPS_PATH!, `${filename}_${unix}.${ext}`), (err) => {
          return (!!err ? rej(err) : res());
      });
    })
    console.log(user);
    let backup = new BACKUP({
      unix,
      date: new Date(unix),
      expires: new Date(unix + 604800000),
      user: {
        nickname: user.user,
        group_id: user.group_id,
        avatar: user.avatar
      },
      file: {
        name: filename + '.' + ext,
        mime: getMimeType(filename+'.'+ext),
        text: readFileSync(path)
      }
    });
    return Promise.all([copyFile, backup.save()])
  }
}
