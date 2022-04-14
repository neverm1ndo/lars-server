// import StatusCodes from 'http-status-codes';
import { Router } from 'express';
// import { Logger } from '@shared/Logger';

import { corsOpt } from '@shared/constants';
import Statsman from '../Statsman';

import { STAT } from '@schemas/stat.schema';

const router = Router();

// const { OK, CONFLICT } = StatusCodes;

router.get('/online', corsOpt, (req: any, res: any) => { // GET download config file
  // if (!req.query.path) { return res.send(CONFLICT); }
  // Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user, `role: ${req.user.group_id}`, '-> DOWNLOAD_FILE', req.query.path, '[', req.originalUrl, ']');
  STAT.findOne({ date: new Date() }, (err: any, stat: any) => {
    if (err) return;
    res.send(stat);
  });
});

router.get('/chat', corsOpt, (req: any, res: any) => { // GET download config file
  // if (!req.query.path) { return res.send(CONFLICT); }
  // Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user, `role: ${req.user.group_id}`, '-> DOWNLOAD_FILE', req.query.path, '[', req.originalUrl, ']');
  // if (!req.query.from && !req.query.to) return res.sendStatus(CONFLICT);
  const now = new Date();
  Statsman.getChatStats(new Date(now.getFullYear(), now.getMonth()), new Date(now.getFullYear(), now.getMonth() + 1)).exec((err: any, data: any) => {
    if (err) console.log(err);
    res.send(data[0]);
  })
});

export default router;
