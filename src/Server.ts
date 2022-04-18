import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import cors from 'cors';
import jwte from 'express-jwt';
import helmet from 'helmet';
import { connect } from 'mongoose';
import { join } from 'path';
import { rmOldBackups, tailOnlineStats } from '@shared/constants'
// import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
// import passport from 'passport';

import express, { NextFunction, Request, Response } from 'express';
import StatusCodes from 'http-status-codes';
import 'express-async-errors';

import BaseRouter from './routes';
import { Logger } from '@shared/Logger';
import { watch } from '@shared/functions';

const app = express();

const { BAD_REQUEST } = StatusCodes;

const useCors = cors();

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.options('*', useCors);
app.set('secret', process.env.ACCESS_TOKEN_SECRET);
app.use('/v2', jwte({
  secret: app.get('secret'),
  algorithms: ['HS256'],
  credentialsRequired: false,
  getToken: (req: any) => {
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        return req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
      return req.query.token;
    }
    return null;
  }
}));

// passport

// passport.use(new JwtStrategy({}, function (jwt_payload, done) {
//
// }))

// MongoDB connection
connect(process.env.MONGO!);

// Show routes called in console during development
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Security
if (process.env.NODE_ENV === 'production') {
    app.use(helmet());
}

// Add APIs
app.use('/v2', BaseRouter);
app.use('/.well-known/acme-challenge', express.static(join(__dirname, '.well-known/acme-challenge')));


// Print API errors
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    Logger.log('error', 'SERVER', err);
    console.error(err);
    return res.status(BAD_REQUEST).json({
        error: 'ERR: ' + err.message,
    });
});

// Crontasks
if (process.env.NODE_ENV === 'production') {
  rmOldBackups.start();
  tailOnlineStats.start();
};

// Watcher
watch();

// Export express instance
export default app;
