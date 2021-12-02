import StatusCodes from 'http-status-codes';
import { Response, Router } from 'express';
import { Logger } from '@shared/Logger';
import bodyParser from 'body-parser';

import { corsOpt, MSQLPool } from '@shared/constants';
import { checkPassword, generateToken, verifyToken, isWorkGroup, decodeToken } from '@shared/functions';

const router = Router();
const { OK, UNAUTHORIZED, BAD_REQUEST } = StatusCodes;



router.post('/', corsOpt, bodyParser.json(), (req: any, res: any): void => {
  Logger.log('default', 'Trying to authorize', req.body.email);
  MSQLPool.promise()
    .query("SELECT username, user_id, user_type, user_avatar, user_password, group_id FROM phpbb_users WHERE user_email = ?", [req.body.email])
    .then(([rows]: any[]): void => {
      let user = rows[0];
      if (checkPassword(req.body.password, user.user_password) && isWorkGroup(user.group_id)) {
        Logger.log('default', `[${req.connection.remoteAddress}]`, 'Successfull authorization ->', req.body.email);
        res.status(OK).send(JSON.stringify({
          name: user.username,
          role: user.user_type,
          id: user.user_id,
          gr: user.group_id,
          avatar: 'https://www.gta-liberty.ru/images/avatars/upload/' + user.user_avatar,
          token: generateToken({ user: user.username, role: user.user_type, id: user.user_id, group_id: user.group_id })
        }));
      } else {
        Logger.log('default', `[${req.connection.remoteAddress}]`, `Authorization from ${user.username}: WORKGROUP ${isWorkGroup(user.group_id)}->`, req.body.email);
        res.status(UNAUTHORIZED).send(`In Workgroup: ${isWorkGroup(user.group_id)}`);
      }
    })
    .catch((err: any): void => {
      res.status(UNAUTHORIZED).send(err);
      Logger.log('error', `[${req.connection.remoteAddress}]`, 401, 'Failed authorization ->', req.body.email)
      Logger.log('error', err);
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
        avatar: 'https://www.gta-liberty.ru/images/avatars/upload/' + user.user_avatar
      }));
    })
    .catch((err: any): void => {
      res.status(UNAUTHORIZED).send(err);
      Logger.log('error', err);
    });
});

router.get('/check-token', (req: any, res: Response) => { // GET Checks token validation
  if (!req.headers.authorization) return res.status(BAD_REQUEST).send('Authorization token is empty');
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
        res.status(UNAUTHORIZED).send(err);
      });
  } else {
    return res.status(UNAUTHORIZED).send('Invalid access token');
  }
})

export default router;
