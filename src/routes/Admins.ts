import StatusCodes from 'http-status-codes';
import { Router } from 'express';
import { json } from 'express';
import Workgroup from '@enums/workgroup.enum';

import { Guards } from '@shared/guards';

import { corsOpt, MSQLPool, SQLQueries, logger } from '@shared/constants';
import { getAvatarURL } from '@shared/functions';
import { AdminUserData } from '@entities/admin.entity';

const router = Router();

const { OK, INTERNAL_SERVER_ERROR, CONFLICT } = StatusCodes;
const { CHALLENGER, DEV, ADMIN, CFR, MAPPER, BACKUPER } = Workgroup;

const { GET_ADMIN_LIST, CHANGE_MAIN_GROUP, CHANGE_SECONDARY_GROUP, ADD_SECONDARY_GROUP, REMOVE_SECONDARY_GROUP } = SQLQueries;

const LOGGER_PREFIX: string = '[ADMIN]';

router.get('/list', async (req: any, res: any) => {
  logger.log(LOGGER_PREFIX, '[GET]', 'ADMIN_LIST', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group]);

  try {
    const rawList: AdminUserData[] = await MSQLPool.promise()
                                                  .query(GET_ADMIN_LIST)
                                                  .then(([rows]) => rows as AdminUserData[]);

    const list = rawList.reduce<AdminUserData[]>((acc, curr) => {
      const adminIndex = acc.findIndex(({ user_id }) => curr.user_id === user_id);

      if (adminIndex !== -1) {
        (acc[adminIndex].prefrences as Set<number>).add(curr.secondary_group);
      } else {
        if (!curr.prefrences) {
          curr.prefrences = new Set(curr.main_group !== curr.secondary_group ? [curr.secondary_group] : []);
        }
        acc.push(curr);
      }

      return acc;
    }, []).map((admin) => {
      admin.prefrences = Array.from(admin.prefrences as Set<number>);
      admin.user_avatar = getAvatarURL(admin.user_avatar);

      return admin;
    });

    res.send(list);
  } catch (err: any) {
    res.status(INTERNAL_SERVER_ERROR).send(err.message);
    logger.err(LOGGER_PREFIX, '[GET]' ,`(${req.connection.remoteAddress})`, 401, req.user.username, 'Failed admin list query');
    logger.err(LOGGER_PREFIX, '[GET]', err);
  }
});

router.post('/add-group', Guards.developerGuard, json(), corsOpt, async (req: any, res: any) => {
  logger.log(LOGGER_PREFIX, '[POST]', 'ADD_SECONDARY_GROUP', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], `{${req.body.id} : ${Workgroup[req.body.group]}}`);

  try {
    if (!req.body.id && !req.body.group) {
      logger.err(LOGGER_PREFIX, '[POST]', 'ADD_SECONDARY_GROUP', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], `{${req.body.id} : ${Workgroup[req.body.group]}}`, CONFLICT);
      
      throw CONFLICT;
    }

    await MSQLPool.promise()
                  .query(ADD_SECONDARY_GROUP, [req.body.id, req.body.group]);

    res.status(OK)
       .send({ status: 'OK' });
  } catch(err) {
    res.sendStatus(err);
  }
});

router.delete('/delete-group', Guards.developerGuard, json(), corsOpt, async (req: any, res: any) => {
  logger.log(LOGGER_PREFIX, '[POST]', 'DELETE_SECONDARY_GROUP', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], `{${req.body.id} : ${Workgroup[req.body.group]}}`);

  try {
    if (!req.body.id && !req.body.group) {
      logger.err(LOGGER_PREFIX, '[POST]', 'DELETE_SECONDARY_GROUP', `(${req.connection.remoteAddress})`, req.user.username, Workgroup[req.user.main_group], `{${req.body.id} : ${Workgroup[req.body.group]}}`, CONFLICT);
      
      throw CONFLICT;
    }

    await MSQLPool.promise()
                  .query(REMOVE_SECONDARY_GROUP, [req.body.id, req.body.group]);

    res.status(OK)
       .send({ status: 'OK' });
  } catch(err) {
    res.sendStatus(err);
  }
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
