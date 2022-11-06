import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { Logger } from '@shared/Logger';
import { json } from 'express';
import Workgroup from '@enums/workgroup.enum';

import { Guards } from '@shared/guards';

import { corsOpt, MSQLPool, noAvatarImageUrl, SQLQueries } from '@shared/constants';

const router = Router();

const { OK, INTERNAL_SERVER_ERROR, CONFLICT } = StatusCodes;
const { CHALLENGER, DEV, ADMIN, CFR, MAPPER, BACKUPER } = Workgroup;

const { GET_ADMIN_LIST, CHANGE_MAIN_GROUP, CHANGE_SECONDARY_GROUP } = SQLQueries;

router.get('/list', (req: any, res: any) => {
  Logger.log('default', 'GET │', req.connection.remoteAddress, req.user.username,`role: ${req.user.main_group}`, '-> ADMIN_LIST [', req.originalUrl, ']');
  MSQLPool.promise()
          .query(GET_ADMIN_LIST, [CHALLENGER, DEV, ADMIN, MAPPER, CFR, BACKUPER])
          .then(([rows]: any[]): void => {   
            for (let user of rows) {
              user.user_avatar = user.user_avatar ? `https://www.gta-liberty.ru/images/avatars/upload/${user.user_avatar}`
                                                  : noAvatarImageUrl;
            }
            res.send(rows);
          })
          .catch((err: any): void => {
            res.status(INTERNAL_SERVER_ERROR).send(err);
            Logger.log('error', `[${req.connection.remoteAddress}]`, 401, req.user.username, 'Failed admin list query');
            Logger.log('error', err);
          });
});

router.patch('/change-group', Guards.developerGuard, json(), corsOpt, (req: any, res: any) => {
  if (!req.body.id && !req.body.group) return res.sendStatus(CONFLICT);
  
  Logger.log('default', 'PATCH │', req.connection.remoteAddress, req.user.username,`role: ${req.user.main_group}`, '-> CHANGE_ADMIN_GROUP', `${req.body.username} : ${req.body.group}`, '[', req.originalUrl, ']');
  
  MSQLPool.promise()
          .query(CHANGE_MAIN_GROUP, [req.body.group, req.body.group, req.body.id])
          .then((): void => {
            res.status(OK)
               .send({ status: 'OK' });
          })
          .catch((err: any): void => {
            res.status(INTERNAL_SERVER_ERROR)
               .send(err);
            
               Logger.log('error', `[${req.connection.remoteAddress}]`, 401, req.user.username, `Failed to change ${req.body.username} admin status to ${req.body.group}`)
               Logger.log('error', err);
          });
});

router.patch('/change-secondary-group', Guards.developerGuard, json(), (req: any, res: any) => {
  if (!req.body.id && !req.body.group) return res.sendStatus(CONFLICT);
  
  Logger.log('default', 'PATCH │', req.connection.remoteAddress, req.user.username,`role: ${req.user.main_group}`, '-> CHANGE_SECONDARY_ADMIN_GROUP', `${req.body.username} : ${req.body.group}`, '[', req.originalUrl, ']');
  
  MSQLPool.promise()
          .query(CHANGE_SECONDARY_GROUP, [req.body.id, req.body.group, req.body.id])
          .then((): void => {
            res.status(OK)
               .send({ status: 'OK' });
          })
          .catch((err: any): void => {
            res.status(INTERNAL_SERVER_ERROR)
               .send(err);
            
            Logger.log('error', `[${req.connection.remoteAddress}]`, 401, req.user.username, `Failed to change ${req.body.username} admin status to ${req.body.group}`)
            Logger.log('error', err);
          });
});

export default router;
