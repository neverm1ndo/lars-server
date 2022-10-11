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

router.get('/backups-list', (req: any, res: any) => { // GET all live backups list
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.username, `role: ${req.user.main_group}`, '-> BACKUPS_LIST', '[', req.originalUrl, ']');
  BACKUP.find({})
        .sort({ unix: - 1 })
        .exec((err: CallbackError, data: Document[]) => {
          if (err) return res.send(INTERNAL_SERVER_ERROR);
          res.send(data);
        });
});

router.get('/backup-file', (req: any, res: any) => { // GET backup file
  if (!req.query.name || !req.query.unix ) { 
    res.sendStatus(CONFLICT)
       .end('Bad request: required parameters missed'); 
    return;
  }
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.username, `role: ${req.user.main_group}`, '-> BACKUP_FILE', '[', req.originalUrl, ']');
  Backuper.getBackupFile(req.query.name, req.query.unix)
          .then((data) => {
            res.status(OK)
               .send(data);
          })
          .catch(err => {
            res.status(INTERNAL_SERVER_ERROR)
               .send({ message: err.message });
          });
});

router.get('/restore-backup', (req: any, res: Response) => { // GET restore file
  if (!req.query.path || !req.query.unix) { 
    res.sendStatus(CONFLICT)
       .end('Bad request: required parameters missed'); 
    return;
  }
  Backuper.restore(req.query.path, Number(req.query.unix))
          .then(() => {
            Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.username, `role: ${req.user.main_group}`, '-> RESTORED_BACKUP', req.query.path, '[', req.originalUrl, ']');
            res.status(OK)
               .send([]);
          })
          .catch((err) => {
            res.status(INTERNAL_SERVER_ERROR)
               .send({ message: err.message });
          });
});

router.delete('/backup', (req: any, res: Response) => { // GET restore file
  if (!req.query.path || !req.query.unix) { 
    res.sendStatus(CONFLICT)
       .end('Bad request: required parameters missed'); 
    return;
  }
  Backuper.restore(req.query.path,  Number(req.query.unix))
          .then(() => {
            Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.username, `role: ${req.user.main_group}`, '-> RESTORED_BACKUP', req.query.path, '[', req.originalUrl, ']');
            res.status(OK)
              .send([]);
          })
          .catch(({ message }) => {
            res.status(INTERNAL_SERVER_ERROR)
               .send({ message });
          });
          // Backuper.remove()
});

router.get('/size', (_req: any, res: Response) => { // GET restore file
  stat(process.env.BACKUPS_PATH!, (err: NodeJS.ErrnoException | null, stats: Stats) => {
    if (err) return res.status(INTERNAL_SERVER_ERROR)
                       .send({ message: err.message });
    res.status(OK)
       .send(stats);
  });
});

export default router;
