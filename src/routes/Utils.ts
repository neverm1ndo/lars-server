import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { Logger } from '@shared/Logger';
import { json } from 'body-parser';
import { unlink } from 'fs';
import { exec } from 'child_process';

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
router.get('/download-file', (req: any, res: any) => { // GET download config file
  if (!req.headers.authorization)  { res.sendStatus(UNAUTHORIZED); return ; }
  if (req.user.group_id == 10) {
  Logger.log('default', 'GET │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[91mrole: \x1b[93m${req.user.group_id}`, '\x1b[0m' ,'-> DOWNLOAD_FILE', req.query.path, '[', req.originalUrl, ']');
    res.sendFile(req.query.path);
  } else {
    res.sendStatus(UNAUTHORIZED); return ;
  }
});
router.get('/restart', (req: any, res: any) => { // Kills samp03svr process
  if (!req.headers.authorization)  { res.sendStatus(UNAUTHORIZED); return ; }
  if (req.user.group_id == 10) {
  Logger.log('default', 'GET │', req.connection.remoteAddress, '\x1b[94m', req.user.user,`\x1b[91mrole: \x1b[93m${req.user.group_id}`, '\x1b[0m' ,'-> REBOOT_SVR_SA', '[', req.originalUrl, ']');
    exec('pkill samp03svr', (err: any, stdout: any, stderr: any) => {
      if (err) { res.status(INTERNAL_SERVER_ERROR).send(err); return; }
      res.status(OK).send(stdout);
    });
  } else {
    res.sendStatus(UNAUTHORIZED); return ;
  };
});

export default router;
