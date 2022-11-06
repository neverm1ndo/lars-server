import StatusCodes from 'http-status-codes';
import { Response, Router, json } from 'express';

import { noAvatarImageUrl } from '@shared/constants';
import { corsOpt } from '@shared/constants';
import passport from 'passport';
import { Guards } from '@shared/guards';

const router = Router();
const { OK, INTERNAL_SERVER_ERROR } = StatusCodes;

router.post('/login', corsOpt, json(), passport.authenticate('login'), (req: any, res: any): void => {
    const { user_id, username, main_group, secondary_group, user_avatar } = req.user;
    res.send({
      avatar: user_avatar ? `https://www.gta-liberty.ru/images/avatars/upload/${user_avatar}` : noAvatarImageUrl,
      main_group,
      secondary_group,
      username,
      user_id,
    });
});

router.get('/identity', Guards.rejectUnauthorized, corsOpt, (req: any, res: any): void => {
  const { user_id, user_avatar, user_email, main_group, secondary_group } = req.session.passport.user;
  res.send({
    id: user_id,
    avatar: user_avatar,
    email: user_email,
    main_group,
    secondary_group,
  });
});

router.get('/logout', corsOpt, ((req: any, res: any) => {
  req.session.destroy();
  res.sendStatus(OK).end();
}));

// router.get('/user', corsOpt, passport.authenticate('jwt', { session: false }), (req: any, res: any): void => {
//   MSQLPool.promise()
//           .query("SELECT username, user_id, user_avatar, group_id FROM phpbb_users WHERE username = ? LIMIT 1", [req.query.name])
//           .then(([rows]: any[]): void => {
//             const [user] = rows;
//             const { main_group, username, secondary_group, user_avatar } = user;
//             res.status(OK)
//                 .send({
//                   username,
//                   id: user.user_id,
//                   main_group,
//                   secondary_group,
//                   avatar: user_avatar ? `https://www.gta-liberty.ru/images/avatars/upload/${user_avatar}` : noAvatarImageUrl,
//                 });
//           })
//           .catch((err: any): void => {
//             res.status(INTERNAL_SERVER_ERROR)
//                 .send(err);
//             Logger.log('error', 'GET_USER', err);
//           });
// });

// router.get('/validate', passport.authenticate('jwt', { session: false }), (req: any, res: Response) => { // GET Checks token validation
//   MSQLPool.promise()
//           .query("SELECT group_id FROM phpbb_users WHERE user_id = ?", [req.user.id])
//           .then(([rows]: any[]): void => {
            
//             const { group_id } = rows[0];
            
//             if (group_id != req.user.main_group) throw 'Invalid access token';
            
//             Logger.log('default', 'TOKEN_VALIDATION_SUCCESS' , `[${req.connection.remoteAddress}]`, req.user.username);
//             res.status(OK)
//                .send('Access token is valid');
//           })
//           .catch((err: string) => {
//             res.status(INTERNAL_SERVER_ERROR)
//                .send(err);
//           });
//       })

export default router;
