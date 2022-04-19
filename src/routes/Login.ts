import StatusCodes from 'http-status-codes';
import { Response, Router, json } from 'express';
import { Logger } from '@shared/Logger';

import { MSQLPool } from '@shared/constants';
import { checkPassword, generateToken, verifyToken, isWorkGroup, decodeToken } from '@shared/functions';
import { corsOpt } from '@shared/constants';

const router = Router();
const { OK, UNAUTHORIZED, CONFLICT, INTERNAL_SERVER_ERROR } = StatusCodes;

router.post('/', corsOpt, json(), (req: any, res: any): void => {
  Logger.log('default', 'LOGIN', req.connection.remoteAddress);
  if (!req.body.email) { res.status(CONFLICT).send(`E-mail form is empty`); return; }
  if (!req.body.password) { res.status(CONFLICT).send(`Password form is empty`); return; }
  Logger.log('default', 'Trying to authorize', req.body.email);
  MSQLPool.promise()
    .query("SELECT phpbb_users.user_id, phpbb_users.username, phpbb_users.user_avatar, phpbb_users.user_email, phpbb_users.group_id AS main_group, role.secondary_group FROM phpbb_users INNER JOIN (SELECT phpbb_user_group.user_id, MAX(phpbb_user_group.group_id) as secondary_group FROM phpbb_users, phpbb_user_group WHERE phpbb_users.group_id BETWEEN 9 AND 14 AND phpbb_user_group.user_id = phpbb_users.user_id GROUP BY phpbb_user_group.user_id) AS role ON role.user_id = phpbb_users.user_id AND phpbb_users.user_email = ?", [req.body.email])
    .then(([rows]: any[]): void => {
      let user = rows[0];
      if (!checkPassword(req.body.password, user.user_password) && !isWorkGroup(user.group_id)) {
        Logger.log('default', `[${req.connection.remoteAddress}]`, `Authorization from ${user.username}: WORKGROUP ${isWorkGroup(user.group_id)}->`, req.body.email);
        res.status(UNAUTHORIZED).send(`In Workgroup: ${isWorkGroup(user.group_id)}`);
      }
      Logger.log('default', `[${req.connection.remoteAddress}]`, 'Successfull authorization ->', req.body.email);
      res.status(OK).send(JSON.stringify({
        username: user.username,
        id: user.user_id,
        main_group: user.main_group,
        secondary_group: user.secondary_group,
        avatar: 'https://www.gta-liberty.ru/images/avatars/upload/' + user.user_avatar,
        token: generateToken({
          id: user.user_id,
          username: user.username,
          main_group: user.main_group,
          secondary_group: user.secondary_group,
        }),
      }));
    })
    .catch((err: any): void => {
      res.status(INTERNAL_SERVER_ERROR).send(err);
      Logger.log('error', `[${req.connection.remoteAddress}]`, INTERNAL_SERVER_ERROR, 'Failed authorization ->', req.body.email)
      Logger.log('error', 'LOGIN', err);
    });
});
router.get('/user', corsOpt, (req: any, res: any): void => {
  if (!verifyToken(req.headers.authorization.split(' ')[1])) return res.status(UNAUTHORIZED).send('Unauthorized access');
  MSQLPool.promise()
    .query("SELECT username, user_id, user_avatar, group_id FROM phpbb_users WHERE username = ?", [req.query.name])
    .then(([rows]: any[]): void => {
      let user = rows[0];
      res.status(OK).send(JSON.stringify({
        name: user.username,
        id: user.user_id,
        gr: user.group_id,
        avatar: user.user_avatar?'https://www.gta-liberty.ru/images/avatars/upload/' + user.user_avatar : 'https://www.gta-liberty.ru/styles/prosilver_ex/theme/images/no_avatar.gif',
      }));
    })
    .catch((err: any): void => {
      res.status(INTERNAL_SERVER_ERROR).send(err);
      Logger.log('error', 'GET_USER', err);
    });
});

router.get('/check-token', (req: any, res: Response) => { // GET Checks token validation
  if (!req.headers.authorization) return res.status(UNAUTHORIZED).send('Authorization token is empty');
  const token: string = req.headers.authorization.split(' ')[1];
  if (verifyToken(token)) {
    const user = decodeToken(token);
    Logger.log('default', `[${req.connection.remoteAddress}]`, 'Token validation ->', user?.name);
    MSQLPool.promise()
      .query("SELECT group_id FROM phpbb_users WHERE user_id = ?", [user?.id])
      .then(([rows]: any[]): void => {
        if (rows[0].group_id == user?.group_id) {
          Logger.log('default', `[${req.connection.remoteAddress}]`, 'Successfull token validation ->', user?.name);
          res.status(OK).send('Access token is valid')
        } else {
          throw 'Invalid access token';
        }
      }).catch((err: string) => {
        res.status(INTERNAL_SERVER_ERROR).send(err);
      });
  } else {
    return res.status(UNAUTHORIZED).send('Invalid access token');
  }
})

export default router;
