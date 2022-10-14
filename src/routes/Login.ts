import StatusCodes from 'http-status-codes';
import { Response, Router, json } from 'express';
import { Logger } from '@shared/Logger';

import { MSQLPool, noAvatarImageUrl } from '@shared/constants';
import { checkPassword, generateToken, verifyToken, isWorkGroup, decodeToken } from '@shared/functions';
import { corsOpt } from '@shared/constants';

const router = Router();
const { OK, UNAUTHORIZED, CONFLICT, INTERNAL_SERVER_ERROR } = StatusCodes;

router.post('/', corsOpt, json(), (req: any, res: any): void => {
 
  Logger.log('default', 'LOGIN', req.connection.remoteAddress);
  
  if (!req.body.email) { 
    return res.status(CONFLICT)
              .send(`E-mail form is empty`);
  }
  if (!req.body.password) { 
    return res.status(CONFLICT)
              .send(`Password form is empty`);
  }
  
  Logger.log('default', 'AUTH_TRY', req.connection.remoteAddress , req.body.email);
  
  MSQLPool.promise()
          .query("SELECT phpbb_users.user_id, phpbb_users.user_password, phpbb_users.username, phpbb_users.user_avatar, phpbb_users.user_email, phpbb_users.group_id AS main_group, role.secondary_group FROM phpbb_users INNER JOIN (SELECT phpbb_user_group.user_id, MAX(phpbb_user_group.group_id) as secondary_group FROM phpbb_users, phpbb_user_group WHERE phpbb_users.group_id BETWEEN 9 AND 14 AND phpbb_user_group.user_id = phpbb_users.user_id GROUP BY phpbb_user_group.user_id) AS role ON role.user_id = phpbb_users.user_id AND phpbb_users.user_email = ? LIMIT 1", [req.body.email])
          .then(([rows]: any[]): void => {
            const [user] = rows;

            const { main_group, username, secondary_group, user_avatar } = user;
            
            if (!checkPassword(req.body.password, user.user_password) || !isWorkGroup(main_group)) {
              Logger.log('default', `[${req.connection.remoteAddress}]`, `AUTH ${username} -> WORKGROUP ${isWorkGroup(main_group)} ->`, req.body.email);
              return res.status(UNAUTHORIZED)
                        .send(`In Workgroup: ${isWorkGroup(main_group)}`);
            }
            
            Logger.log('default', `[${req.connection.remoteAddress}]`, 'AUTH_SUCCESS', req.body.email, user.username);
                        
            res.status(OK)
               .send({
                  username,
                  id: user.user_id,
                  main_group,
                  secondary_group,
                  avatar: user_avatar ? `https://www.gta-liberty.ru/images/avatars/upload/${user_avatar}` : noAvatarImageUrl,
                  token: generateToken({
                    id: user.user_id,
                    username,
                    main_group,
                    secondary_group,
                  }),
              });
          })
          .catch((err: any): void => {
            res.status(INTERNAL_SERVER_ERROR)
               .send(err);
            
               Logger.log('error', `[${req.connection.remoteAddress}]`, INTERNAL_SERVER_ERROR, 'AUTH_FAIL ->', req.body.email)
               Logger.log('error', 'LOGIN', err);
          });
      });
      router.get('/user', corsOpt, (req: any, res: any): void => {
        if (!verifyToken(req.headers.authorization.split(' ')[1])) return res.status(UNAUTHORIZED).send('Unauthorized access');
        
        MSQLPool.promise()
                .query("SELECT username, user_id, user_avatar, group_id FROM phpbb_users WHERE username = ? LIMIT 1", [req.query.name])
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

router.get('/check-token', (req: any, res: Response) => { // GET Checks token validation
  if (!req.headers.authorization) {
    return res.status(UNAUTHORIZED)
              .send('Authorization token is empty');
  }
  
  const [_type, token ]: string[] = req.headers.authorization.split(' ');
  
  if (!verifyToken(token)) {
    return res.status(UNAUTHORIZED)
              .send('Invalid access token');
  }
  
  const user = decodeToken(token);
  
  Logger.log('default', 'TOKEN_VALIDATION', `[${req.connection.remoteAddress}]`, user?.username);
  
  MSQLPool.promise()
          .query("SELECT group_id FROM phpbb_users WHERE user_id = ?", [user?.id])
          .then(([rows]: any[]): void => {
            
            const { group_id } = rows[0]
            
            if (group_id != user?.main_group) throw 'Invalid access token';
            
            Logger.log('default', 'TOKEN_VALIDATION_SUCCESS' , `[${req.connection.remoteAddress}]`, user?.username);
            res.status(OK)
               .send('Access token is valid');
          })
          .catch((err: string) => {
            res.status(INTERNAL_SERVER_ERROR)
               .send(err);
          });
      })

export default router;
