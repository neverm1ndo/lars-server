import StatusCodes from 'http-status-codes';
import { Router, json, Request } from 'express';

import { MSQLPool, SQLQueries } from '@shared/constants';
import { corsOpt as cors } from '@shared/constants';
import passport from 'passport';
import { Guards } from '@shared/guards';
import { Logger } from '@shared/Logger';
import { checkPassword, isWorkGroup, getAvatarURL } from '@shared/functions';
import { JWT } from '@shared/jwt';
import { IJwtPayload } from '@interfaces/user';
import { io } from '../index';
import jwt from 'express-jwt';

interface IRequest extends Request {
  session: any;
}

const router = Router();
const { OK, INTERNAL_SERVER_ERROR, CONFLICT, UNAUTHORIZED } = StatusCodes;

const { GET_USER_BY_NAME, GET_USER } = SQLQueries;

router.post('/login', cors, json(), (req: any, res: any, next: (err?: any) => any): void => {
  passport.authenticate('local', async (err, user, _info) => {
    try {
      if (err || !user) return next(new Error('An error occured.'));
      req.login(user, { session: true }, async (error: any) => {
        if (error) return next(error);
        
        const { main_group, username, secondary_group, user_avatar, user_password, user_id } = user;
        
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
    } catch (error) {
      return next(error);
    }
  })(req, res, next);
});

router.get('/identity', Guards.rejectUnauthorized, cors, (req: any, res: any): void => {
  res.sendStatus(OK)
});

const reqLogout = function(req: any, res: any, next: (c?: any) => any) {
  req.logout(function(err: any) {
    if (err) return next(err);
    next();
  });
};

router.post('/logout', cors, passport.authenticate('jwt'), reqLogout, ((req: IRequest, res: any) => {
  const socketId = req.session.socketId;
  if (socketId && io.of("/").sockets.get(socketId)) {
    console.log(`forcefully closing socket ${socketId}`);
    io.of("/").sockets.get(socketId)!.disconnect(true);
  };
  req.session.destroy();
  res.status(OK).send('bye');
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
