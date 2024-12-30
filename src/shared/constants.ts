import cors, { CorsOptions } from 'cors';
import { OMPServerControl } from '@shared/omp/omp-server.control';

import { OnlineMetric } from '../Metrics';
import { ErrorCode } from '@enums/error.codes.enum';

export const paramMissingError = 'One or more of the required parameters was missing.';
export const noAvatarImageUrl: string = 'https://www.gta-liberty.ru/styles/eles/theme/images/no_avatar.gif';

export const CommonErrors = {
  [ErrorCode.UNSUPPORTED_PLATFORM]: 'Platform is not supported',
  [ErrorCode.PARAM_MISSING]: 'One or more of the required parameters was missing.',
  [ErrorCode.CHILD_PROCESS_ALREADY_SERVED]: 'One of the requested child processes already served.',
  [ErrorCode.CHILD_PROCESS_IS_NOT_EXISTS]: 'Child process is not exists.',
  [ErrorCode.CHILD_PROCESS_CANT_SERVE]: 'Child process cant serve.',
  [ErrorCode.ACCES_DENIED_FOR_WORKGROUP]: 'Access denied for your workgroup',
} as const;

export const onlineMetric: OnlineMetric = new OnlineMetric();
export const omp = new OMPServerControl();

const whitelist: string[] = JSON.parse(process.env.CORS_WL!);

const checkCorsOrigin = function (origin: string, callback: (error: Error | null, next?: boolean) => void) {
  if (whitelist.indexOf(origin) !== -1 || !origin) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
};

export const CORSoptions = {
  credentials: true,
  methods: 'GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE',
  origin: checkCorsOrigin,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

export const socketCORS = {
  origin: checkCorsOrigin,
  methods: ['GET', 'POST'],
  credentials: true
}

export const corsOpt = cors(CORSoptions as CorsOptions);

