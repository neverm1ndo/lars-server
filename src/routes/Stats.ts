import { Router } from 'express';
import StatusCodes from 'http-status-codes';

import { OnlineMetric, OnlineMetricChart } from 'src/Metrics';
import { logger } from '@shared/constants';
import Workgroup from '@enums/workgroup.enum';

const router = Router();

const { NOT_IMPLEMENTED, NOT_FOUND } = StatusCodes;

const online: OnlineMetric = new OnlineMetric();

type MetricPeriod = 'day' | 'week' | 'month' | 'year';

function getOnlineChart(period: MetricPeriod): Promise<OnlineMetricChart | null> {
  switch (period) {
    case 'day': {
      const date: Date = new Date();
      return online.getDailyOnlineChart(date);
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

router.get('/online/chart/:period', async (req: any, res: any) => {
  logger.log('[STATS]','[GET]', 'ONLINE_STAT', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], req.params.period);
  try {
    const chart: OnlineMetricChart | null = await getOnlineChart(req.params.period);
    if (!chart) throw new Error('Chart find err');

    res.send(chart);
  } catch (err: any) {
    logger.err('[STATS]','[GET]', 'ONLINE_STAT_FAIL', `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user?.main_group as number], req.params.period, err.message);
    res.sendStatus(NOT_FOUND);
  };
});

router.get('/chat', (req: any, res: any) => {
  res.sendStatus(NOT_IMPLEMENTED);
});

export default router;
