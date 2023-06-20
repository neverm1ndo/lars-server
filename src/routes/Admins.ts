import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { json } from 'express';
import Workgroup from '@enums/workgroup.enum';

import { Guards } from '@shared/guards';

import { corsOpt, MSQLPool, SQLQueries, logger } from '@shared/constants';
import { getAvatarURL } from '@shared/functions';

const router = Router();

const { OK, INTERNAL_SERVER_ERROR, CONFLICT } = StatusCodes;
const { CHALLENGER, DEV, ADMIN, CFR, MAPPER, BACKUPER } = Workgroup;

const { GET_ADMIN_LIST, CHANGE_MAIN_GROUP, CHANGE_SECONDARY_GROUP } = SQLQueries;

const LOGGER_PREFIX: string = '[ADMIN]';

router.get('/list', (req: any, res: any) => {
  logger.log(LOGGER_PREFIX, '[GET]', 'ADMIN_LIST', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group]);
  MSQLPool.promise()
          .query(GET_ADMIN_LIST, [CHALLENGER, DEV, ADMIN, MAPPER, CFR, BACKUPER])
          .then(([rows]: any[]): void => {   
            for (let user of rows) {
              user.user_avatar = getAvatarURL(user.user_avatar);
            }
            res.send(rows);
          })
          .catch((err: any): void => {
            res.status(INTERNAL_SERVER_ERROR).send(err.message);
            logger.err(LOGGER_PREFIX, '[GET]' ,`(${req.connection.remoteAddress})`, 401, req.user.username, 'Failed admin list query');
            logger.err(LOGGER_PREFIX, '[GET]', err);
          });
});

router.patch('/change-group', Guards.developerGuard, json(), corsOpt, (req: any, res: any) => {
  logger.log(LOGGER_PREFIX, '[PATCH]', 'CHANGE_ADMIN_GROUP', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], `{${req.body.username} : ${Workgroup[req.body.group]}}`);
  
  if (!req.body.id && !req.body.group) {
    logger.err(LOGGER_PREFIX, '[PATCH]', 'CHANGE_ADMIN_GROUP_FAIL', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], `{${req.body.username} : ${Workgroup[req.body.group]}}`, CONFLICT);
    return res.sendStatus(CONFLICT);
  }
  
  MSQLPool.promise()
          .query(CHANGE_MAIN_GROUP, [req.body.group, req.body.group, req.body.id])
          .then((): void => {
            logger.log(LOGGER_PREFIX, '[PATCH]', 'CHANGE_ADMIN_GROUP_SUCCESS', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], `{${req.body.username} : ${Workgroup[req.body.group]}}`);
            res.status(OK)
               .send({ status: 'OK' });
          })
          .catch((err: any): void => {
            res.status(INTERNAL_SERVER_ERROR)
               .send(err.message);
            
               logger.err('[ADMIN][PATCH]', `[${req.connection.remoteAddress}]`, req.user.username, `{${req.body.username} : ${Workgroup[req.body.group]}} FAIL`, err.code || 0);
               logger.err('[ADMIN][PATCH]', err);
          });
});

router.patch('/change-secondary-group', Guards.developerGuard, json(), (req: any, res: any) => {
  logger.log(LOGGER_PREFIX, '[PATCH]', 'CHANGE_ADMIN_SECONDARY_GROUP', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], `{${req.body.username} : ${Workgroup[req.body.group]}}`);
  if (!req.body.id && !req.body.group) {
    logger.err(LOGGER_PREFIX, '[PATCH]', 'CHANGE_ADMIN_SECONDARY_GROUP_FAIL', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], `{${req.body.username} : ${Workgroup[req.body.group]}}`, CONFLICT);
    return res.sendStatus(CONFLICT);
  }
  
  MSQLPool.promise()
          .query(CHANGE_SECONDARY_GROUP, [req.body.id, req.body.group, req.body.id])
          .then((): void => {
            logger.log(LOGGER_PREFIX, '[PATCH]', 'CHANGE_ADMIN_SECONDARY_GROUP_SUCCESS', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], `{${req.body.username} : ${Workgroup[req.body.group]}}`);
            res.status(OK)
               .send({ status: 'OK' });
          })
          .catch((err: any): void => {
            res.status(INTERNAL_SERVER_ERROR)
               .send(err);

            logger.err(LOGGER_PREFIX, '[PATCH]', 'CHANGE_ADMIN_SECONDARY_GROUP', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], `{${req.body.username} : ${Workgroup[req.body.group]}} FAIL`, err.code || 0);
            logger.err('[ADMIN][PATCH]', err);
          });
});

export default router;
