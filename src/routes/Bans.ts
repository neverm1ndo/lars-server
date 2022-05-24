import StatusCodes from 'http-status-codes';
import { Router } from 'express';

const router = Router();

const { NOT_IMPLEMENTED, MOVED_PERMANENTLY } = StatusCodes;

router.get('/cn', (_req: any, res: any) => {
  return res.send(NOT_IMPLEMENTED);
});

router.get('/expire-token', (_req: any, res: any) => {
  return res.send(MOVED_PERMANENTLY);
});

export default router;
