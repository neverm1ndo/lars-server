import type { Request } from 'express';

import { pipeline, Transform } from 'stream';
import { parser } from '@shared/constants';
import { join } from 'path';
import Backuper from '@backuper';

import fs from 'fs';
import multer from "multer";

const getDestination = (_req: Request, _file: Express.Multer.File, callback: any) => {
  callback(null, process.env.CFG_DEFAULT_PATH);
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
      Backuper.backup(filepath, req.user, 'change').then(() => {
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
      }).catch((err) => {
        callback(err);
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
