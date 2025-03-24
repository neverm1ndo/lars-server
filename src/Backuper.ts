import { unlink, readFile, stat } from 'fs/promises';
import fs from 'fs';
import { pipeline } from 'stream';
import { join, basename, extname } from 'path';
import { BACKUP } from '@schemas/backup.schema';
import { ANSItoUTF8, getAvatarURL } from '@shared/functions';
import { logger } from '@shared/logger';
import Workgroup from '@enums/workgroup.enum';
import crypto from 'crypto';
import { Gunzip, Gzip, createGunzip, createGzip } from 'zlib';
import { getMimeType } from '@shared/mime';
import { isBinary } from '@shared/mime/utils';
import { AdminUserData } from '@entities/admin.entity';

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
        compressed?: number;
    }
}

const LOG_MESSAGES = {
    CREATE     : 'BACKUPER_CREATE_BACKUP',
    NOT_EXISTS : 'BACKUP_IS_NOT_EXISTS'
};

const LIFETIME: number = Number(process.env.BACKUP_LIFETIME!);
const COMPRESSION_LEVEL: number = Number(process.env.BACKUP_COMPRESSION_LEVEL!) || 1;

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
    static async backup<T extends AdminUserData>(path: string, user: T, action: BackupAction): Promise<BackupNote> {
        const ext: string = extname(path);
        
        const [filename, unix]: [string, number] = [
            basename(path, ext),
            Date.now(),
        ];
        
        const hash: string = makeHash(filename, unix);
        
        const mime = getMimeType(ext);
    
        const creationDate: Date = new Date(unix);
        const expirationDate: Date = new Date(unix + LIFETIME);
        const avatar: string = getAvatarURL(user?.user_avatar ?? '');

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
            const { size } = await stat(path);

            const destinationPath = join(process.env.BACKUPS_PATH!, hash);

            const sizeThreshold = Number(process.env.BACKUP_SIZE_THRESHOLD!);
            backupDocument.file.bytes = size;

            const isNeedToCompress = size >= sizeThreshold;

            await Backuper.prepareBackupFile(
                path,
                destinationPath,
                isNeedToCompress ? createGzip({ level: COMPRESSION_LEVEL }) : undefined
            );

            if (isNeedToCompress) {
                const { size } = await stat(destinationPath);
                backupDocument.file.compressed = size;
            }

            const backup = new BACKUP(backupDocument);
            
            await backup.save();
            
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
    static async restore(hash: string): Promise<unknown> {
        return BACKUP.findOne<BackupNote>({ hash })
                    .then((backup) => {
                        if (!backup) throw LOG_MESSAGES.NOT_EXISTS;
                        
                        return backup;
                    })
                    .then((backup) => {
                        const backupFilePath: string = join(process.env.BACKUPS_PATH!, backup.hash);

                        return Backuper.prepareBackupFile(
                            backupFilePath,
                            backup.file.path,
                            backup.file.compressed ? createGunzip({ level: COMPRESSION_LEVEL }) : undefined
                        );
                    });
    }
  
    /**
     * Removes expired(2 weeks old by default) backups from database and fs
     */
    static async removeExpired(): Promise<unknown> {
        const now: Date = new Date();
        
        const unlinkShchedule: Promise<unknown> = BACKUP.find<BackupNote>({ expires: { $lte: now }}, [])
            .then((notes) => {
                    if (!notes) throw LOG_MESSAGES.NOT_EXISTS;
                    
                    return notes;
            })
            .then((notes) => 
                    Promise.all(notes.map((note) => unlink(join(process.env.BACKUPS_PATH!, note.hash))))
            );
        
        const deleteBackupNotes = BACKUP.deleteMany({ expires: { $lte: now }}, [])
                                        .exec();
        
        return unlinkShchedule.then(() => deleteBackupNotes);
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
                        const filepath: string = join(process.env.BACKUPS_PATH!, hash);
                    
                        return unlink(filepath);
                    });
    }

    /** 
     * @param hash 
     * @returns {Promise<Buffer>} - file buffer
     */
    static async getBackupFile(hash: string): Promise<Buffer> {
        const filepath: string = join(process.env.BACKUPS_PATH!, hash);

        return readFile(filepath).then((buffer: Buffer) => ANSItoUTF8(buffer))
    }

    static async prepareBackupFile(source: string, destination: string, transform?: Gzip | Gunzip) {
        const readStream = fs.createReadStream(source);
        const writeStream = fs.createWriteStream(destination);

        const stream = (() => {
            if (transform) {
                return pipeline(readStream, transform, writeStream, () => {});
            }
        
            return readStream.pipe(writeStream);
        })();

        return new Promise((resolve, reject) => {
            stream.on('finish', resolve);
            stream.on('end', resolve);
            stream.on('error', reject)
        });
    }
}

