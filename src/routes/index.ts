import { Router } from 'express';
import LoginRouter from './Login';
import LogsRouter from './Logs';
import MapsRouter from './Maps';
import ConfigsRouter from './Configs';
import UtilsRouter from './Utils';
import AdminsRouter from './Admins';
import BackupsRouter from './Backups';
import StatsRouter from './Stats';

// Init router and path
const router = Router();

// Add sub-routes
router.use('/login', LoginRouter);
router.use('/logs', LogsRouter);
router.use('/maps', MapsRouter);
router.use('/configs', ConfigsRouter);
router.use('/utils', UtilsRouter);
router.use('/admins', AdminsRouter);
router.use('/backups', BackupsRouter);
router.use('/stats', StatsRouter);

// Export the base-router
export default router;
