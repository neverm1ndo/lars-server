import { Response, Router, Request } from 'express';
import StatusCodes from 'http-status-codes';

import { OnlineMetricChart } from '../Metrics';
import { onlineMetric } from '@shared/constants';
import Workgroup from '@enums/workgroup.enum';
import { logger } from '@shared/logger';

const router = Router();

const { NOT_IMPLEMENTED, NOT_FOUND } = StatusCodes;

// const online: OnlineMetric = new OnlineMetric();

type MetricPeriod = 'day' | 'week' | 'month' | 'year';

function getOnlineChart(period: MetricPeriod): Promise<OnlineMetricChart | null> {
    switch (period) {
        case 'day': {
            const date: Date = new Date();
            return onlineMetric.getDailyOnlineChart(date);
        }
        // case 'week': {

        // }
        // case 'month': {

        // }
        // case 'year': {

        // }
        default: return Promise.reject(null);
    }
} 

router.get('/online/chart/:period', (req: Request, res: Response) => {
    logger.log('[STATS]','[GET]', 'ONLINE_STAT', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], req.params.period);

    void (async() => {
        try {
            const chart: OnlineMetricChart | null = await getOnlineChart(req.params.period as MetricPeriod);
            if (!chart) throw new Error('Chart find err');

            return void res.send(chart);
        } catch (err: any) {
            logger.err('[STATS]','[GET]', 'ONLINE_STAT_FAIL', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], req.params.period, err.message);
            
            return void res.sendStatus(NOT_FOUND);
        }
    })();
});

router.get('/chat', (req: Request, res: Response) => {
  res.sendStatus(NOT_IMPLEMENTED);
});

export default router;
