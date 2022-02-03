import StatusCodes from 'http-status-codes';
import { Router } from 'express';
// import { Logger } from '@shared/Logger';
import Workgroup from '@enums/workgroup.enum';

import { corsOpt } from '@shared/constants';
import { isWorkGroup } from '@shared/functions';

import { STAT } from '@schemas/stat.schema';

const { DEV } = Workgroup;

const router = Router();

const { OK, UNAUTHORIZED, INTERNAL_SERVER_ERROR, CONFLICT } = StatusCodes;

router.get('/online', corsOpt, (req: any, res: any) => { // GET download config file
  if (!req.headers.authorization)  { res.sendStatus(UNAUTHORIZED).end('Empty authorization token'); return ; }
  if (req.user.group_id !== DEV) { res.send(UNAUTHORIZED).end('Access denied for workgroup: ' + isWorkGroup(req.user.group_id)); return; }

  if (!req.query.path) { return res.send(CONFLICT); }
  // Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user, `role: ${req.user.group_id}`, '-> DOWNLOAD_FILE', req.query.path, '[', req.originalUrl, ']');
  STAT.findOne({}, (err: any, stat: any) => {
    if (err) return;
    res.send(stat);
  });
});

export default router;
