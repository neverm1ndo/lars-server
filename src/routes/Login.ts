import StatusCodes from 'http-status-codes';
import { Handler, NextFunction, Router, json } from 'express';

import { MSQLPool, SQLQueries } from '@shared/sql';
import { corsOpt as cors } from '@shared/constants';
import passport from 'passport';
import * as Guards from '@shared/middlewares/guards';
import * as JWT from '@shared/jwt';

import { getAvatarURL } from '@shared/functions';
import { IJwtPayload } from '@interfaces/user';
import { io } from '../index';
import Workgroup from '@enums/workgroup.enum';
import { logger } from '@shared/logger';

const LOGGER_PREFIX = '[AUTH]';

const router = Router();
const { OK, INTERNAL_SERVER_ERROR } = StatusCodes;

const { GET_USER_BY_NAME } = SQLQueries;

router.post('/login', cors, json(), (req: any, res: any, next: NextFunction): void => {
    passport.authenticate('local', (err, user) => {
        try {
            logger.log(LOGGER_PREFIX, '[POST]', 'LOGIN', `(${req.socket.remoteAddress})`, user?.username || 'no_username', Workgroup[req.user?.main_group] || 'no_group');
            
            if (err || !user) {
                logger.err(LOGGER_PREFIX, '[POST]', 'LOGIN_FAIL', `(${req.socket.remoteAddress})`, user?.username || 'no_username', Workgroup[req.user?.main_group], `ERROR_OCCURED::${err?.message || 'no_username'}::`);
                
                return next(new Error('An error occured.'));
            }

            req.login(user, { session: true }, (error: any) => {
                if (error) {
                    logger.err(LOGGER_PREFIX, '[POST]', 'LOGIN_FAIL', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group], `ERROR_OCCURED::${error.message || 'no_username'}::`);
                    return next(error);
                }

                const { main_group, username, permissions, user_avatar, user_id } = user;
                
                const payload: IJwtPayload = {
                    id: user_id,
                    username,
                    main_group,
                    permissions
                };

                res.status(OK)
                    .send({
                        ...payload,
                        token: JWT.generateToken(payload),
                        avatar: getAvatarURL(user_avatar as string || ''),
                    });
            })
        } catch (error: any) {
            logger.err(LOGGER_PREFIX, '[POST]', 'LOGIN_FAIL', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group], `ERROR_OCCURED::${error.message}::`);

            return next(error);
        }
    })(req, res, next);
});

router.get('/identity', Guards.rejectUnauthorized, cors, (_req: any, res: any): void => {
  res.sendStatus(OK);
});

const reqLogout = function(req: any, _res: any, next: NextFunction) {
    req.logout((err: any) => {
        if (err) return next(err);
        
        next();
    });
};

router.post('/logout', cors, passport.authenticate('jwt') as Handler, reqLogout, ((req: any, res: any) => {
    const socketId: string = req.session.socketId;

    logger.err(LOGGER_PREFIX, '[POST]', 'LOGIN_FAIL', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number]);

    if (socketId && io.of("/").sockets.get(socketId)) {
        logger.err(LOGGER_PREFIX, '[SOCKET]', 'FORCE_CLOSE', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number]);
        io.of("/").sockets.get(socketId)!.disconnect(true);
    }

    req.session.destroy();

    res.status(OK)
        .send('bye');
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
                        avatar: getAvatarURL(user_avatar as string || ''),
                    });
            })
            .catch((err: any): void => {
                logger.err(LOGGER_PREFIX, '[GET]', 'USER', err.message);
                
                res.status(INTERNAL_SERVER_ERROR)
                    .send(err.message);
            });
});

export default router;
