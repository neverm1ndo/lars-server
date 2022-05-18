import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { Logger } from '@shared/Logger';
import { json } from 'express';
import Workgroup from '@enums/workgroup.enum';

import { devGuard } from '@shared/middlewares';

import { corsOpt, MSQLPool } from '@shared/constants';

const router = Router();

const { OK, INTERNAL_SERVER_ERROR, CONFLICT } = StatusCodes;
const { CHALLENGER, DEV, ADMIN, CFR, MAPPER, BACKUPER } = Workgroup;

router.get('/list', (req: any, res: any) => {
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.username,`role: ${req.user.main_group}`, '-> ADMIN_LIST [', req.originalUrl, ']');
  MSQLPool.promise()
    .query('SELECT phpbb_users.user_id, phpbb_users.username, phpbb_users.user_avatar, phpbb_users.user_email, phpbb_users.group_id AS main_group, role.secondary_group FROM phpbb_users INNER JOIN (SELECT phpbb_user_group.user_id, MAX(phpbb_user_group.group_id) as secondary_group FROM phpbb_users, phpbb_user_group WHERE phpbb_users.group_id IN (?, ?, ?, ?, ?, ?) AND phpbb_user_group.user_id = phpbb_users.user_id GROUP BY phpbb_user_group.user_id) AS role ON role.user_id = phpbb_users.user_id', [CHALLENGER, DEV, ADMIN, MAPPER, CFR, BACKUPER])
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
      res.status(INTERNAL_SERVER_ERROR).send(err);
      Logger.log('error', `[${req.connection.remoteAddress}]`, 401, req.user.username, 'Failed admin list query');
      Logger.log('error', err);
    });
});
router.get('/expire-token', devGuard, (req: any, res: any) => {
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.username,`role: ${req.user.main_group}`, '-> TOKEN_SESSION_EXPIRATION [', req.originalUrl, ']');
  // cm.closeSession(req.query.username);
  res.status(OK).send(JSON.stringify({ status: 'Token expired' }));
});
router.put('/change-group', devGuard, json(), corsOpt, (req: any, res: any) => {
  if (!req.body.id && !req.body.group) return res.sendStatus(CONFLICT);
  Logger.log('default', 'PUT │', req.connection.remoteAddress, req.user.username,`role: ${req.user.main_group}`, '-> CHANGE_ADMIN_GROUP', `${req.body.username} : ${req.body.group}`, '[', req.originalUrl, ']');
  MSQLPool.promise()
    .query('UPDATE phpbb_user_group, phpbb_users SET phpbb_user_group.group_id = ?, phpbb_users.group_id = ? WHERE phpbb_user_group.user_id = phpbb_users.user_id AND phpbb_users.user_id = ?;', [req.body.group, req.body.group, req.body.id])
    .then((): void => {
      res.status(OK).send(JSON.stringify({status: 'ok'}));
    })
    .catch((err: any): void => {
      res.status(INTERNAL_SERVER_ERROR).send(err);
      Logger.log('error', `[${req.connection.remoteAddress}]`, 401, req.user.username, `Failed to change ${req.body.username} admin status to ${req.body.group}`)
      Logger.log('error', err);
    });
});
router.put('/change-secondary-group', devGuard, json(), (req: any, res: any) => {
  if (!req.body.id && !req.body.group) return res.sendStatus(CONFLICT);
  Logger.log('default', 'PUT │', req.connection.remoteAddress, req.user.username,`role: ${req.user.main_group}`, '-> CHANGE_SECONDARY_ADMIN_GROUP', `${req.body.username} : ${req.body.group}`, '[', req.originalUrl, ']');
  MSQLPool.promise()
    .query('UPDATE phpbb_user_group INNER JOIN (SELECT MAX(group_id) as group_id FROM phpbb_user_group WHERE group_id BETWEEN 9 AND 14 AND user_id = ? GROUP BY user_id) AS secondary_group SET phpbb_user_group.group_id = ? WHERE phpbb_user_group.group_id = secondary_group.group_id AND user_id = ?', [req.body.id, req.body.group, req.body.id])
    .then((): void => {
      res.status(OK).send(JSON.stringify({status: 'ok'}));
    })
    .catch((err: any): void => {
      res.status(INTERNAL_SERVER_ERROR).send(err);
      Logger.log('error', `[${req.connection.remoteAddress}]`, 401, req.user.username, `Failed to change ${req.body.username} admin status to ${req.body.group}`)
      Logger.log('error', err);
    });
});

export default router;
