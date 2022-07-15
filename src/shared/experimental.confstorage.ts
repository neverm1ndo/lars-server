import type { Request } from 'express';

import { pipeline, Transform } from 'stream';
import { parser } from '@shared/constants';
import { join, dirname } from 'path';
import Backuper, { BackupAction } from '@backuper';

import fs from 'fs';
import { access } from 'fs/promises';
import multer from "multer";

import Workgroup from '@enums/workgroup.enum';

const { CFR } = Workgroup;

const getDestination = (_req: Request, _file: Express.Multer.File, callback: any) => {
  callback(null, process.env.CFG_DEFAULT_PATH);
};

const isOutOfPermittedArea = (dirpath: string, user: any): boolean => {
  if (user.secondary_group === CFR && dirpath !== process.env.CFG_DEFAULT_PATH) return true;
  return false;
};

class ExperimentalConfigFileStorageEngine implements multer.StorageEngine {

  private _getDestination: any;

  constructor(_options: any) {
    this._getDestination = _options.destination || getDestination;
  }

  _handleFile(req: Request,
            file: Express.Multer.File,
            callback: (error?: any, info?: Partial<Express.Multer.File>) => void): void {
    this._getDestination(req, file, function (err: any, path: any) {
      if (err) return callback(err);
      const filepath: string = join(path, file.originalname);
      access(dirname(filepath))
      .then(() => Backuper.backup(filepath, req.user, BackupAction.CHANGE))
      .then(() => {
        if (isOutOfPermittedArea(dirname(filepath), req.user)) callback(new Error('File is out of permitted area'));
        const writeStream = fs.createWriteStream(filepath);
        const transformEncoding = new Transform({
          transform: (chunk: Buffer, _encoding: BufferEncoding, callback) => {
            callback(null, parser.UTF8toANSI(chunk));
          }
        });
        const outStream = pipeline(file.stream, transformEncoding, writeStream, (err: NodeJS.ErrnoException | null) => {
          callback(err);
        });
        outStream.on('error', callback);
        outStream.on('finish', () => callback(null, { path, size: writeStream.bytesWritten }));
      })
      .catch((err) => {
        callback(err); // Backuper error
      })
      .catch((err) => {
        callback(err); // Access error
      });
    });
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
