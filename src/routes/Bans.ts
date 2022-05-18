import StatusCodes from 'http-status-codes';
import { Router } from 'express';
// import { Logger } from '@shared/Logger';
// import { json } from 'express';
// import Workgroup from '@enums/workgroup.enum';

// import { MSQLPool } from '@shared/constants';

const router = Router();

const { OK, INTERNAL_SERVER_ERROR, NOT_IMPLEMENTED } = StatusCodes;
// const { CHALLENGER, DEV, ADMIN, CFR, MAPPER, BACKUPER } = Workgroup;

router.get('/cn', (req: any, res: any) => {
  return res.send(NOT_IMPLEMENTED);
  // Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.username,`role: ${req.user.main_group}`, '-> BAN_LIST');
  // let page: number = 0;
  // if (req.query.p) page = req.query.p;
  // MSQLPool.promise()
  //   .query('SELECT * FROM lars_bans WHERE lars_bans.serial_cn IS NOT NULL WHERE ', [])
  //   .then(([rows]: any[]): void => {
  //     // for (let i = 0; i < rows.length; i++) {
  //     //   if (!rows[i].user_avatar) {
  //     //     rows[i].user_avatar = 'https://www.gta-liberty.ru/styles/prosilver_ex/theme/images/no_avatar.gif';
  //     //   } else {
  //     //     rows[i].user_avatar = 'https://www.gta-liberty.ru/images/avatars/upload/' + rows[i].user_avatar;
  //     //   }
  //     // }
  //     res.send(JSON.stringify(rows));
  //   })
  //   .catch((err: any): void => {
  //     res.status(INTERNAL_SERVER_ERROR).send(err);
  //     // Logger.log('error', `[${req.connection.remoteAddress}]`, 401, req.user.username, 'Failed admin list query');
  //     Logger.log('error', err);
  //   });
});
router.get('/expire-token', (req: any, res: any) => {
  return res.send(NOT_IMPLEMENTED);
  // Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.username,`role: ${req.user.main_group}`, '-> TOKEN_SESSION_EXPIRATION [', req.originalUrl, ']');
  // // cm.closeSession(req.query.username);
  // res.status(OK).send(JSON.stringify({ status: 'Token expired' }));
});

export default router;
