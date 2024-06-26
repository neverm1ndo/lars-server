import { Handler, Router } from 'express';
import LoginRouter from './Login';
import BansRouter from './Bans';
import LogsRouter from './Logs';
import MapsRouter from './Maps';
import ConfigsRouter from './Configs';
import UtilsRouter from './Utils';
import AdminsRouter from './Admins';
import BackupsRouter from './Backups';
import StatsRouter from './Stats';
import * as Guards from '@shared/middlewares/guards';
import { corsOpt as cors } from '@shared/constants';
import passport from 'passport';

// Init router and path
const router = Router();
      router.use('/auth', cors, LoginRouter);

// LARS API router 
const larsRouter = Router();
      larsRouter.use('/bans', BansRouter);
      larsRouter.use('/logs', LogsRouter);
      larsRouter.use('/maps', Guards.mapperGuard as Handler, MapsRouter);
      larsRouter.use('/configs', Guards.configuratorGuard as Handler, ConfigsRouter);
      larsRouter.use('/admins', AdminsRouter);
      larsRouter.use('/backups', Guards.backuperGuard as Handler, BackupsRouter);
      larsRouter.use('/stats', StatsRouter);
      larsRouter.use('/utils', Guards.developerGuard as Handler, UtilsRouter);

router.use(
      '/lars',
      cors,
      passport.authenticate('jwt', { session: false }) as Handler,
      larsRouter
);

// Export the base-router
export default router;
