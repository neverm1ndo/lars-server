import StatusCodes from 'http-status-codes';
import { Router } from 'express';

import { logger } from '@shared/constants';
import Workgroup from '@enums/workgroup.enum';
import { IRawSearchOptions, SearchEngine } from '../SearchEngine';
import { ILogLine } from '@interfaces/logline';

const LOGGER_PREFIX = '[LOGS]';

const router = Router();
const { INTERNAL_SERVER_ERROR } = StatusCodes;

const engine: SearchEngine = new SearchEngine();

async function search(req: any, res: any, type: string): Promise<void> {
  logger.log(LOGGER_PREFIX, `[${req.method}]`, type, `(${req.socket.remoteAddress})`, req.user?.username, Workgroup[req.user!.main_group], req.query.page, req.query.lim, req.query.q);
  
  try {
    const result: ILogLine[] = await engine.search(req.query as IRawSearchOptions);

    res.send(result);
  } catch (err: any) {
    logger.err(LOGGER_PREFIX, `${type}_FAIL`, req.query ,`::${err.message}::`);
    
    res.status(INTERNAL_SERVER_ERROR)
       .send(err.message);
  }
}

router.get('/last', async (req: any, res: any) => {
  search(req, res, 'LAST');
});

router.get('/search', async (req: any, res: any) => {
  if (!req.query.q) {
    const redirectURL: URL = new URL(`${req.baseUrl}/last`, `${req.protocol}://${process.env.HOST}`);
          for (let param in req.query) {
            redirectURL.searchParams.append(param, req.query[param]);
          };
    return res.redirect(redirectURL);
  }
  
  search(req, res, 'SEARCH');
});

export default router;
