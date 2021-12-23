import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { Logger } from '@shared/Logger';
import { json } from 'body-parser';
import { unlink } from 'fs';
import Workgroup from '@enums/workgroup.enum';
// import { TreeNode } from '@shared/fs.treenode';
import { BACKUP } from '@schemas/backup.schema';
import { Document, CallbackError } from 'mongoose';

import { corsOpt } from '@shared/constants';
import { isWorkGroup } from '@shared/functions';

const { DEV, BACKUPER } = Workgroup;
const { OK, UNAUTHORIZED, INTERNAL_SERVER_ERROR, CONFLICT } = StatusCodes;

const router = Router();


router.delete('/delete-file', corsOpt, json(), (req: any, res: any) => { // DELETE Removes config file
  // if (!req.headers.authorization)  { res.send(UNAUTHORIZED).end('Empty authorization token'); return ; }
  // if (req.user.group_id !== DEV) { res.send(UNAUTHORIZED).end('Access denied for workgroup: ' + isWorkGroup(req.user.group_id)); return ; }
  // if (!req.query.path) { return res.send(CONFLICT); }
  // Logger.log('default', 'DELETE │', req.connection.remoteAddress, req.user.user, `role: ${req.user.group_id}`, '-> DELETE_FILE', req.query.path, '[', req.originalUrl, ']');
  // unlink(req.query.path, (err: NodeJS.ErrnoException | null) => {
  //   if (err) {  res.sendStatus(INTERNAL_SERVER_ERROR).end(err); }
  //   else { res.send(OK).end(`File ${req.query.path} successfully deleted`) };
  // });
});
router.get('/backups-list', corsOpt, (req: any, res: any) => { // GET download config file
  if (!req.headers.authorization)  { res.sendStatus(UNAUTHORIZED).end('Empty authorization token'); return ; }
  if (req.user.group_id !== DEV && req.user.group_id !== BACKUPER) { res.sendStatus(UNAUTHORIZED).end('Access denied for workgroup: ' + isWorkGroup(req.user.group_id)); return; }
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user, `role: ${req.user.group_id}`, '-> BACKUPS_LIST', req.query.path, '[', req.originalUrl, ']');
  // const tree = TreeNode.buildTree(process.env.BACKUPS_PATH!, 'backups');
  BACKUP.find({}).sort({ unix: - 1 }).exec((err: CallbackError, data: Document[]) => {
    if (err) { return res.send(INTERNAL_SERVER_ERROR); }
    res.send(data);
  })
});

export default router;
