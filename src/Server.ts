import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import { join } from 'path';

import express, { NextFunction, Request, Response, Express } from 'express';
import passport from 'passport';
import { Strategy as JWTStrategy, ExtractJwt, StrategyOptions as JWTStrategyOptions } from 'passport-jwt';
import session from 'express-session';
import MongoStore from 'connect-mongo';

import { connect, ConnectOptions } from 'mongoose';
import { rmOldBackups, SQLQueries, tailOnlineStats, MSQLPool } from '@shared/constants';

import BaseRouter from './routes';

import StatusCodes from 'http-status-codes';
import 'express-async-errors';

import { Logger } from '@shared/Logger';
import { watch, isWorkGroup } from '@shared/functions';
import { IDBUser, IJwtPayload } from '@interfaces/user';

const app: Express = express();

const { BAD_REQUEST, NOT_FOUND } = StatusCodes;
const { GET_USER_BY_NAME } = SQLQueries;

const useCors = cors();

/**
 * Express middlewares
 */
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// app.options('*', useCors);

app.set('secret', process.env.ACCESS_TOKEN_SECRET);

// MongoDB connection
const clientPromise = connect(process.env.MONGO!, { useNewUrlParser: true, useUnifiedTopology: true } as ConnectOptions).then(m => m.connection.getClient());

export const sessionMiddleware = session({
  secret: app.get('secret'),
  resave: true,
  saveUninitialized: true,
  cookie: { 
    maxAge: 525600*60000, 
    secure: true, 
    sameSite: 'none' 
  },
  store: MongoStore.create({ clientPromise }),
})

app.use(sessionMiddleware);

const jwtStrategyOptions: JWTStrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: app.get('secret'),
};

const jwtStrategy = new JWTStrategy(jwtStrategyOptions, (jwtPayload: IJwtPayload, done) => {
  MSQLPool.promise()
          .query(GET_USER_BY_NAME, [jwtPayload.username])
          .then(([rows]: any[]): void => {
            const [user]: [IDBUser] = rows;
            if (!user) 
              return done(null, false, { message: 'User not found' });

            if (!isWorkGroup(user.main_group)) 
              return done(null, false, { message: 'Not in workgroup' });
            
            const { user_id, username, user_email, main_group, secondary_group, user_avatar } = user;
            
            return done(null, { user_id, username, user_email, main_group, secondary_group, user_avatar });
          })
          .catch((err: any): void => {
            return done(err, false);
          });
});

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(jwtPayload: IJwtPayload, done) {
  MSQLPool.promise()
          .query(GET_USER_BY_NAME, [jwtPayload.username])
          .then(([rows]: any[]) => {
            const [user]: [IDBUser] = rows;
            if (!user) return done(null, false);
            done(null, user);
          })
          .catch((err: any): void =>{
            Logger.log('error', err);
            return done(err, false);
          })
});

app.use(passport.initialize());
app.use(passport.session());

passport.use('jwt', jwtStrategy);

// Show routes called in console during development
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Security
if (process.env.NODE_ENV === 'production') {
    app.use(helmet());
}

console.log(join(__dirname, 'public'));

// Add APIs
app.use('/.well-known/acme-challenge', express.static(join(__dirname, '../static/.well-known/acme-challenge')));
app.use('/v2', BaseRouter);

// 404
app.get('*', (_req: Request, res: Response) => {
  res.sendStatus(NOT_FOUND);
});

// Print API errors
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    Logger.log('error', 
      'SERVER', err, '\n',
      'ORIGINAL_URL', req.originalUrl, '\n',
      'PROTOCOL', req.protocol, '\n',
      'XHR', req.xhr,
    );
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
