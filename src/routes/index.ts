import { Router } from 'express';
import LoginRouter from './Login';
import LogsRouter from './Logs';
import MapsRouter from './Maps';
import ConfigsRouter from './Configs';
import UtilsRouter from './Utils';
import AdminsRouter from './Admins';
import BackupsRouter from './Backups';
import StatsRouter from './Stats';
import { rejectUnauthorized, backuperGuard, devGuard, cfrGuard, mapGuard } from '@shared/middlewares';
import { corsOpt } from '@shared/constants';

// Init router and path
const router = Router();

// Add sub-routes
router.use('/login', LoginRouter);
router.use('/logs', corsOpt, rejectUnauthorized, LogsRouter);
router.use('/maps', corsOpt, rejectUnauthorized, mapGuard, MapsRouter);
router.use('/configs', corsOpt, rejectUnauthorized, cfrGuard, ConfigsRouter);
router.use('/admins', corsOpt, rejectUnauthorized, devGuard , AdminsRouter);
router.use('/backups', corsOpt, rejectUnauthorized, backuperGuard, BackupsRouter);
router.use('/stats', corsOpt, rejectUnauthorized, StatsRouter);
router.use('/utils', corsOpt, rejectUnauthorized, devGuard, UtilsRouter);

// Export the base-router
export default router;
