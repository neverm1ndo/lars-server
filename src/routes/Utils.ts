import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { Logger } from '@shared/Logger';
import { json } from 'body-parser';
import { unlink } from 'fs';

import { corsOpt } from '@shared/constants';

const router = Router();

const { OK, UNAUTHORIZED, INTERNAL_SERVER_ERROR } = StatusCodes;

router.delete('/delete-file', corsOpt, json(), (req: any, res: any) => { // DELETE Removes config file
  if (!req.headers.authorization)  { res.sendStatus(UNAUTHORIZED); return ; }
  if (req.user.group_id == 10) {
    Logger.log('default', 'DELETE │', req.connection.remoteAddress, req.user.user, `role: ${req.user.group_id}`, '-> DELETE_FILE', req.query.path, '[', req.originalUrl, ']');
    unlink(req.query.path, (err: NodeJS.ErrnoException | null) => {
      if (err) {  res.sendStatus(INTERNAL_SERVER_ERROR); }
      else { res.sendStatus(OK) };
    });
  } else {
    res.sendStatus(UNAUTHORIZED); return ;
  }
});
router.get('/download-file', (req: any, res: any) => { // GET download config file
  if (!req.headers.authorization)  { res.sendStatus(UNAUTHORIZED); return ; }
  if (req.user.group_id == 10) {
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user, `role: ${req.user.group_id}`, '-> DOWNLOAD_FILE', req.query.path, '[', req.originalUrl, ']');
    res.sendFile(req.query.path);
  } else {
    res.sendStatus(UNAUTHORIZED); return ;
  }
});

export default router;
