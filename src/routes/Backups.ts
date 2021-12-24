import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { Logger } from '@shared/Logger';
import { json } from 'body-parser';
import { unlink } from 'fs';
import Workgroup from '@enums/workgroup.enum';
// import { TreeNode } from '@shared/fs.treenode';
import { BACKUP } from '@schemas/backup.schema';
import { Document, CallbackError } from 'mongoose';

import Backuper from '@backuper';

import { corsOpt } from '@shared/constants';
import { isWorkGroup } from '@shared/functions';

const { DEV, BACKUPER } = Workgroup;
const { OK, UNAUTHORIZED, INTERNAL_SERVER_ERROR, CONFLICT } = StatusCodes;

const router = Router();

router.get('/backups-list', corsOpt, (req: any, res: any) => { // GET download config file
  if (!req.headers.authorization)  { res.sendStatus(UNAUTHORIZED).end('Empty authorization token'); return ; }
  if (req.user.group_id !== DEV && req.user.group_id !== BACKUPER) { res.sendStatus(UNAUTHORIZED).end('Access denied for workgroup: ' + isWorkGroup(req.user.group_id)); return; }
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user, `role: ${req.user.group_id}`, '-> BACKUPS_LIST', '[', req.originalUrl, ']');
  BACKUP.find({}).sort({ unix: - 1 }).exec((err: CallbackError, data: Document[]) => {
    if (err) { return res.send(INTERNAL_SERVER_ERROR); }
    res.send(data);
  })
});
router.get('/restore-backup', corsOpt, (req: any, res: any) => {
  if (!req.headers.authorization)  { res.sendStatus(UNAUTHORIZED).end('Empty authorization token'); return ; }
  if (req.user.group_id !== DEV && req.user.group_id !== BACKUPER) { res.sendStatus(UNAUTHORIZED).end('Access denied for workgroup: ' + isWorkGroup(req.user.group_id)); return; }
  if (!req.query.path || !req.query.unix) { res.sendStatus(CONFLICT).end('Bad request: required parameters missed'); return;}
  Backuper.restore(req.query.path,  Number(req.query.unix)).then(() => {
    Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user, `role: ${req.user.group_id}`, '-> RESTORED_BACKUP', req.query.path, '[', req.originalUrl, ']');
  }).catch((err) => {
    console.error(err);
    res.send(INTERNAL_SERVER_ERROR)
  });
})

export default router;
