import { unlink, readFile, copyFile, stat } from 'fs/promises';
import path, { join, basename, extname } from 'path';
import { BACKUP } from '@schemas/backup.schema';
import { getMimeType, ANSItoUTF8, getAvatarURL, isBinary } from '@shared/functions';
import { logger } from '@shared/constants';
import Workgroup from '@enums/workgroup.enum';
import crypto from 'crypto';

export enum BackupAction {
  DELETE,
  CHANGE,
}

interface BackupNote {
  unix: number;
  date: Date;
  hash: string;
  expires: Date;
  action: BackupAction;
  user: {
    nickname: string;
    group_id: Workgroup;
    avatar: string;
  },
  file: {
    path: string;
    name: string;
    mime: string;
    binary: boolean;
    bytes?: number;
  }
}

const LOG_MESSAGES = {
  CREATE     : 'BACKUPER_CREATE_BACKUP',
  NOT_EXISTS : 'BACKUP_IS_NOT_EXISTS',
};

const LIFETIME: number = Number(process.env.BACKUP_LIFETIME!);

/**
* Generates hashcode for backups
*/
function makeHash(...args: Array<string | number>): string {
  const string = args.join('');
  return crypto.createHash('sha1').update(string).digest('hex');
}

export default class Backuper {

  static handleError<T extends Error>(error: T): void {
    logger.err('[BACKUPER]', error.message);
  }
  
  /** 
   * @param path - path to the backuping file 
   * @param user - user info of backup initiator
   * @param action - action that initiated backup
   * @returns {Promise<void>} - promise of function execution
   */
  static async backup(path: string, user: any, action: BackupAction): Promise<BackupNote> {
    const ext: string = extname(path);
    
    const [filename, unix]: [string, number] = [
      basename(path, ext),
      Date.now(),
    ];
    
    const hash: string = makeHash(filename, unix);
    
    const mime = getMimeType(ext);
  
    const creationDate: Date = new Date(unix);
    const expirationDate: Date = new Date(unix + LIFETIME);
    const avatar: string = getAvatarURL(user.user_avatar);

    const backupDocument: BackupNote = {
      unix,
      date: creationDate,
      hash,
      expires: expirationDate,
      action,
      user: {
        nickname: user.username,
        group_id: user.main_group,
        avatar,
      },
      file: {
        path,
        name: filename + ext,
        mime,
        binary: isBinary(mime),
      }
    };
    
    
    try {
      const fileStat = await stat(path);
      backupDocument.file.bytes = fileStat.size;
      
      const backup = new BACKUP(backupDocument);

      await copyFile(path, join(process.env.BACKUPS_PATH!, hash));
      
      backup.save();

      return backupDocument;

    } catch (err: any) {
      throw err.syscall == 'stat' ? console.log('BACKUPER_SKIP_NEW_FILE', path)
                                  : console.error(err);
    }
  }
 
  /**
   * Restores file from backup file
   * @param {string} hash - files hash
   * @returns {Promise<void>}
   */
  static async restore(hash: string): Promise<void> {
    return BACKUP.findOne<BackupNote>({ hash })
                 .then((backup) => {
                    if (!backup) throw LOG_MESSAGES.NOT_EXISTS;
                    return backup;
                 })
                 .then((backup) => {
                    const backupFilePath: string = path.join(process.env.BACKUPS_PATH!, backup.hash);
                    return copyFile(backupFilePath, backup.file.path);
                 });
  };
  
  /**
   * Removes expired(2 weeks old) backups from database and fs
   */
  static async removeExpired(): Promise<any> {
    const now: Date = new Date();
    
    const unlinkShchedule: Promise<unknown> = BACKUP.find<BackupNote>({ expires: { $lte: now }}, [])
          .then((notes) => {
            if (!notes) throw LOG_MESSAGES.NOT_EXISTS;
            return notes;
          })
          .then((notes) => {
            return Promise.all(notes.map((note) => unlink(path.join(process.env.BACKUPS_PATH!, note.hash))));
          });
    
    const deleteBackupNotes = BACKUP.deleteMany({ expires: { $lte: new Date() }}, [])
                                    .exec();
    
    return Promise.all([unlinkShchedule, deleteBackupNotes]);
  }

  /**
   * Removes backups note from db and file from fs by hashcode
   * @param hash 
   * @returns 
   */
  static async remove(hash: string): Promise<void> {
    return BACKUP.deleteOne({ hash })
                 .exec()
                 .then(() => {
                  const filepath: string = path.join(process.env.BACKUPS_PATH!, hash);
                  return unlink(filepath);
                 });
  }

  /** 
   * @param hash 
   * @returns {Promise<Buffer>} - file buffer
   */
  static async getBackupFile(hash: string): Promise<Buffer> {
    const filepath: string = path.join(process.env.BACKUPS_PATH!, hash);

    return readFile(filepath).then((buffer: Buffer) => ANSItoUTF8(buffer))
  }
}

