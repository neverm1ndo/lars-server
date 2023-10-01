import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { logger } from '@shared/constants';
import { Response } from 'express';
import { BACKUP } from '@schemas/backup.schema';
import { Document, CallbackError } from 'mongoose';
import { stat, Stats } from 'fs';
import { TreeNode } from '@shared/fs.treenode';

import Backuper from '@backuper';
import Workgroup from '@enums/workgroup.enum';

const { OK, INTERNAL_SERVER_ERROR, CONFLICT } = StatusCodes;

const router = Router();

const LOGGER_PREFIX: string = '[BACKUPS]';

router.get('/list', (req: any, res: any) => {
  logger.log(LOGGER_PREFIX, '[GET]', 'BACKUPS_LIST', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group]);
  
  BACKUP.find({})
        .sort({ unix: - 1 })
        .exec((err: CallbackError, data: Document[]) => {
          if (err) {
            logger.err(LOGGER_PREFIX, '[GET]', 'BACKUPS_LIST_FAIL', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group]);
            return res.send(INTERNAL_SERVER_ERROR);
          }
          res.send(data);
        });
});

router.get('/backup/:hash', (req: any, res: any) => {
  logger.log(LOGGER_PREFIX, '[GET]', 'BACKUP_FILE', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash || 'no_hash');
  
  if (!req.params.hash) { 
    logger.err(LOGGER_PREFIX, '[GET]', 'BACKUP_FILE_FAIL', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash || 'no_hash', CONFLICT);
    return res.status(CONFLICT)
              .send('Bad request: required parameters missed');
  }

  Backuper.getBackupFile(req.params.hash)
          .then((data) => {
            TreeNode.clearCache();
            res.status(OK)
               .send(data);
          })
          .catch(err => {
            logger.err(LOGGER_PREFIX, '[GET]', 'BACKUP_FILE_FAIL', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash, `::${err.message}::`);
            res.status(INTERNAL_SERVER_ERROR)
               .send({ message: err.message });
          });
});

router.get('/restore/:hash', (req: any, res: Response) => {
  logger.log(LOGGER_PREFIX, '[GET]', 'BACKUP_FILE_RESTORE', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash || 'no_hash');
  
  if (!req.params.hash) { 
    logger.err(LOGGER_PREFIX, '[GET]', 'BACKUP_FILE_RESTORE_FAIL', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash || 'no_hash');
    return res.status(CONFLICT)
              .send('Bad request: required parameters missed'); 
  }
  
  Backuper.restore(req.params.hash)
          .then(() => {
            res.status(OK)
               .send([]);
          })
          .catch((err) => {
            logger.err(LOGGER_PREFIX, '[GET]', 'BACKUP_FILE_RESTORE_FAIL', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash);
            res.status(INTERNAL_SERVER_ERROR)
               .send(err.message);
          });
});

router.delete('/backup/:hash', (req: any, res: Response) => {
  logger.log(LOGGER_PREFIX, '[DELETE]', 'BACKUP_FILE_DELETE', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash || 'no_hash');
  
  if (!req.params.hash) { 
    logger.err(LOGGER_PREFIX, '[DELETE]', 'BACKUP_FILE_DELETE_FAIL', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash || 'no_hash', CONFLICT);
    return res.status(CONFLICT)
              .send('Bad request: required parameters missed'); 
  }
  
  Backuper.remove(req.params.hash)
          .then(() => {
            res.status(OK)
               .send([]);
          })
          .catch(({ message }) => {
            logger.err(LOGGER_PREFIX, '[DELETE]', 'BACKUP_FILE_DELETE_FAIL', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], req.params.hash);
            res.status(INTERNAL_SERVER_ERROR)
               .send(message);
          });
});

router.get('/size', (_req: any, res: Response) => {
  stat(process.env.BACKUPS_PATH!, (err: NodeJS.ErrnoException | null, stats: Stats) => {
    if (err) return res.status(INTERNAL_SERVER_ERROR)
                       .send(err.message);
    res.status(OK)
       .send(stats);
  });
});

export default router;
