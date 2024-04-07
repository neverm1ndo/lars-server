import StatusCodes from 'http-status-codes';
import { Response, Request, Router } from 'express';

import { logger } from '@shared/logger';
import { IRawSearchOptions, SearchEngine } from '../SearchEngine';
import { ILogLine } from '@interfaces/logline';

const LOGGER_PREFIX = '[LOGS]';

const router = Router();
const { INTERNAL_SERVER_ERROR } = StatusCodes;

const engine: SearchEngine = new SearchEngine();

async function search(req: Request, res: Response, type: string): Promise<void> {
    logger.log(LOGGER_PREFIX, `[${req.method}]`, type, `(${req.socket.remoteAddress})`, req.user?.username, req.query.page, req.query.lim, req.query.q);

    try {
        const result: ILogLine[] = await engine.search(req.query as Record<string, any> as IRawSearchOptions);

        res.send(result);
    } catch (err: any) {
        logger.err(LOGGER_PREFIX, `${type}_FAIL`, req.query ,`::${err.message}::`);

        res.status(INTERNAL_SERVER_ERROR)
           .send(err.message);
    }
}

router.get('/last', (req: Request, res: Response) => {
    void search(req, res, 'LAST');
});

router.get('/search', (req: Request, res: Response) => {    
    if (!req.query.q) {

        const query = req.query as Record<string, any> as IRawSearchOptions;

        const redirectURL: URL = new URL(`${req.baseUrl}/last`, `${req.protocol}://${process.env.HOST}`);
        for (const param in query) {
            redirectURL.searchParams.append(param, query[param as keyof IRawSearchOptions]!.toString());
        }

        return res.redirect(redirectURL.toString());
    }
  
    void search(req, res, 'SEARCH');
});

export default router;
