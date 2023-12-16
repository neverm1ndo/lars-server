import type { Request } from 'express';

import { pipeline, Transform, TransformCallback, Readable } from 'stream';
import { join, dirname } from 'path';
import Backuper, { BackupAction } from '@backuper';

import fs, { WriteStream } from 'fs';
import multer from "multer";

import { UTF8toANSI } from './functions';

import Workgroup from '@enums/workgroup.enum';
import { logger } from './constants';

const { CFR } = Workgroup;

const ERROR = {
  OUT_OF_PERMITTED_AREA: new Error('File destination is out of permitted area'),
};

const getDestination = (_req: Request, _file: Express.Multer.File, callback: any) => {
  callback(null, process.env.CFG_DEFAULT_PATH);
};

const isOutOfPermittedArea = (dirpath: string, user: any): boolean => {
  return user.secondary_group === CFR && dirpath !== process.env.CFG_DEFAULT_PATH;
};

class ExperimentalConfigFileStorageEngine implements multer.StorageEngine {

  private _getDestination: any;

  constructor(_options: any) {
    this._getDestination = _options.destination || getDestination;
  }

  _handleFile(req: Request,
            file: Express.Multer.File,
            callback: (error?: any, info?: Partial<Express.Multer.File>) => void): void {
    this._getDestination(req, file, async (err: any, path: any) => {
      
      try {
        if (err) throw err;
        
        const filepath: string = join(path, file.originalname);

        /**
         * Checks destination path access
         */
        await fs.promises.access(path);

        /*
        * Create backup note in DB
        * Save file as hashed backup
        */
        const backupNote = await Backuper.backup(filepath, req.user, BackupAction.CHANGE);


        const targetDir: string = dirname(filepath);
        if (isOutOfPermittedArea(targetDir, req.user)) throw ERROR.OUT_OF_PERMITTED_AREA;


        const writeStream: WriteStream = fs.createWriteStream(filepath);

        const streamPipeline: WriteStream = this._createWriteStreamPipeline(file.stream, writeStream, !backupNote.file.binary, callback); 
              streamPipeline.on('error', (err) => callback(err));
              streamPipeline.on('finish', () => callback(null, { path, size: writeStream.bytesWritten }));
      } catch(err) {
        logger.err(err);
        callback(err);
      }
    });
  }

  private _createWriteStreamPipeline(
      fileStream: Readable, 
      writeStream: WriteStream, 
      encoded: boolean, 
      callback: (error?: any, info?: Partial<Express.Multer.File>) => void
    ): WriteStream {
      const transform = encoded ?
                        new Transform({
                          transform: (chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback) => {
                            callback(null, UTF8toANSI(chunk));
                          }
                        }):
                        new Transform({
                          transform: (chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback) => {
                            callback(null, chunk);
                          }
                        });

      const pipe: [Readable, Transform, WriteStream] = [
        fileStream,
        transform,
        writeStream,
      ];

      return pipeline<WriteStream>(...pipe, callback); 
  }

  _removeFile(_req: Request,
            file: Express.Multer.File,
            callback: (error: Error | null) => void): void {
              fs.unlink(file.path, callback);
            }
}

export default function (options: any) {
  return new ExperimentalConfigFileStorageEngine(options);
}
