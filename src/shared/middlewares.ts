import { Request, Response, NextFunction } from 'express';
import { isWorkGroup } from '@shared/functions';
import StatusCodes from 'http-status-codes';
import Workgroup from '@enums/workgroup.enum';

interface IUser extends Express.User {
  group_id: Workgroup
}

const { CHALLENGER, ADMIN, DEV, MAPPER, CFR, BACKUPER } = Workgroup;
const { OK, UNAUTHORIZED, INTERNAL_SERVER_ERROR, CONFLICT } = StatusCodes;

export const rejectUnauthorized = function (req: Request, res: Response, next: NextFunction) {
    if (!req.headers.authorization) return res.sendStatus(UNAUTHORIZED);
    next();
}

export const backuperGuard = function (req: any, res: Response, next: NextFunction) {
  if (!req.user) return res.sendStatus(UNAUTHORIZED);
  if (req.user.group_id !== DEV && req.user.group_id !== BACKUPER) { res.sendStatus(UNAUTHORIZED).end('Access denied for your workgroup: ' + isWorkGroup(req.user.group_id)); return; }
  next();
}
export const devGuard = function(req: any, res: Response, next: NextFunction) {
  if (!req.user) return res.sendStatus(UNAUTHORIZED);
  if (req.user.group_id !== DEV) { res.sendStatus(UNAUTHORIZED).end('Access denied for your workgroup: ' + isWorkGroup(req.user.group_id)); return; }
  next();
}
export const mapGuard = function (req: any, res: Response, next: NextFunction) {
  if (!req.user) return res.sendStatus(UNAUTHORIZED);
  if (req.user.group_id !== DEV && req.user.group_id !== MAPPER) { res.sendStatus(UNAUTHORIZED).end('Access denied for your workgroup: ' + isWorkGroup(req.user.group_id)); return; }
  next();
}
export const cfrGuard = function (req: any, res: Response, next: NextFunction) {
  if (!req.user) return res.sendStatus(UNAUTHORIZED);
  if (req.user.group_id !== DEV && req.user.group_id !== CFR) { res.sendStatus(UNAUTHORIZED).end('Access denied for your workgroup: ' + isWorkGroup(req.user.group_id)); return; }
  next();
}
