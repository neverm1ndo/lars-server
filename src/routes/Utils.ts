import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { Logger } from '@shared/Logger';
import { json } from 'body-parser';
import { unlink } from 'fs';
import Workgroup from '@enums/workgroup.enum';

import { corsOpt } from '@shared/constants';
import { isWorkGroup } from '@shared/functions';

const { DEV } = Workgroup;

const router = Router();

const { OK, UNAUTHORIZED, INTERNAL_SERVER_ERROR, CONFLICT } = StatusCodes;

router.delete('/delete-file', corsOpt, json(), (req: any, res: any) => { // DELETE Removes config file
  if (!req.headers.authorization)  { res.send(UNAUTHORIZED).end('Empty authorization token'); return ; }
  if (req.user.group_id !== DEV) { res.send(UNAUTHORIZED).end('Access denied for workgroup: ' + isWorkGroup(req.user.group_id)); return ; }
  if (!req.query.path) { return res.send(CONFLICT); }
  Logger.log('default', 'DELETE │', req.connection.remoteAddress, req.user.user, `role: ${req.user.group_id}`, '-> DELETE_FILE', req.query.path, '[', req.originalUrl, ']');
  unlink(req.query.path, (err: NodeJS.ErrnoException | null) => {
    if (err) {  res.sendStatus(INTERNAL_SERVER_ERROR).end(err); }
    else { res.send(OK).end(`File ${req.query.path} successfully deleted`) };
  });
});
router.get('/download-file', (req: any, res: any) => { // GET download config file
  if (!req.headers.authorization)  { res.sendStatus(UNAUTHORIZED).end('Empty authorization token'); return ; }
  if (req.user.group_id !== DEV) { res.send(UNAUTHORIZED).end('Access denied for workgroup: ' + isWorkGroup(req.user.group_id)); return; }
  if (!req.query.path) { return res.send(CONFLICT); }
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user, `role: ${req.user.group_id}`, '-> DOWNLOAD_FILE', req.query.path, '[', req.originalUrl, ']');
  res.sendFile(req.query.path);
});

export default router;
