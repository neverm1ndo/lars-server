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
    Logger.log('default', 'DELETE │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[91mrole: \x1b[93m${req.user.group_id}`, '\x1b[0m' ,'-> DELETE_FILE', req.query.path, '[', req.originalUrl, ']');
    unlink(req.query.path, (err: NodeJS.ErrnoException | null) => {
      if (err) {  res.sendStatus(INTERNAL_SERVER_ERROR); }
      else { res.sendStatus(OK) };
    });
  } else {
    res.sendStatus(UNAUTHORIZED); return ;
  }
});
router.get('/download-file', (req: any, res: any) => { // DELETE Removes config file
  if (!req.headers.authorization)  { res.sendStatus(UNAUTHORIZED); return ; }
  if (req.user.group_id == 10) {
  Logger.log('default', 'GET │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[91mrole: \x1b[93m${req.user.group_id}`, '\x1b[0m' ,'-> DOWNLOAD_FILE', req.query.path, '[', req.originalUrl, ']');
    res.sendFile(req.query.path);
  } else {
    res.sendStatus(UNAUTHORIZED); return ;
  }
});

export default router;
