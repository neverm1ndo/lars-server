import StatusCodes from 'http-status-codes';
import { Router, json } from 'express';

import { MSQLPool, SQLQueries } from '@shared/constants';
import { corsOpt as cors } from '@shared/constants';
import passport from 'passport';
import { Guards } from '@shared/guards';
import { Logger } from '@shared/Logger';
import { checkPassword, isWorkGroup, getAvatarURL } from '@shared/functions';
import { JWT } from '@shared/jwt';
import { IJwtPayload } from '@interfaces/user';

const router = Router();
const { OK, INTERNAL_SERVER_ERROR, CONFLICT, UNAUTHORIZED } = StatusCodes;

const { GET_USER_BY_NAME, GET_USER } = SQLQueries;

router.post('/login', cors, json(), (req: any, res: any): void => {

  const { email, password } = req.body;

  if (!email || !password) {
    return res.sendStatus(CONFLICT);
  }

  MSQLPool.promise()
          .query(GET_USER, [req.body.email])
          .then(([rows]: any[]) => {
            const [user] = rows;
            
            const { main_group, username, secondary_group, user_avatar, user_password, user_id } = user;

            if (!checkPassword(password, user_password) || !isWorkGroup(main_group)) {
              return res.sendStatus(UNAUTHORIZED);
            }

            const payload: IJwtPayload = {
              id: user_id,
              username,
              main_group,
              secondary_group,
            };
            
            res.status(OK)
               .send({
                ...payload,
                token: JWT.generateToken(payload),
                avatar: getAvatarURL(user_avatar),
               });
          })
          .catch((err: any) => {
            res.sendStatus(INTERNAL_SERVER_ERROR)
               .send(err.message);
          });
});

router.get('/identity', passport.authenticate('jwt'), Guards.rejectUnauthorized, cors, (req: any, res: any): void => {
  res.sendStatus(OK)
});

router.get('/logout', cors, ((req: any, res: any) => {
  req.session.destroy();
  res.sendStatus(OK);
}));

router.get('/user', passport.authenticate('jwt'), cors, (req: any, res: any): void => {
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
                  avatar: getAvatarURL(user_avatar),
                });
          })
          .catch((err: any): void => {
            res.status(INTERNAL_SERVER_ERROR)
                .send(err.message);
            Logger.log('error', 'GET_USER', err);
          });
});

export default router;
