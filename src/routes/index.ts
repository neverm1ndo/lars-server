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

// Init router and path
const router = Router();

// Add sub-routes
router.use('/login', LoginRouter);
router.use('/logs', rejectUnauthorized, LogsRouter);
router.use('/maps', rejectUnauthorized, mapGuard, MapsRouter);
router.use('/configs', rejectUnauthorized, cfrGuard, ConfigsRouter);
router.use('/admins', rejectUnauthorized, devGuard , AdminsRouter);
router.use('/backups', rejectUnauthorized, backuperGuard, BackupsRouter);
router.use('/stats', rejectUnauthorized, StatsRouter);
router.use('/utils', rejectUnauthorized, devGuard, UtilsRouter);

// Export the base-router
export default router;
