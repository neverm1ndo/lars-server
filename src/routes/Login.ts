import StatusCodes from 'http-status-codes';
import { Response, Router } from 'express';
import { Logger } from '@shared/Logger';
import bodyParser from 'body-parser';

import { corsOpt, MSQLPool } from '@shared/constants';
import { checkPassword, generateToken, verifyToken, isWorkGroup } from '@shared/functions';

const router = Router();
const { OK, UNAUTHORIZED } = StatusCodes;



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
          avatar: 'http://www.gta-liberty.ru/images/avatars/upload/' + user.user_avatar,
          token: generateToken({ user: user.username, role: user.user_type, id: user.user_id, group_id: user.group_id })
        }));
      }
    })
    .catch((err: any): void => {
      res.status(UNAUTHORIZED).send(err);
      Logger.log('error', `[${req.connection.remoteAddress}]`, 401, 'Failed authorization ->', req.body.email)
      Logger.log('error', err);
    });
});
router.get('/user', corsOpt, (req: any, res: any): void => {
  if (!verifyToken(req.headers.authorization)) return res.status(401).send('Unauthorized access');
  MSQLPool.promise()
    .query("SELECT username, user_id, user_avatar, group_id FROM phpbb_users WHERE username = ?", [req.query.name])
    .then(([rows]: any[]): void => {
      let user = rows[0];
      res.status(OK).send(JSON.stringify({
        name: user.username,
        id: user.user_id,
        gr: user.group_id,
        avatar: 'http://www.gta-liberty.ru/images/avatars/upload/' + user.user_avatar
      }));
    })
    .catch((err: any): void => {
      res.status(UNAUTHORIZED).send(err);
      Logger.log('error', err);
    });
});

router.get('/check-token', (req: any, res: Response) => { // GET Checks token validation
  if (!req.headers.authorization) return res.status(401).send('Unauthorized access');
  if (verifyToken(req.headers.authorization)) {
    return res.status(OK).send('Access token is valid')
  } else {
    return res.status(UNAUTHORIZED).send('Invalid access token');
  }
})

export default router;
