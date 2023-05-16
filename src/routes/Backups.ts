import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { Logger } from '@shared/Logger';
import { Response } from 'express';
import { BACKUP } from '@schemas/backup.schema';
import { Document, CallbackError } from 'mongoose';
import { stat, Stats } from 'fs';

import Backuper from '@backuper';

const { OK, INTERNAL_SERVER_ERROR, CONFLICT } = StatusCodes;

const router = Router();

router.get('/list', (req: any, res: any) => {
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.username, `role: ${req.user.main_group}`, '-> BACKUPS_LIST');
  BACKUP.find({})
        .sort({ unix: - 1 })
        .exec((err: CallbackError, data: Document[]) => {
          if (err) return res.send(INTERNAL_SERVER_ERROR);
          res.send(data);
        });
});

router.get('/backup/:hash', (req: any, res: any) => {
  if (!req.params.hash) { 
    res.status(CONFLICT)
       .send('Bad request: required parameters missed'); 
    return;
  }
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.username, `role: ${req.user.main_group}`, '-> BACKUP_FILE', req.params.hash);
  Backuper.getBackupFile(req.params.hash)
          .then((data) => {
            res.status(OK)
               .send(data);
          })
          .catch(err => {
            res.status(INTERNAL_SERVER_ERROR)
               .send({ message: err.message });
          });
});

router.get('/restore/:hash', (req: any, res: Response) => {
  if (!req.params.hash) { 
    res.status(CONFLICT)
       .send('Bad request: required parameters missed'); 
    return;
  }
  Backuper.restore(req.params.hash)
          .then(() => {
            Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.username, `role: ${req.user.main_group}`, '-> RESTORED_BACKUP', req.params.hash);
            res.status(OK)
               .send([]);
          })
          .catch((err) => {
            res.status(INTERNAL_SERVER_ERROR)
               .send(err.message);
          });
});

router.delete('/backup/:hash', (req: any, res: Response) => {
  if (!req.params.hash) { 
    return res.sendStatus(CONFLICT)
              .end('Bad request: required parameters missed'); 
  }
  Backuper.remove(req.params.hash)
          .then(() => {
            Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.username, `role: ${req.user.main_group}`, '-> REMOVED_BACKUP', req.params.hash);
            res.status(OK)
               .send([]);
          })
          .catch(({ message }) => {
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
