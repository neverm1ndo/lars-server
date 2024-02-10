import { Request, Response, NextFunction } from 'express';
import { isWorkGroup } from '@shared/functions';
import StatusCodes from 'http-status-codes';
import Workgroup from '@enums/workgroup.enum';
import { intersection } from 'lodash';

interface IUser extends Express.User {
  main_group: Workgroup;
  permissions: Workgroup[];
}

const { DEV, MAPPER, CFR, BACKUPER } = Workgroup;
const { UNAUTHORIZED } = StatusCodes;

const ALLOWED_GROUPS = {
  BACKUPS: [DEV, BACKUPER],
  MAPS: [DEV, MAPPER],
  CONFIGURATIONS: [DEV, CFR]
}

export namespace Guards {
  export const rejectUnauthorized = function (req: Request, res: Response, next: NextFunction) {
      if (!req.user) return res.sendStatus(UNAUTHORIZED);
      console.log(req.user);
      next();
  };
  
  export const backuperGuard = function({ user }: any, res: Response, next: NextFunction) {
    if (!user) return res.sendStatus(UNAUTHORIZED);
    if (!intersection(user.permissions, ALLOWED_GROUPS.BACKUPS).length) { res.status(UNAUTHORIZED).send('Access denied for your workgroup: ' + isWorkGroup(user.main_group)); return; }
    next();
  };
  
  export const developerGuard = function({ user }: any, res: Response, next: NextFunction) {
    if (!user) return res.sendStatus(UNAUTHORIZED);
    if (user.main_group !== DEV) { res.status(UNAUTHORIZED).send('Access denied for your workgroup: ' + isWorkGroup(user.main_group)); return; }
    next();
  };
  
  export const mapperGuard = function({ user }: any, res: Response, next: NextFunction) {
    if (!user) return res.sendStatus(UNAUTHORIZED);
    if (!intersection(user.permissions, ALLOWED_GROUPS.MAPS).length) { 
      res.status(UNAUTHORIZED).send('Access denied for your workgroup: ' + isWorkGroup(user.main_group)); 
      return; 
    }
    next();
  };
  
  export const configuratorGuard = function({ user }: any, res: Response, next: NextFunction) {
    console.log(user);
    if (!user) return res.sendStatus(UNAUTHORIZED);
    if (!intersection(user.permissions, ALLOWED_GROUPS.CONFIGURATIONS).length) { res.status(UNAUTHORIZED).send('Access denied for your workgroup: ' + isWorkGroup(user.main_group)); return; }
    next();
  };
};
