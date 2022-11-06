import { Request, Response, NextFunction } from 'express';
import { isWorkGroup } from '@shared/functions';
import StatusCodes from 'http-status-codes';
import Workgroup from '@enums/workgroup.enum';

interface IUser extends Express.User {
  main_group: Workgroup;
  secondary_group: Workgroup;
}

const { DEV, MAPPER, CFR, BACKUPER } = Workgroup;
const { UNAUTHORIZED } = StatusCodes;

export namespace Guards {
  export const rejectUnauthorized = function (req: Request, res: Response, next: NextFunction) {
      if (!req.user) return res.sendStatus(UNAUTHORIZED);
      next();
  };
  
  export const backuperGuard = function(req: any, res: Response, next: NextFunction) {
    if (!req.user) return res.sendStatus(UNAUTHORIZED);
    if (req.user.main_group !== DEV && req.user.secondary_group !== BACKUPER) { res.status(UNAUTHORIZED).send('Access denied for your workgroup: ' + isWorkGroup(req.user.main_group)); return; }
    next();
  };
  
  export const developerGuard = function(req: any, res: Response, next: NextFunction) {
    if (!req.user) return res.sendStatus(UNAUTHORIZED);
    if (req.user.main_group !== DEV) { res.status(UNAUTHORIZED).send('Access denied for your workgroup: ' + isWorkGroup(req.user.main_group)); return; }
    next();
  };
  
  export const mapperGuard = function(req: any, res: Response, next: NextFunction) {
    if (!req.user) return res.sendStatus(UNAUTHORIZED);
    if (req.user.main_group !== DEV && req.user.secondary_group !== MAPPER && req.user.secondary_group !== BACKUPER) { 
      res.status(UNAUTHORIZED).send('Access denied for your workgroup: ' + isWorkGroup(req.user.main_group)); 
      return; 
    }
    next();
  };
  
  export const configuratorGuard = function(req: any, res: Response, next: NextFunction) {
    if (!req.user) return res.sendStatus(UNAUTHORIZED);
    if (req.user.main_group !== DEV && req.user.secondary_group !== CFR && req.user.secondary_group !== BACKUPER) { res.status(UNAUTHORIZED).send('Access denied for your workgroup: ' + isWorkGroup(req.user.main_group)); return; }
    next();
  };
};
