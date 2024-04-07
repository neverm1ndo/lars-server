import { Request, Response, NextFunction, Handler } from 'express';
import { isWorkGroup } from '@shared/security';
import StatusCodes from 'http-status-codes';
import Workgroup from '@enums/workgroup.enum';
import { intersection } from 'lodash';
import { CommonErrors } from '@shared/constants';
import { ErrorCode } from '@enums/error.codes.enum';

interface IUser extends Express.User {
  main_group: Workgroup;
  permissions: Workgroup[];
}

interface IRequest extends Express.Request {
  user?: IUser;
}

const { DEV, MAPPER, CFR, BACKUPER } = Workgroup;
const { UNAUTHORIZED } = StatusCodes;

const ALLOWED_GROUPS = {
  BACKUPS: [DEV, BACKUPER],
  MAPS: [DEV, MAPPER],
  CONFIGURATIONS: [DEV, CFR]
};

const ACCESS_DENIED_ERROR = CommonErrors[ErrorCode.ACCES_DENIED_FOR_WORKGROUP];


export const rejectUnauthorized: Handler = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.sendStatus(UNAUTHORIZED);
    next();
};

export const backuperGuard = ({ user }: IRequest, res: Response, next: NextFunction) => {
  if (!user) return res.sendStatus(UNAUTHORIZED);

  if (!intersection(user.permissions, ALLOWED_GROUPS.BACKUPS).length) {
    return void res.status(UNAUTHORIZED)
                   .send(`${ACCESS_DENIED_ERROR}: ${isWorkGroup(user.main_group)}`);
  }
  next();
};

export const developerGuard = ({ user }: IRequest, res: Response, next: NextFunction) => {
  if (!user) return res.sendStatus(UNAUTHORIZED);

  if (user.main_group !== DEV) {
    return void res.status(UNAUTHORIZED)
       .send(`${ACCESS_DENIED_ERROR}: ${isWorkGroup(user.main_group)}`);
    }
  next();
};

export const mapperGuard = ({ user }: IRequest, res: Response, next: NextFunction) => {
  if (!user) return res.sendStatus(UNAUTHORIZED);

  if (!intersection(user.permissions, ALLOWED_GROUPS.MAPS).length) { 
    return void res.status(UNAUTHORIZED)
      .send(`${ACCESS_DENIED_ERROR}: ${isWorkGroup(user.main_group)}`);  
  }
  next();
};

export const configuratorGuard = function({ user }: IRequest, res: Response, next: NextFunction) {
  if (!user) return res.sendStatus(UNAUTHORIZED);

  if (!intersection(user.permissions, ALLOWED_GROUPS.CONFIGURATIONS).length) { 
    return void res.status(UNAUTHORIZED)
      .send(`${ACCESS_DENIED_ERROR}: ${isWorkGroup(user.main_group)}`);
  }
  next();
};