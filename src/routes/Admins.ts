import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { Logger } from '@shared/Logger';
import bodyParser from 'body-parser';

import { corsOpt, MSQLPool } from '@shared/constants';

const router = Router();

const { OK, UNAUTHORIZED } = StatusCodes;

router.get('/list', corsOpt, (req: any, res: any) => {
  if (!req.headers.authorization && req.user.gr !== 10) return res.sendStatus(UNAUTHORIZED);
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user,`role: ${req.user.group_id}`, '-> ADMIN_LIST [', req.originalUrl, ']');
  MSQLPool.promise()
    .query("SELECT username, user_id, user_regdate, user_email, user_avatar, group_id FROM phpbb_users WHERE group_id IN (?, ?, ?, ?, ?, ?)", [9, 10, 11, 12, 13, 14])
    .then(([rows]: any[]): void => {
      for (let i = 0; i < rows.length; i++) {
        if (!rows[i].user_avatar) {
          rows[i].user_avatar = 'https://www.gta-liberty.ru/styles/prosilver_ex/theme/images/no_avatar.gif';
        } else {
          rows[i].user_avatar = 'https://www.gta-liberty.ru/images/avatars/upload/' + rows[i].user_avatar;
        }
      }
      res.send(JSON.stringify(rows));
    })
    .catch((err: any): void => {
      res.status(UNAUTHORIZED).send(err);
      Logger.log('error', `[${req.connection.remoteAddress}]`, 401, req.user.user, 'Failed admin list query');
      Logger.log('error', err);
    });
});
router.get('/all', corsOpt, (req: any, res: any) => {
  if (!req.headers.authorization && req.user.gr !== 10) return res.sendStatus(UNAUTHORIZED);
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user,`role: ${req.user.group_id}`, '-> ADMIN_LIST [', req.originalUrl, ']');
  MSQLPool.promise()
    .query("SELECT * FROM phpbb_users WHERE group_id IN (?, ?, ?, ?, ?, ?)", [9, 10, 11, 12, 13, 14])
    .then(([rows]: any[]): void => {
      res.send(JSON.stringify(rows));
    })
    .catch((err: any): void => {
      res.status(UNAUTHORIZED).send(err);
      Logger.log('error', `[${req.connection.remoteAddress}]`, 401, req.user.user, 'Failed admin list query');
      Logger.log('error', err);
    });
});
router.get('/sub-groups', corsOpt, (req: any, res: any) => {
  if (!req.headers.authorization && req.user.gr !== 10) return res.sendStatus(UNAUTHORIZED);
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user,`role: ${req.user.group_id}`, '-> ADMIN_LIST [', req.originalUrl, ']');
  MSQLPool.promise()
    .query("SELECT * FROM phpbb_user_group", [])
    .then(([rows]: any[]): void => {
      res.send(JSON.stringify(rows));
    })
    .catch((err: any): void => {
      res.status(UNAUTHORIZED).send(err);
      Logger.log('error', `[${req.connection.remoteAddress}]`, 401, req.user.user, 'Failed admin list query');
      Logger.log('error', err);
    });
});
router.put('/change-group', bodyParser.json(), corsOpt, (req: any, res: any) => {
  if (!req.headers.authorization && req.user.gr !== 10) return res.sendStatus(UNAUTHORIZED);
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.user,`role: ${req.user.group_id}`, '-> CHANGE_ADMIN_GROUP', `${req.body.username} : ${req.body.group}`, '[', req.originalUrl, ']');
  MSQLPool.promise()
    .query("UPDATE phpbb_users SET group_id = ? WHERE username = ?", [req.body.group, req.body.username])
    .then((): void => {
      res.status(OK).send(JSON.stringify({status: 'ok'}));
    })
    .catch((err: any): void => {
      res.status(UNAUTHORIZED).send(err);
      Logger.log('error', `[${req.connection.remoteAddress}]`, 401, req.user.user, `Failed to change ${req.body.username} admin status to ${req.body.group}`)
      Logger.log('error', err);
    });
});

export default router;
