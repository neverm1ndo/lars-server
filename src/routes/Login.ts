import StatusCodes from 'http-status-codes';
import { Response, Router, json } from 'express';

import { MSQLPool, noAvatarImageUrl, SQLQueries } from '@shared/constants';
import { corsOpt as cors } from '@shared/constants';
import passport from 'passport';
import { Guards } from '@shared/guards';
import { Logger } from '@shared/Logger';

const router = Router();
const { OK, INTERNAL_SERVER_ERROR } = StatusCodes;

const { GET_USER_BY_NAME } = SQLQueries;

router.post('/login', cors, json(), passport.authenticate('login'), (req: any, res: any): void => {
    const { user_id, username, main_group, secondary_group, user_avatar } = req.user;
    res.send({
      avatar: user_avatar ? `https://www.gta-liberty.ru/images/avatars/upload/${user_avatar}` : noAvatarImageUrl,
      main_group,
      secondary_group,
      username,
      user_id,
    });
});

router.get('/identity', Guards.rejectUnauthorized, cors, (req: any, res: any): void => {
  const { user_id, user_avatar, user_email, main_group, secondary_group } = req.session.passport.user;
  res.send({
    id: user_id,
    avatar: user_avatar,
    email: user_email,
    main_group,
    secondary_group,
  });
});

router.get('/logout', cors, ((req: any, res: any) => {
  req.session.destroy();
  res.sendStatus(OK).end();
}));

router.get('/user', Guards.rejectUnauthorized, cors, (req: any, res: any): void => {
  MSQLPool.promise()
          .query(GET_USER_BY_NAME, [req.query.name])
          .then(([rows]: any[]): void => {
            const [user] = rows;
            const { main_group, username, secondary_group, user_avatar } = user;
            res.status(OK)
                .send({
                  username,
                  id: user.user_id,
                  main_group,
                  secondary_group,
                  avatar: user_avatar ? `https://www.gta-liberty.ru/images/avatars/upload/${user_avatar}` : noAvatarImageUrl,
                });
          })
          .catch((err: any): void => {
            res.status(INTERNAL_SERVER_ERROR)
                .send(err);
            Logger.log('error', 'GET_USER', err);
          });
});

export default router;
